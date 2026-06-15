import Link from "next/link";
import { auth } from "@/auth";
import VideoBackground from "@/components/VideoBackground";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import PhoneClaim from "@/components/PhoneClaim";
import RsvpForm from "@/components/RsvpForm";
import { getClaimedGroup, getRsvp } from "@/lib/guest";

export default async function EngagementPage() {
  const session = await auth();
  const email = session?.user?.email;

  const group = email ? await getClaimedGroup(email) : null;
  const rsvp = group ? await getRsvp(group.id) : null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <VideoBackground />

      {session && (
        <div className="absolute right-6 top-6 flex items-center gap-4">
          {session.user.isAdmin && (
            <Link
              href="/admin"
              className="font-sans text-xs uppercase tracking-widest hover:underline"
              style={{ color: "rgba(250,247,242,0.7)" }}
            >
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      )}

      <Hero />

      <div className="mt-10 flex w-full max-w-md flex-col items-center">
        {!session ? (
          <SignedOut />
        ) : !group ? (
          <PhoneClaim />
        ) : (
          <EventDetails
            firstName={session.user?.name?.split(" ")[0] ?? null}
            maxPartySize={group.maxPartySize}
            rsvp={rsvp}
          />
        )}
      </div>
    </main>
  );
}

function Hero() {
  const dateIso = process.env.NEXT_PUBLIC_EVENT_DATE || "2026-09-19";
  const city = process.env.NEXT_PUBLIC_EVENT_CITY || "Cincinnati, OH";
  const date = new Date(dateIso + "T00:00:00");
  const formatted = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="text-center">
      <p className="font-sans text-xs uppercase tracking-[0.3em]" style={{ color: "rgba(250,247,242,0.7)" }}>
        Save the Date
      </p>
      <h1 className="mt-4 text-5xl leading-tight sm:text-6xl">
        We&apos;re Engaged
      </h1>
      <p className="mt-6 text-2xl">{formatted}</p>
      <p className="mt-1 text-lg" style={{ color: "rgba(250,247,242,0.85)" }}>
        {city}
      </p>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="font-sans text-sm" style={{ color: "rgba(250,247,242,0.7)" }}>
        Please sign in to view the details and RSVP.
      </p>
      <SignInButton />
    </div>
  );
}

function EventDetails({
  firstName,
  maxPartySize,
  rsvp,
}: {
  firstName: string | null;
  maxPartySize: number;
  rsvp: {
    attending: boolean;
    needsHotel: boolean;
    partySize: number;
    partyMembers: string[];
  } | null;
}) {
  return (
    <div className="w-full rounded-2xl border border-white/15 bg-black/40 p-8 text-center backdrop-blur-md">
      <p className="font-sans text-sm" style={{ color: "rgba(250,247,242,0.85)" }}>
        Welcome{firstName ? `, ${firstName}` : ""} — we can&apos;t wait to
        celebrate with you.
      </p>
      <RsvpForm maxPartySize={maxPartySize} initial={rsvp} />
    </div>
  );
}
