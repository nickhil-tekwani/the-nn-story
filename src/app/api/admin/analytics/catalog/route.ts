import { NextResponse } from "next/server";
import { publicCatalog } from "@/lib/analytics/catalog";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function GET() {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return NextResponse.json(publicCatalog());
}
