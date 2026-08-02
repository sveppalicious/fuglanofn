import Link from "next/link";

import { t } from "@/lib/strings";

const LINKS = [
  { href: "/orders", label: t.nav.orders },
  { href: "/suggestions", label: t.nav.suggestions },
  { href: "/about", label: t.nav.about },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {t.site.name}
        </Link>
        <nav aria-label="Aðalvalmynd" className="flex gap-4 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted hover:text-accent hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted sm:px-6">
        <p>
          Flokkun og fyrirliggjandi íslensk nöfn eru úr{" "}
          <a
            className="underline hover:text-accent"
            href="https://www.avilist.org/"
            rel="noreferrer"
            target="_blank"
          >
            AviList v2025b
          </a>{" "}
          (10. júní 2026). Íslensku nöfnin sem þegar eru til eru verk íslenskra
          fuglafræðinga og eru eldri en þetta verkefni.
        </p>
        <p className="mt-2">
          <Link className="underline hover:text-accent" href="/about">
            {t.about.heading}
          </Link>
        </p>
      </div>
    </footer>
  );
}
