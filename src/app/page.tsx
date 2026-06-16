import VideoBackground from "@/components/VideoBackground";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <VideoBackground />
      <h1 className="text-5xl leading-tight sm:text-6xl">
        Nickhil <span style={{ color: "var(--star)" }}>★</span> Nikki
      </h1>
    </main>
  );
}
