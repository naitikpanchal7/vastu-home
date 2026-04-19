// src/app/layout.tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "vastu@home — Professional Vastu Consultant Platform",
  description:
    "AI-powered Vastu Shastra mapping platform for professional consultants. Authentic Shakti Chakra overlay, zone analysis, cut detection, and classical text-grounded AI advisor.",
  keywords: ["vastu", "vastu shastra", "floor plan", "vastu consultant", "shakti chakra"],
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body className="bg-bg text-vastu-text font-sans antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
