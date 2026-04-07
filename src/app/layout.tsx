import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="bg-orbs min-h-screen text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
