/**
 * Phone handling. The canonical, normalized form stored in the DB and used for
 * matching is E.164: a "+", the country dial code, then the national digits,
 * with no spaces or punctuation — e.g. "+15135550142", "+919876543210".
 *
 * Including the dial code is what lets a US (+1) and an India (+91) number
 * coexist without colliding.
 */

export type CountryCode = "US" | "IN";

export interface Country {
  code: CountryCode;
  dial: string; // e.g. "+1"
  label: string; // shown in the dropdown
  /** Exact number of national digits required (after the dial code). */
  nationalDigits: number;
}

/** Supported countries. US is the default (listed first). */
export const COUNTRIES: Country[] = [
  { code: "US", dial: "+1", label: "🇺🇸 +1", nationalDigits: 10 },
  { code: "IN", dial: "+91", label: "🇮🇳 +91", nationalDigits: 10 },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0];

function countryByDial(dial: string): Country | undefined {
  return COUNTRIES.find((c) => c.dial === dial);
}

/** True if `digits` (digits only) is a valid national number for `dial`. */
export function isValidNationalNumber(dial: string, digits: string): boolean {
  const country = countryByDial(dial);
  if (!country) return false;
  return /^\d+$/.test(digits) && digits.length === country.nationalDigits;
}

/**
 * Build the canonical E.164 string from an explicit dial code + national digits.
 * Returns null if the national part doesn't match the country's expected length.
 * This is the path used by the front-end (dropdown + digit-only input).
 */
export function toE164(dial: string, nationalDigits: string): string | null {
  const digits = (nationalDigits || "").replace(/\D/g, "");
  if (!isValidNationalNumber(dial, digits)) return null;
  return `${dial}${digits}`;
}

/**
 * Normalize a free-form phone string to canonical E.164, or null if it isn't a
 * valid US/India number. This is the tolerant path used for admin CSV uploads,
 * where the value may be written many ways:
 *   "+1 (513) 555-0142", "513-555-0142", "15135550142"  -> +15135550142
 *   "+91 98765 43210",   "919876543210"                  -> +919876543210
 * A bare 10-digit number with no country code defaults to US (+1).
 */
export function normalizePhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");

  // Explicit India: starts with 91 and has 12 digits total (91 + 10 national).
  if (digits.length === 12 && digits.startsWith("91")) {
    return toE164("+91", digits.slice(2));
  }
  // Explicit US with country code: 1 + 10 national digits.
  if (digits.length === 11 && digits.startsWith("1")) {
    return toE164("+1", digits.slice(1));
  }
  // Bare national number -> default to US.
  if (digits.length === 10) {
    return toE164("+1", digits);
  }
  return null;
}

/** True if a free-form string normalizes to a valid US/India number. */
export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Pretty-print a canonical E.164 number for display. */
export function formatPhone(e164: string): string {
  if (e164.startsWith("+1") && e164.length === 12) {
    const n = e164.slice(2);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (e164.startsWith("+91") && e164.length === 13) {
    const n = e164.slice(3);
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  return e164;
}
