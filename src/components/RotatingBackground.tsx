"use client";

/**
 * Full-screen rotating background for /engagement.
 *
 * Two independent rotations run at once:
 *   - portrait set  → shown on portrait/mobile viewports
 *   - landscape set → shown on landscape/desktop viewports
 * CSS (.portrait-bg / .landscape-bg) decides which one is visible, so rotating
 * the phone swaps which set you see.
 *
 * Behaviour:
 *   - A RANDOM photo is chosen on every page load (not a fixed cycle).
 *   - Every ROTATE_MS it advances to another random photo that is never the
 *     same as the one currently showing (so it always visibly changes).
 *   - The new photo cross-fades in on top of the previous one.
 *
 * The photo sets live in ./bg-manifest.json — populate it with `npm run bg:add`,
 * which uploads straight to Vercel Blob and writes the right references here.
 */

import { useEffect, useState } from "react";
import bg from "./bg-manifest.json";

type Photo = { src: string; alt?: string };

const ROTATE_MS = 10_000;

// If the manifest is ever empty, fall back to the original single photos so the
// page is never blank.
const FALLBACK_LANDSCAPE: Photo[] = [
  { src: "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/TRR_8822.JPG", alt: "" },
];
const FALLBACK_PORTRAIT: Photo[] = [
  { src: "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/TRR_4056.JPG", alt: "" },
];

const landscape: Photo[] = bg.landscape?.length ? bg.landscape : FALLBACK_LANDSCAPE;
const portrait: Photo[] = bg.portrait?.length ? bg.portrait : FALLBACK_PORTRAIT;

export default function RotatingBackground() {
  return (
    <div className="fixed inset-0 -z-10 bg-fallback">
      {/* Portrait set — visible on narrow/phone screens */}
      <div className="portrait-bg absolute inset-0">
        <Rotator photos={portrait} />
      </div>
      {/* Landscape set — visible on wider/desktop screens */}
      <div className="landscape-bg absolute inset-0">
        <Rotator photos={landscape} />
      </div>
      {/* Dark + blur overlay for text legibility */}
      <div className="absolute inset-0 bg-overlay" />
    </div>
  );
}

function Rotator({ photos }: { photos: Photo[] }) {
  // Start as null so the first photo is picked on the client (random per load,
  // and no server/client hydration mismatch). `curr` renders on top of `prev`
  // and fades in.
  const [state, setState] = useState<{ curr: number | null; prev: number | null }>({
    curr: null,
    prev: null,
  });

  useEffect(() => {
    if (photos.length === 0) return;

    // Random starting photo on every page load.
    setState({ curr: Math.floor(Math.random() * photos.length), prev: null });

    // Nothing to rotate to with a single photo.
    if (photos.length < 2) return;

    const id = setInterval(() => {
      setState((s) => {
        const c = s.curr ?? 0;
        // Pick uniformly from the other photos, so it's never the same as now.
        let next = Math.floor(Math.random() * (photos.length - 1));
        if (next >= c) next += 1;
        return { curr: next, prev: c };
      });
    }, ROTATE_MS);

    return () => clearInterval(id);
  }, [photos]);

  const { curr, prev } = state;
  if (curr === null) return null;

  return (
    <>
      {/* Previous photo sits underneath at full opacity… */}
      {prev !== null && prev !== curr && (
        <img
          key={`prev-${prev}`}
          src={photos[prev].src}
          alt=""
          aria-hidden="true"
          className="bg-rotator-img"
        />
      )}
      {/* …and the current photo cross-fades in on top of it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`curr-${curr}`}
        src={photos[curr].src}
        alt={photos[curr].alt || ""}
        aria-hidden="true"
        className="bg-rotator-img bg-fade-in"
      />
    </>
  );
}
