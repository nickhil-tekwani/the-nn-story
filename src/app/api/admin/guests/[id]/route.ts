import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groups } from "@/db";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId) || groupId < 1) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  await db.delete(groups).where(eq(groups.id, groupId));
  return NextResponse.json({ ok: true });
}
