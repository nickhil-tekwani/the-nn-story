import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groups } from "@/db";
import { isAdminEmail } from "@/lib/admin";
import { logEvent } from "@/lib/logEvent";
import { saveRsvpSubmission } from "@/lib/rsvpSubmission";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const adminEmail = session?.user?.email?.toLowerCase();
  if (!isAdminEmail(adminEmail)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId) || groupId < 1) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const result = await saveRsvpSubmission(group, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logEvent("admin_rsvp_updated", {
    email: adminEmail,
    groupId,
    properties: {
      schemaVersion: 2,
      source: "admin",
      ...result.analytics,
      guestVerified: Boolean(group.claimedByEmail),
    },
  });

  return NextResponse.json({ ok: true });
}
