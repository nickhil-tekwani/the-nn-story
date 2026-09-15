import { NextResponse } from "next/server";
import { createHotel, getStayEligibilityForGroup } from "@/lib/stay";
import { logEvent } from "@/lib/logEvent";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdminEmail(); if (!email) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id: rawId } = await params; const id = Number(rawId); const eligibility = Number.isInteger(id) ? await getStayEligibilityForGroup(id) : null;
  if (!eligibility) return NextResponse.json({ error: "Group is not currently eligible." }, { status: 400 });
  const result = await createHotel(id, await req.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.created) await logEvent("hotel_catalog_entry_created", { email, groupId: id, properties: { schemaVersion: 1, source: "admin", hotelId: result.hotel.id } });
  return NextResponse.json({ hotel: result.hotel, created: result.created });
}
