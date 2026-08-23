import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, groupMembers, groups } from "@/db";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

/** Remove one connected Google account without changing the group's RSVP. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const values = await params;
  const groupId = parsePositiveInteger(values.id);
  const memberId = parsePositiveInteger(values.memberId);
  if (!groupId || !memberId) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  // Delete membership and, when necessary, promote the oldest remaining member
  // in one statement. The RSVP table is intentionally absent from this query.
  const result = await db.execute<{ id: number }>(sql`
    with deleted_member as (
      delete from ${groupMembers}
      where ${groupMembers.id} = ${memberId}
        and ${groupMembers.groupId} = ${groupId}
      returning id, email
    ), next_member as (
      select email, phone, joined_at
      from ${groupMembers}
      where ${groupMembers.groupId} = ${groupId}
        and ${groupMembers.id} <> ${memberId}
      order by ${groupMembers.joinedAt}, ${groupMembers.id}
      limit 1
    ), updated_group as (
      update ${groups}
      set claimed_by_email = case
            when lower(${groups.claimedByEmail}) = (select email from deleted_member)
              then (select email from next_member)
            else ${groups.claimedByEmail}
          end,
          claimed_by_phone = case
            when lower(${groups.claimedByEmail}) = (select email from deleted_member)
              then nullif((select phone from next_member), '')
            else ${groups.claimedByPhone}
          end,
          claimed_at = case
            when lower(${groups.claimedByEmail}) = (select email from deleted_member)
              then (select joined_at from next_member)
            else ${groups.claimedAt}
          end
      where ${groups.id} = ${groupId}
        and exists (select 1 from deleted_member)
      returning ${groups.id}
    )
    select id from deleted_member
  `);

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Connected account not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
