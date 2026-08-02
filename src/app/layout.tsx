import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { t } from "@/lib/strings";

import "./globals.css";

// The Latin subset covers Þ, Ð, Æ and the accented vowels (U+00C0–U+00FF), so
// Icelandic renders without pulling in latin-ext.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: `${t.site.name} — ${t.site.tagline}`,
    template: `%s · ${t.site.name}`,
  },
  description: t.site.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="is"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
