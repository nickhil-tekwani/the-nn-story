import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/AuthButtons";
import StayPlanner from "@/components/StayPlanner";
import { getStayData, getStayEligibility } from "@/lib/stay";

export const metadata: Metadata = {
  title: "Your Cincinnati Stay · Nickhil ♥ Nikki",
  description: "Private lodging and travel planning for invited guests.",
  robots: { index: false, follow: false },
};

export default async function StayPage() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <main className="admin-auth-state">
        <h1>Your Cincinnati Stay</h1>
        <p>Sign in with the account connected to your invitation.</p>
        <SignInButton callbackUrl="/stay" />
        <Link href="/engagement">Back to invitation</Link>
      </main>
    );
  }
  const eligibility = await getStayEligibility(session.user.email);
  if (!eligibility) redirect("/engagement?stay=unavailable");
  const data = JSON.parse(JSON.stringify(await getStayData(eligibility)));
  return <StayPlanner initialData={data} firstName={session.user.name?.split(" ")[0] ?? null} />;
}
