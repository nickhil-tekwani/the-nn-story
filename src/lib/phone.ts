/**
 * Normalize a phone number to a canonical form for matching.
 * Strips everything except digits. For US numbers it reduces to the 10-digit
 * form (dropping a leading "1" country code) so that "+1 (513) 555-0142",
 * "513-555-0142", and "15135550142" all match the same stored value.
 */
export function normalizePhone(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

/** True if the normalized number looks like a plausible US 10-digit number. */
export function isValidUsPhone(input: string): boolean {
  return normalizePhone(input).length === 10;
}

/** Pretty-print a normalized 10-digit number as (513) 555-0142. */
export function formatPhone(normalized: string): string {
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return normalized;
}
