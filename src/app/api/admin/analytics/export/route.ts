import { NextResponse } from "next/server";
import { loadAnalyticsRows } from "@/lib/analytics/data";
import { AnalyticsQueryError, runAnalyticsQuery, validateAnalyticsQuery } from "@/lib/analytics/engine";
import { requireAdminEmail } from "@/lib/requireAdmin";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function POST(req: Request) {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  try {
    const input = await req.json().catch(() => null);
    const query = validateAnalyticsQuery({ ...(input ?? {}), limit: 500 });
    const rows = await loadAnalyticsRows(query.dataset);
    const result = runAnalyticsQuery(rows, query);
    const csv = [
      result.columns.map((column) => csvCell(column.label)).join(","),
      ...result.rows.map((row) => result.columns.map((column) => csvCell(row[column.key])).join(",")),
    ].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof AnalyticsQueryError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
