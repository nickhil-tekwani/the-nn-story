import Link from "next/link";
import { auth } from "@/auth";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import AnalyticsPortal from "@/components/AnalyticsPortal";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) {
    return (
      <main className="admin-auth-state">
        <h1>Analytics</h1>
        <p>Sign in with an authorized account.</p>
        <SignInButton />
        <Link href="/">Return home</Link>
      </main>
    );
  }
  if (!session.user.isAdmin) {
    return (
      <main className="admin-auth-state">
        <h1>Not authorized</h1>
        <p>{session.user.email} doesn&apos;t have admin access.</p>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/">Back to site</Link>
          <SignOutButton />
        </div>
      </main>
    );
  }
  return <AnalyticsPortal />;
}
