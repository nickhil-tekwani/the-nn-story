import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getClaimedGroup, getRsvp } from "@/lib/guest";
import { logEvent } from "@/lib/logEvent";
import { saveRsvpSubmission } from "@/lib/rsvpSubmission";

export async function GET() {
  const session = await auth();
  const group = await getClaimedGroup(session?.user?.email);
  if (!group) {
    return NextResponse.json(
      { error: "You haven't verified an invite yet." },
      { status: 403 },
    );
  }
  const rsvp = await getRsvp(group.id);
  return NextResponse.json({
    group: { maxPartySize: group.maxPartySize },
    rsvp,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const group = await getClaimedGroup(session?.user?.email);
  if (!group) {
    return NextResponse.json(
      { error: "You haven't verified an invite yet." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const result = await saveRsvpSubmission(group, body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await logEvent("rsvp_submitted", {
    email: session?.user?.email,
    groupId: group.id,
    properties: {
      schemaVersion: 2,
      source: "guest",
      ...result.analytics,
    },
  });

  return NextResponse.json({ ok: true });
}
