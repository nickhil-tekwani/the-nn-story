import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groupMembers, groups, groupPhones } from "@/db";
import { normalizePhone } from "@/lib/phone";
import { logEvent } from "@/lib/logEvent";

/**
 * Claim an invite by phone number. Any phone number on a group's list can claim
 * membership for a Google account until the group's party-size limit is reached.
 * A numbered slot plus unique indexes make both the group limit and the global
 * one-account/one-group rule safe under concurrent requests.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Existing membership is idempotent, regardless of the phone submitted.
  const [already] = await db
    .select({
      groupId: groupMembers.groupId,
      phone: groupMembers.phone,
      slot: groupMembers.slot,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .where(eq(groupMembers.email, email))
    .limit(1);
  if (already) {
    // Repair compatibility metadata if a previous first-claim request inserted
    // membership but was interrupted before its follow-up update.
    if (already.slot === 1) {
      await db
        .update(groups)
        .set({
          claimedByEmail: email,
          claimedByPhone: already.phone || null,
          claimedAt: already.joinedAt,
        })
        .where(eq(groups.id, already.groupId));
    }
    return NextResponse.json({ ok: true, joinedExistingGroup: false });
  }

  const body = await req.json().catch(() => null);
  const rawPhone: string = body?.phone ?? "";
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "Please enter a valid US (+1) or India (+91) phone number." },
      { status: 400 },
    );
  }

  // Find which group this number belongs to.
  const [match] = await db
    .select({
      groupId: groupPhones.groupId,
      maxPartySize: groups.maxPartySize,
      hasPrimaryClaim: sql<boolean>`${groups.claimedByEmail} is not null`,
    })
    .from(groupPhones)
    .innerJoin(groups, eq(groupPhones.groupId, groups.id))
    .where(eq(groupPhones.phone, phone))
    .limit(1);

  if (!match) {
    return NextResponse.json(
      {
        error:
          "We couldn't find that number on the guest list. Double-check it, or reach out to the hosts.",
      },
      { status: 404 },
    );
  }

  type InsertedMember = { id: number; slot: number };
  let inserted: InsertedMember | undefined;

  // Concurrent claimers can initially select the same free slot. The unique
  // group/slot index lets exactly one win; a loser retries and takes the next
  // free slot. The unique email index independently prevents cross-group reuse.
  for (let attempt = 0; attempt <= match.maxPartySize; attempt++) {
    const result = await db.execute<InsertedMember>(sql`
      with group_capacity as (
        select ${groups.maxPartySize} as max_members
        from ${groups}
        where ${groups.id} = ${match.groupId}
      ), available_slot as (
        select candidate as slot
        from generate_series(1, (select max_members from group_capacity)) as slots(candidate)
        where (
          select count(*) from ${groupMembers}
          where ${groupMembers.groupId} = ${match.groupId}
        ) < (select max_members from group_capacity)
          and not exists (
          select 1 from ${groupMembers}
          where ${groupMembers.groupId} = ${match.groupId}
            and ${groupMembers.slot} = candidate
        )
        order by candidate
        limit 1
      )
      insert into ${groupMembers} (group_id, email, phone, slot)
      select ${match.groupId}, ${email}, ${phone}, slot
      from available_slot
      on conflict do nothing
      returning id, slot
    `);
    inserted = result.rows[0];
    if (inserted) break;

    const [membership] = await db
      .select({
        groupId: groupMembers.groupId,
        phone: groupMembers.phone,
        slot: groupMembers.slot,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .where(eq(groupMembers.email, email))
      .limit(1);
    if (membership) {
      if (membership.groupId === match.groupId) {
        if (membership.slot === 1) {
          await db
            .update(groups)
            .set({
              claimedByEmail: email,
              claimedByPhone: membership.phone || null,
              claimedAt: membership.joinedAt,
            })
            .where(eq(groups.id, membership.groupId));
        }
        return NextResponse.json({ ok: true, joinedExistingGroup: false });
      }
      return NextResponse.json(
        { error: "This Google account is already connected to another invitation." },
        { status: 409 },
      );
    }
  }

  if (!inserted) {
    return NextResponse.json(
      { error: "All Google account spots for this invitation are already connected." },
      { status: 409 },
    );
  }

  // Preserve the original claimant fields for rollback compatibility. Only
  // slot 1 can initialize them, so a concurrent secondary member cannot win.
  if (inserted.slot === 1) {
    await db
      .update(groups)
      .set({ claimedByEmail: email, claimedByPhone: phone, claimedAt: new Date() })
      .where(eq(groups.id, match.groupId));
  }

  const joinedExistingGroup = match.hasPrimaryClaim || inserted.slot > 1;
  await logEvent("invite_claimed", {
    email,
    groupId: match.groupId,
    properties: { joinedExistingGroup },
  });
  return NextResponse.json({ ok: true, joinedExistingGroup });
}
