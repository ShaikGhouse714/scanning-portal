import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanTrack Core // Scanning Department Portal",
  description: "Scanning Department Intake, Verification & Real-time Audit Network",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="min-h-full flex flex-col bg-[#050811] text-[#E2E8F0] antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
