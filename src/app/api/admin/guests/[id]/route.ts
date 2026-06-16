import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groups, rsvps } from "@/db";
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

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const groupId = await parseId(params);
  if (!groupId) return NextResponse.json({ error: "Invalid id." }, { status: 400 });

  await db.delete(rsvps).where(eq(rsvps.groupId, groupId));
  await db
    .update(groups)
    .set({ claimedByEmail: null, claimedByPhone: null, claimedAt: null })
    .where(eq(groups.id, groupId));
  return NextResponse.json({ ok: true });
}
