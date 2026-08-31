import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { analyticsReports, db } from "@/db";
import { validateAnalyticsQuery } from "@/lib/analytics/engine";
import type { SavedAnalyticsConfig } from "@/lib/analytics/types";
import { requireAdminEmail } from "@/lib/requireAdmin";

const VISUALIZATIONS = new Set(["kpi", "table", "bar", "stacked_bar", "line", "area", "donut", "funnel"]);

function validateConfig(value: unknown): SavedAnalyticsConfig {
  if (!value || typeof value !== "object") throw new Error("A report configuration is required.");
  const raw = value as Partial<SavedAnalyticsConfig>;
  if (raw.version !== 1 || !VISUALIZATIONS.has(String(raw.visualization))) throw new Error("Invalid report configuration.");
  return { version: 1, visualization: raw.visualization!, query: validateAnalyticsQuery(raw.query) };
}

export async function GET() {
  if (!(await requireAdminEmail())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const reports = await db.select().from(analyticsReports).orderBy(desc(analyticsReports.updatedAt));
  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim() || null;
    if (!name || name.length > 100) return NextResponse.json({ error: "Report name must be 1–100 characters." }, { status: 400 });
    const config = validateConfig(body?.queryConfig);
    const [report] = await db.insert(analyticsReports).values({
      name,
      description,
      queryConfig: config as unknown as Record<string, unknown>,
      createdBy: email,
      updatedBy: email,
    }).returning();
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid report." }, { status: 400 });
  }
}
