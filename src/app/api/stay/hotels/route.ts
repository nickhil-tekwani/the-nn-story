import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logEvent } from "@/lib/logEvent";
import { createHotel, getStayEligibility } from "@/lib/stay";

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const eligibility = await getStayEligibility(email);
  if (!eligibility) return NextResponse.json({ error: "This page is only available to eligible out-of-town guests." }, { status: 403 });
  const result = await createHotel(eligibility.groupId, await req.json().catch(() => null));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.created) await logEvent("hotel_catalog_entry_created", {
    email, groupId: eligibility.groupId,
    properties: { schemaVersion: 1, source: "guest", hotelId: result.hotel.id },
  });
  return NextResponse.json({ hotel: result.hotel, created: result.created });
}
