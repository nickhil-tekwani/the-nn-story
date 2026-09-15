import { NextResponse } from "next/server";
import { getAdminStayRows } from "@/lib/stay";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function GET() {
  if (!(await requireAdminEmail())) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  return NextResponse.json(await getAdminStayRows(), { headers: { "Cache-Control": "private, no-store" } });
}
