import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-family-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoCut Video — Remove Silence Instantly",
  description:
    "Automatically detect and remove silent sections from your videos. 100% client-side processing — your files never leave your device.",
  icons: {
    icon: "/logo-light-theme.png",
    shortcut: "/logo-light-theme.png",
    apple: "/logo-light-theme.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${playfairDisplay.variable}`}>
      <body suppressHydrationWarning className="bg-stitch min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
