import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStayData, getStayEligibility } from "@/lib/stay";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const eligibility = await getStayEligibility(session.user.email);
  if (!eligibility) return NextResponse.json({ error: "This page is only available to eligible out-of-town guests." }, { status: 403 });
  return NextResponse.json(await getStayData(eligibility), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
