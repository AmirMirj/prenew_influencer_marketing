import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prenew · Influencer discovery",
  description: "Find micro and mid-tier creators who fit refurbished gaming PCs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
