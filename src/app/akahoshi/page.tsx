import type { Metadata } from "next";
import { Gilda_Display, PT_Serif } from "next/font/google";
import styles from "./akahoshi.module.css";
import MenuTabs from "./MenuTabs";

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

const OG_IMAGE = "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/TRR_8822.JPG";

export const metadata: Metadata = {
  title: "Akahoshi · Nickhil ♥ Nikki",
  description:
    "A little guide to ordering the perfect bowl at our engagement celebration.",
  openGraph: {
    title: "Akahoshi · Nickhil ♥ Nikki",
    description: "A little guide to ordering the perfect bowl at our engagement celebration.",
    images: [{ url: OG_IMAGE, width: 1200, alt: "Nickhil & Nikki" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Akahoshi · Nickhil ♥ Nikki",
    images: [OG_IMAGE],
  },
};

export default function AkahoshiMenu() {
  return (
    <div className={`${gilda.variable} ${ptSerif.variable} ${styles.page}`}>
      <div className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.couple}>
            Nickhil <span className={styles.star}>★</span> Nikki
          </p>
          <h1 className={styles.title}>How to Order</h1>
          <p className={styles.meta}>
            Akahoshi Ramen, Logan Square, Chicago
          </p>
          <p className={styles.intro}>
            We&apos;re so glad you&apos;re here. Here&apos;s a little guide to
            the perfect bowl — and the right drink to go with it.
          </p>
        </header>

        <MenuTabs />

        <div className={styles.igSection}>
          <p className={styles.igLabel}>Check them out on IG</p>
          <div className={styles.igRow}>
            <a
              href="https://www.instagram.com/akahoshiramen/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.igBtn}
            >
              <svg className={styles.igIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4.5"/>
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
              </svg>
              @akahoshiramen
            </a>
            <a
              href="https://www.instagram.com/ramen__lord/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.igBtn}
            >
              <svg className={styles.igIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4.5"/>
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
              </svg>
              @ramen__lord
            </a>
          </div>
        </div>

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
