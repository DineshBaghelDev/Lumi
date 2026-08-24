import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Lumi",
  description: "Source-grounded technical learning",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
