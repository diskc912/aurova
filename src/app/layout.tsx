import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-family-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoCut Video — Remove Silence Instantly",
  description:
    "Automatically detect and remove silent sections from your videos. 100% client-side processing — your files never leave your device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${outfit.variable}`}>
      <body suppressHydrationWarning className="bg-stitch min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
