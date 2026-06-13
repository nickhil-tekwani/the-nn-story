import type { Metadata } from "next";
import { Gilda_Display, PT_Serif } from "next/font/google";
import styles from "./gallery.module.css";
import GalleryGrid from "./GalleryGrid";
import manifest from "./manifest.json";

const gilda = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gilda",
});
const ptSerif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-pt",
});

const OG_IMAGE =
  "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/nikkinickhill-66.jpg";

export const metadata: Metadata = {
  title: "Gallery · Nickhil ♥ Nikki",
  description: "A few of our favorite moments together.",
  openGraph: {
    title: "Gallery · Nickhil ♥ Nikki",
    description: "A few of our favorite moments together.",
    images: [{ url: OG_IMAGE, width: 1200, alt: "Nickhil & Nikki" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gallery · Nickhil ♥ Nikki",
    images: [OG_IMAGE],
  },
};

type Photo = {
  src: string;
  width: number;
  height: number;
  orientation: "landscape" | "portrait" | "square";
  alt: string;
};

export default function Gallery() {
  const photos = manifest as Photo[];

  return (
    <div className={`${gilda.variable} ${ptSerif.variable} ${styles.page}`}>
      <div className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.couple}>
            Nickhil <span className={styles.star}>★</span> Nikki
          </p>
          <h1 className={styles.title}>Gallery</h1>
          <p className={styles.intro}>a few clicks from this week</p>
        </header>

        <GalleryGrid photos={photos} />

        <footer className={styles.footer}>
          <p className={styles.signoff}>
            Thank you for celebrating with us{" "}
            <span className={styles.star}>★</span>
          </p>
          <p className={styles.fine}>Nickhil &amp; Nikki · June 13, 2026</p>
        </footer>
      </div>
    </div>
  );
}
