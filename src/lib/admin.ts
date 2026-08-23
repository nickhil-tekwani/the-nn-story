const BUILT_IN_ADMIN_EMAILS = ["nikita.kesav@gmail.com"];

/**
 * Admin access is controlled by the built-in allowlist and the ADMIN_EMAILS
 * env var, which accepts additional comma-separated Google emails.
 */
export function adminEmails(): string[] {
  const configuredEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...BUILT_IN_ADMIN_EMAILS, ...configuredEmails])];
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}
