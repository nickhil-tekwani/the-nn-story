import VideoBackground from "@/components/VideoBackground";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <VideoBackground />
      <p className="font-sans text-xs uppercase tracking-[0.3em]" style={{ color: "rgba(250,247,242,0.7)" }}>
        06 · 10 · 26
      </p>
      <h1 className="mt-4 text-5xl leading-tight sm:text-6xl">
        Nickhil &amp; Nikki
      </h1>
    </main>
  );
}
