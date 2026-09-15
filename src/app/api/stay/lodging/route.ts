import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logEvent";
import { getStayData, getStayEligibility, saveLodging, validateLodgingInput } from "@/lib/stay";

export async function PATCH(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const eligibility = await getStayEligibility(email);
  if (!eligibility) return NextResponse.json({ error: "This page is only available to eligible out-of-town guests." }, { status: 403 });
  const input = validateLodgingInput(await req.json().catch(() => null));
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const result = await saveLodging(eligibility.groupId, input.value);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logEvent("lodging_plan_saved", {
    email, groupId: eligibility.groupId,
    properties: { schemaVersion: 1, source: "guest", action: result.action, lodgingType: input.value.lodgingType, hotelId: input.value.hotelId },
  });
  return NextResponse.json(await getStayData(eligibility), { headers: { "Cache-Control": "private, no-store" } });
}
