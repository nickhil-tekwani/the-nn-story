import { NextResponse } from "next/server";
import { getStayData, getStayEligibilityForGroup, saveLodging, validateLodgingInput } from "@/lib/stay";
import { logEvent } from "@/lib/logEvent";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdminEmail(); if (!email) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id: rawId } = await params; const id = Number(rawId); const eligibility = Number.isInteger(id) ? await getStayEligibilityForGroup(id) : null;
  if (!eligibility) return NextResponse.json({ error: "Group is not currently eligible." }, { status: 400 });
  const input = validateLodgingInput(await req.json().catch(() => null)); if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  const result = await saveLodging(id, input.value); if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await logEvent("lodging_plan_saved", { email, groupId: id, properties: { schemaVersion: 1, source: "admin", action: result.action, lodgingType: input.value.lodgingType, hotelId: input.value.hotelId } });
  return NextResponse.json(await getStayData(eligibility));
}
