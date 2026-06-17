import type { Metadata } from "next";
import { Gilda_Display, PT_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";

const gilda = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gilda",
  display: "swap",
});
const ptSerif = PT_Serif({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-pt",
  display: "swap",
});

const OG_IMAGE = "https://cy6irvlsob9pkzzc.public.blob.vercel-storage.com/nikkinickhill-66.jpg";

export const metadata: Metadata = {
  title: "Save the Date",
  description: "An engagement celebration — save the date.",
  openGraph: {
    title: "Nickhil ♥ Nikki",
    description: "An engagement celebration — save the date.",
    images: [{ url: OG_IMAGE, width: 1200, alt: "Nickhil & Nikki" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nickhil ♥ Nikki",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${gilda.variable} ${ptSerif.variable}`}>
      <body>
        {children}
        <Analytics />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="934e64be-55f1-4cc7-a371-b1a8ff48a41a"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
