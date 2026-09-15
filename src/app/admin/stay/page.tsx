import Link from "next/link";
import { auth } from "@/auth";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import AdminStayPortal from "@/components/AdminStayPortal";

export default async function AdminStayPage() {
  const session = await auth();
  if (!session) return <main className="admin-auth-state"><h1>Stay Plans</h1><p>Sign in with an authorized account.</p><SignInButton /><Link href="/">Return home</Link></main>;
  if (!session.user.isAdmin) return <main className="admin-auth-state"><h1>Not authorized</h1><p>{session.user.email} doesn&apos;t have admin access.</p><Link href="/engagement">Back to site</Link><SignOutButton /></main>;
  return <AdminStayPortal />;
}
