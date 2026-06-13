"use client";

import { useEffect, useState } from "react";
import styles from "./gallery.module.css";

type Photo = {
  src: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  alt: string;
};

export default function GalleryGrid({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<Photo | null>(null);

  // Lock scroll + close on Escape while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (photos.length === 0) {
    return (
      <p className={styles.empty}>
        Photos are on their way — check back soon.
      </p>
    );
  }

  return (
    <>
      <div className={styles.masonry}>
        {photos.map((p) => (
          <button
            key={p.src}
            className={styles.tile}
            onClick={() => setOpen(p)}
            aria-label={`View ${p.alt}`}
          >
            <img
              src={p.src}
              alt={p.alt}
              width={p.width}
              height={p.height}
              loading="lazy"
              className={styles.tileImg}
            />
          </button>
        ))}
      </div>

      {open && (
        <div className={styles.lightbox} onClick={() => setOpen(null)}>
          <button className={styles.lightboxClose} aria-label="Close">
            ✕
          </button>
          <img
            src={open.src}
            alt={open.alt}
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
