import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Subin Khadka | Graphic Designer & Video Editor",
  description: "Creative portfolio of Subin Khadka — Graphic Designer, Video Editor, and Digital Marketer based in Nepal.",
  keywords: ["graphic designer", "video editor", "digital marketer", "Nepal", "Subin Khadka"],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
