import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

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
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
