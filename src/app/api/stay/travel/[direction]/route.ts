import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logEvent";
import { getStayData, getStayEligibility, saveTravelLeg, validateTravelLegInput, type TravelLegValues } from "@/lib/stay";

export async function PATCH(req: Request, { params }: { params: Promise<{ direction: string }> }) {
  const { direction: rawDirection } = await params;
  if (rawDirection !== "arrival" && rawDirection !== "departure") return NextResponse.json({ error: "Unknown travel direction." }, { status: 404 });
  const direction: TravelLegValues["direction"] = rawDirection;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const eligibility = await getStayEligibility(email);
  if (!eligibility) return NextResponse.json({ error: "This page is only available to eligible out-of-town guests." }, { status: 403 });
  const input = validateTravelLegInput(direction, await req.json().catch(() => null));
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const result = await saveTravelLeg(eligibility.groupId, input.value);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logEvent("travel_leg_saved", {
    email, groupId: eligibility.groupId,
    properties: { schemaVersion: 1, source: "guest", action: result.action, direction, transportMode: input.value.mode },
  });
  return NextResponse.json(await getStayData(eligibility), { headers: { "Cache-Control": "private, no-store" } });
}
