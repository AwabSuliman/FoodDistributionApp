import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masjid Al-Wasatiyah Wal-Itidaal Zakatul Fitr Distribution",
  description: "Zakatul Fitr distribution operations for Masjid Al-Wasatiyah Wal-Itidaal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
