/**
 * Full-screen looping background video. The URL comes from NEXT_PUBLIC_VIDEO_URL
 * (defaults to the bundled placeholder in /public). A gradient sits behind it so
 * the page looks intentional even before the video loads.
 */
export default function VideoBackground() {
  const src = process.env.NEXT_PUBLIC_VIDEO_URL || "/placeholder-loop.mp4";

  return (
    <div className="fixed inset-0 -z-10 video-fallback">
      <video
        className="h-full w-full object-cover opacity-60"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        // poster could be added here for an instant first paint
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}
