import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, events, groupLodgingPlans, hotels } from "@/db";
import { logEvent } from "@/lib/logEvent";
import { requireAdminEmail } from "@/lib/requireAdmin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireAdminEmail();
  if (!email) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { id: rawId } = await params; const id = Number(rawId);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid hotel." }, { status: 400 });
  const body = await req.json().catch(() => null);
  if (body?.action === "merge") {
    const mergeIntoId = Number(body.mergeIntoId);
    if (!Number.isInteger(mergeIntoId) || mergeIntoId === id) return NextResponse.json({ error: "Choose a different destination hotel." }, { status: 400 });
    const [target] = await db.select({ id: hotels.id }).from(hotels).where(eq(hotels.id, mergeIntoId)).limit(1);
    if (!target) return NextResponse.json({ error: "Destination hotel not found." }, { status: 404 });
    const mergedAt = new Date();
    await db.batch([
      db.update(groupLodgingPlans).set({ hotelId: mergeIntoId, updatedAt: mergedAt }).where(eq(groupLodgingPlans.hotelId, id)),
      db.update(hotels).set({ isArchived: true, updatedAt: mergedAt }).where(eq(hotels.id, id)),
      db.insert(events).values({
        event: "hotel_catalog_entry_merged",
        email,
        properties: { schemaVersion: 1, source: "admin", hotelId: id, mergeIntoId },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }
  if (typeof body?.isArchived !== "boolean") return NextResponse.json({ error: "Choose whether to archive or restore the hotel." }, { status: 400 });
  const [updated] = await db.update(hotels).set({ isArchived: body.isArchived, updatedAt: new Date() }).where(eq(hotels.id, id)).returning({ id: hotels.id });
  if (!updated) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
  await logEvent(body.isArchived ? "hotel_catalog_entry_archived" : "hotel_catalog_entry_restored", { email, properties: { schemaVersion: 1, source: "admin", hotelId: id } });
  return NextResponse.json({ ok: true });
}
