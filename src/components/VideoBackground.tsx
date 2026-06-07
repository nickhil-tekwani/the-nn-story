/**
 * Full-screen background photo. Two images are loaded:
 *  - bg-portrait  (9:16) — shown on portrait/mobile viewports
 *  - bg-landscape (16:9) — shown on landscape/desktop viewports
 *
 * Swap the placeholder files in /public with your real photos whenever ready:
 *   /public/bg-portrait.jpg   (vertical, e.g. 1080×1920)
 *   /public/bg-landscape.jpg  (horizontal, e.g. 1920×1080)
 *
 * Or override via env vars:
 *   NEXT_PUBLIC_BG_PORTRAIT_URL
 *   NEXT_PUBLIC_BG_LANDSCAPE_URL
 */

const portraitSrc =
  process.env.NEXT_PUBLIC_BG_PORTRAIT_URL ||
  "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/TRR_4056.JPG";
const landscapeSrc =
  process.env.NEXT_PUBLIC_BG_LANDSCAPE_URL ||
  "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/TRR_8822.JPG";

export default function VideoBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-fallback">
      {/* Portrait image — visible on narrow/phone screens */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={portraitSrc}
        alt=""
        aria-hidden="true"
        className="portrait-bg absolute inset-0 h-full w-full object-cover"
      />
      {/* Landscape image — visible on wider/desktop screens */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={landscapeSrc}
        alt=""
        aria-hidden="true"
        className="landscape-bg absolute inset-0 h-full w-full object-cover"
      />
      {/* Dark + blur overlay for text legibility */}
      <div className="absolute inset-0 bg-overlay" />
    </div>
  );
}
