import { NextResponse } from "next/server";
import { loadAnalyticsRows } from "@/lib/analytics/data";
import { AnalyticsQueryError, runAnalyticsQuery, validateAnalyticsQuery } from "@/lib/analytics/engine";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function POST(req: Request) {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    const query = validateAnalyticsQuery(await req.json().catch(() => null));
    const rows = await loadAnalyticsRows(query.dataset);
    return NextResponse.json(runAnalyticsQuery(rows, query));
  } catch (error) {
    if (error instanceof AnalyticsQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
