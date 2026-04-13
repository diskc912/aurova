import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-family-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://autocut.in"),
  title: "AutoCut Video — Remove Silence Instantly",
  description:
    "Automatically detect and remove silent sections from your videos. 100% client-side processing — your files never leave your device.",
  keywords: ["video editor", "remove silence sequence", "ffmpeg browser", "autocut", "free video editor"],
  authors: [{ name: "AutoCut Team" }],
  openGraph: {
    type: "website",
    url: "https://autocut.in",
    title: "AutoCut Video — Remove Silence Instantly",
    description: "Automatically detect and remove silent sections from your videos. 100% client-side processing.",
    siteName: "AutoCut",
    images: [{ url: "/logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoCut Video — Remove Silence Instantly",
    description: "Automatically detect and remove silent sections from your videos. 100% client-side processing.",
    images: ["/logo.png"],
  },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AutoCut",
    "operatingSystem": "WebBrowser",
    "applicationCategory": "MultimediaApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Automatically detect and remove silent sections from your videos directly in your browser. No server uploads required.",
    "url": "https://autocut.in",
  };

  return (
    <html lang="en" className={`dark ${playfairDisplay.variable}`}>
      <body suppressHydrationWarning className="bg-stitch min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
