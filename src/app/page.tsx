import Link from "next/link";
import { auth } from "@/auth";
import VideoBackground from "@/components/VideoBackground";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import PhoneClaim from "@/components/PhoneClaim";
import RsvpForm from "@/components/RsvpForm";
import { getClaimedGuest, getRsvp } from "@/lib/guest";

// ─── COMING SOON GATE ────────────────────────────────────────────────────────
// Set to false to restore the full page. See CLAUDE.md for details.
const COMING_SOON = true;
// ─────────────────────────────────────────────────────────────────────────────

export default async function Home() {
  if (COMING_SOON) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
        <VideoBackground />
        <p className="font-sans text-xs uppercase tracking-[0.3em]" style={{ color: "rgba(250,247,242,0.7)" }}>
          Nickhil &amp; Nikki
        </p>
        <h1 className="mt-4 text-5xl leading-tight sm:text-6xl">Coming Soon</h1>
        <p className="mt-6 font-sans text-sm" style={{ color: "rgba(250,247,242,0.65)" }}>
          The full invite is on its way — check back shortly.
        </p>
      </main>
    );
  }

  const session = await auth();
  const email = session?.user?.email;

  const guest = email ? await getClaimedGuest(email) : null;
  const rsvp = guest ? await getRsvp(guest.id) : null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <VideoBackground />

      {/* Header / sign-out */}
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
        ) : !guest ? (
          <PhoneClaim />
        ) : (
          <EventDetails
            name={guest.name}
            maxPartySize={guest.maxPartySize}
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
      <p className="font-sans text-xs uppercase tracking-[0.3em] text-cream/70" style={{ color: "rgba(250,247,242,0.7)" }}>
        Save the Date
      </p>
      <h1 className="mt-4 text-5xl leading-tight sm:text-6xl">
        We&apos;re Engaged
      </h1>
      <p className="mt-6 text-2xl">{formatted}</p>
      <p className="mt-1 text-lg text-cream/80" style={{ color: "rgba(250,247,242,0.85)" }}>
        {city}
      </p>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="font-sans text-sm text-cream/70" style={{ color: "rgba(250,247,242,0.7)" }}>
        Please sign in to view the details and RSVP.
      </p>
      <SignInButton />
    </div>
  );
}

function EventDetails({
  name,
  maxPartySize,
  rsvp,
}: {
  name: string;
  maxPartySize: number;
  rsvp: { attending: boolean; needsHotel: boolean; partySize: number } | null;
}) {
  return (
    <div className="w-full rounded-2xl border border-white/15 bg-black/40 p-8 text-center backdrop-blur-md">
      <p className="font-sans text-sm text-cream/80" style={{ color: "rgba(250,247,242,0.85)" }}>
        Welcome, {name.split(" ")[0]} — we can&apos;t wait to celebrate with you.
      </p>
      <RsvpForm maxPartySize={maxPartySize} initial={rsvp} />
    </div>
  );
}
