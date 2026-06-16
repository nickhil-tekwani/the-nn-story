import Link from "next/link";
import VideoBackground from "@/components/VideoBackground";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <VideoBackground />
      <h1 className="text-5xl leading-tight sm:text-6xl">
        Nickhil <span style={{ color: "var(--star)" }}>★</span> Nikki
      </h1>
      {session && (
        <Link
          href="/engagement"
          style={{
            marginTop: "2rem",
            display: "inline-block",
            borderRadius: "999px",
            border: "1px solid rgba(250,247,242,0.5)",
            color: "rgba(250,247,242,0.85)",
            padding: "0.6rem 1.75rem",
            fontFamily: "var(--font-pt), serif",
            fontSize: "0.82rem",
            letterSpacing: "0.1em",
            textDecoration: "none",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            transition: "border-color 0.2s ease, color 0.2s ease",
          }}
        >
          View Invite
        </Link>
      )}
    </main>
  );
}
