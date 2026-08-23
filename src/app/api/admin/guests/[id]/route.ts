import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groupMembers, groups, rsvps } from "@/db";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}

async function parseId(params: Promise<{ id: string }>) {
  const { id } = await params;
  const groupId = Number(id);
  return Number.isInteger(groupId) && groupId >= 1 ? groupId : null;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const groupId = await parseId(params);
  if (!groupId) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  await db.delete(groups).where(eq(groups.id, groupId));
  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const groupId = await parseId(params);
  if (!groupId) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  const body = await req.json().catch(() => null);
  const maxPartySize = Number(body?.maxPartySize);
  if (!Number.isInteger(maxPartySize) || maxPartySize < 1) {
    return NextResponse.json(
      { error: "Max party size must be a whole number of at least 1." },
      { status: 400 },
    );
  }

  const [group] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const [rsvp] = await db
    .select({ partySize: rsvps.partySize })
    .from(rsvps)
    .where(eq(rsvps.groupId, groupId))
    .limit(1);
  if (rsvp && maxPartySize < rsvp.partySize) {
    return NextResponse.json(
      { error: `Max party size cannot be lower than the existing RSVP of ${rsvp.partySize}.` },
      { status: 400 },
    );
  }

  const [{ memberCount }] = await db
    .select({ memberCount: sql<number>`count(*)::int` })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  if (maxPartySize < memberCount) {
    return NextResponse.json(
      { error: `Max party size cannot be lower than the ${memberCount} connected Google accounts.` },
      { status: 400 },
    );
  }

  await db
    .update(groups)
    .set({ maxPartySize })
    .where(eq(groups.id, groupId));

  return NextResponse.json({ ok: true, maxPartySize });
}
