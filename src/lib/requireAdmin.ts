import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";

export async function requireAdminEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  return isAdminEmail(email) ? email : null;
}
