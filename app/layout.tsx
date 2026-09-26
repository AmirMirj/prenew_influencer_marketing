import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const title = "Reach — find small gaming creators other tools miss";
const description =
  "Ranked micro-influencers for refurbished gaming PCs. Local-language search, hidden gems, outreach-ready pitches.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Reach by Prenew",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.className} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
