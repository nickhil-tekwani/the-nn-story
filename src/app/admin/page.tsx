import Link from "next/link";
import { auth } from "@/auth";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import AdminPortal from "@/components/AdminPortal";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center">
        <h1 className="text-3xl">Admin</h1>
        <p className="font-sans text-sm text-stone-400">
          Sign in with an authorized account.
        </p>
        <SignInButton />
      </main>
    );
  }

  if (!session.user.isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-900 px-6 text-center">
        <h1 className="text-3xl">Not authorized</h1>
        <p className="font-sans text-sm text-stone-400">
          {session.user.email} doesn&apos;t have admin access.
        </p>
        <div className="flex gap-4">
          <Link href="/" className="font-sans text-sm underline">
            Back to site
          </Link>
          <SignOutButton />
        </div>
      </main>
    );
  }

  return <AdminPortal />;
}
