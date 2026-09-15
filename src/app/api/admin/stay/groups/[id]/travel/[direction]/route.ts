import { NextResponse } from "next/server";
import { getStayData, getStayEligibilityForGroup, saveTravelLeg, validateTravelLegInput, type TravelLegValues } from "@/lib/stay";
import { logEvent } from "@/lib/logEvent";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; direction: string }> }) {
  const email = await requireAdminEmail(); if (!email) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id: rawId, direction: rawDirection } = await params; const id = Number(rawId);
  if (rawDirection !== "arrival" && rawDirection !== "departure") return NextResponse.json({ error: "Unknown travel direction." }, { status: 404 });
  const direction: TravelLegValues["direction"] = rawDirection;
  const eligibility = Number.isInteger(id) ? await getStayEligibilityForGroup(id) : null;
  if (!eligibility) return NextResponse.json({ error: "Group is not currently eligible." }, { status: 400 });
  const input = validateTravelLegInput(direction, await req.json().catch(() => null)); if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const result = await saveTravelLeg(id, input.value); if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logEvent("travel_leg_saved", { email, groupId: id, properties: { schemaVersion: 1, source: "admin", action: result.action, direction, transportMode: input.value.mode } });
  return NextResponse.json(await getStayData(eligibility));
}
