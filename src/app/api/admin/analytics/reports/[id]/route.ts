import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { analyticsReports, db } from "@/db";
import { validateAnalyticsQuery } from "@/lib/analytics/engine";
import type { SavedAnalyticsConfig } from "@/lib/analytics/types";
import { requireAdminEmail } from "@/lib/requireAdmin";

const VISUALIZATIONS = new Set(["kpi", "table", "bar", "stacked_bar", "line", "area", "donut", "funnel"]);

function idFrom(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateConfig(value: unknown): SavedAnalyticsConfig {
  if (!value || typeof value !== "object") throw new Error("A report configuration is required.");
  const raw = value as Partial<SavedAnalyticsConfig>;
  if (raw.version !== 1 || !VISUALIZATIONS.has(String(raw.visualization))) throw new Error("Invalid report configuration.");
  return { version: 1, visualization: raw.visualization!, query: validateAnalyticsQuery(raw.query) };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const id = idFrom((await params).id);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  try {
    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    if (!name || name.length > 100) return NextResponse.json({ error: "Report name must be 1–100 characters." }, { status: 400 });
    const config = validateConfig(body?.queryConfig);
    const [report] = await db.update(analyticsReports).set({
      name,
      description: String(body?.description ?? "").trim() || null,
      queryConfig: config as unknown as Record<string, unknown>,
      updatedBy: email,
      updatedAt: new Date(),
    }).where(eq(analyticsReports.id, id)).returning();
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid report." }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminEmail())) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const id = idFrom((await params).id);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const [deleted] = await db.delete(analyticsReports).where(eq(analyticsReports.id, id)).returning({ id: analyticsReports.id });
  if (!deleted) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
