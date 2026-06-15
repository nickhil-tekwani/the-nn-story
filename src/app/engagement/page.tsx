import Link from "next/link";
import { auth } from "@/auth";
import VideoBackground from "@/components/VideoBackground";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import PhoneClaim from "@/components/PhoneClaim";
import RsvpForm from "@/components/RsvpForm";
import { getClaimedGroup, getRsvp } from "@/lib/guest";

const STAR = <span style={{ color: "var(--star)" }}>★</span>;

export default async function EngagementPage() {
  const session = await auth();
  const email = session?.user?.email;
  const group = email ? await getClaimedGroup(email) : null;
  const rsvp = group ? await getRsvp(group.id) : null;

  const dateIso = process.env.NEXT_PUBLIC_EVENT_DATE || "2026-09-19";
  const city = process.env.NEXT_PUBLIC_EVENT_CITY || "Cincinnati, OH";
  const formatted = new Date(dateIso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <VideoBackground />

      {/* Floating nav — on the dark photo, keep light text */}
      {session && (
        <div className="absolute right-5 top-5 z-10 flex items-center gap-4">
          {session.user.isAdmin && (
            <Link
              href="/admin"
              style={{
                fontFamily: "var(--font-pt), serif",
                fontSize: "0.7rem",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(250,247,242,0.7)",
                textDecoration: "none",
              }}
            >
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      )}

      {/* Cream card */}
      <div
        style={{
          background: "var(--paper)",
          borderRadius: "1.25rem",
          boxShadow: "0 20px 60px rgba(26,22,19,0.35)",
          padding: "clamp(2rem, 6vw, 3rem) clamp(1.5rem, 5vw, 2.5rem)",
          width: "100%",
          maxWidth: "26rem",
          color: "var(--ink-warm)",
          fontFamily: "var(--font-pt), Georgia, serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p
            style={{
              fontFamily: "var(--font-pt), serif",
              fontSize: "0.7rem",
              letterSpacing: "0.34em",
              textTransform: "uppercase",
              color: "var(--ink-muted)",
              margin: "0 0 1.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
            }}
          >
            Nickhil {STAR} Nikki
          </p>
          <h1
            style={{
              fontFamily: "var(--font-gilda), serif",
              fontWeight: 400,
              fontSize: "clamp(2.2rem, 8vw, 2.8rem)",
              lineHeight: 1.05,
              margin: "0 0 1rem",
              color: "var(--ink-warm)",
            }}
          >
            We&apos;re Engaged
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--ink-mid)", margin: "0 0 0.2rem" }}>
            {formatted}
          </p>
          <p style={{ fontSize: "0.88rem", color: "var(--ink-muted)", margin: 0 }}>
            {city}
          </p>
        </div>

        {/* Red rule */}
        <hr
          style={{
            width: "2.2rem",
            height: "1px",
            background: "var(--star)",
            border: 0,
            margin: "0 auto 1.75rem",
          }}
        />

        {/* Auth / claim / RSVP */}
        {!session ? (
          <SignedOut />
        ) : !group ? (
          <PhoneClaim />
        ) : (
          <Welcome
            firstName={session.user?.name?.split(" ")[0] ?? null}
            maxPartySize={group.maxPartySize}
            rsvp={rsvp}
          />
        )}
      </div>
    </main>
  );
}

function SignedOut() {
  return (
    <div style={{ textAlign: "center" }}>
      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--ink-muted)",
          marginBottom: "1.25rem",
        }}
      >
        Sign in to view the details and RSVP.
      </p>
      <SignInButton />
    </div>
  );
}

function Welcome({
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
    <div>
      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--ink-muted)",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        Welcome{firstName ? `, ${firstName}` : ""} — we can&apos;t wait to celebrate with you.
      </p>
      <RsvpForm maxPartySize={maxPartySize} initial={rsvp} />
    </div>
  );
}
