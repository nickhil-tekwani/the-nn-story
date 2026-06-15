import Link from "next/link";
import { auth } from "@/auth";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import AdminPortal from "@/components/AdminPortal";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "var(--paper)",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "var(--font-pt), Georgia, serif",
          color: "var(--ink-warm)",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-gilda), serif", fontWeight: 400, fontSize: "2rem", margin: 0 }}>
          Admin
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
          Sign in with an authorized account.
        </p>
        <SignInButton />
        <Link href="/" style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
          Return home
        </Link>
      </main>
    );
  }

  if (!session.user.isAdmin) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "var(--paper)",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "var(--font-pt), Georgia, serif",
          color: "var(--ink-warm)",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-gilda), serif", fontWeight: 400, fontSize: "2rem", margin: 0 }}>
          Not authorized
        </h1>
        <p style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
          {session.user.email} doesn&apos;t have admin access.
        </p>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/" style={{ fontSize: "0.85rem", color: "var(--ink-muted)", textDecoration: "underline" }}>
            Back to site
          </Link>
          <SignOutButton />
        </div>
      </main>
    );
  }

  return <AdminPortal />;
}
