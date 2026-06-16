import Link from "next/link";
import type { Metadata } from "next";
import type { GroupLabel } from "@/db/schema";
import { auth } from "@/auth";
import RotatingBackground from "@/components/RotatingBackground";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";
import PhoneClaim from "@/components/PhoneClaim";
import RsvpForm from "@/components/RsvpForm";
import { getClaimedGroup, getRsvp } from "@/lib/guest";

const OG_IMAGE = "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/nikkinickhill-66.jpg";

export const metadata: Metadata = {
  openGraph: {
    title: "Nickhil ♥ Nikki — You're Invited!",
    description: "An engagement celebration — save the date.",
    images: [{ url: OG_IMAGE, width: 1200, alt: "Nickhil & Nikki" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nickhil ♥ Nikki — You're Invited!",
    images: [OG_IMAGE],
  },
};

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
      <RotatingBackground />

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
          maxWidth: "36rem",
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
            invitedNames={group.invitedNames}
            groupLabel={group.groupLabel}
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
  invitedNames,
  groupLabel,
  rsvp,
}: {
  firstName: string | null;
  maxPartySize: number;
  invitedNames: string[];
  groupLabel: GroupLabel | null | undefined;
  rsvp: {
    attending: boolean;
    needsHotel: boolean;
    partySize: number;
    partyMembers: string[];
  } | null;
}) {
  return (
    <div>
      {rsvp !== null && (
        <div style={{ textAlign: "center", marginBottom: "1.1rem" }}>
          <span style={{
            display: "inline-block",
            padding: "0.2rem 0.8rem",
            borderRadius: "999px",
            fontSize: "0.78rem",
            letterSpacing: "0.03em",
            background: rsvp.attending ? "rgba(45,106,79,0.1)" : "rgba(26,22,19,0.06)",
            color: rsvp.attending ? "#2d6a4f" : "var(--ink-muted)",
          }}>
            {rsvp.attending ? `${rsvp.partySize}/${maxPartySize} yes` : `0/${maxPartySize} no`}
          </span>
        </div>
      )}
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
      <RsvpForm maxPartySize={maxPartySize} invitedNames={invitedNames} groupLabel={groupLabel} initial={rsvp} />
    </div>
  );
}
