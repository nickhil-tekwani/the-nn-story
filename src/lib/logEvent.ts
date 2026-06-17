import { db, events } from "@/db";

export async function logEvent(
  event: string,
  opts: { email?: string | null; groupId?: number | null; properties?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(events).values({
      event,
      email: opts.email ?? null,
      groupId: opts.groupId ?? null,
      properties: opts.properties ?? null,
    });
  } catch {
    // Never let audit logging break the actual request.
  }
}
