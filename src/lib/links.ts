import type { Species } from "./types";

/**
 * Linking out to Birds of the World, Avibase and eBird is fine; reusing their
 * images is not. Thirteen species carry no eBird code, so that link is optional.
 */
export type ExternalLink = { label: string; href: string; note?: string };

export function externalLinks(species: Species): ExternalLink[] {
  const links: ExternalLink[] = [];

  if (species.ebird) {
    links.push({
      label: "Birds of the World",
      href: `https://birdsoftheworld.org/bow/species/${species.ebird}/cur/introduction`,
      note: "Áskrift þarf fyrir fulla grein",
    });
    links.push({
      label: "eBird",
      href: `https://ebird.org/species/${species.ebird}`,
    });
  }

  if (species.avibase) {
    links.push({
      label: "Avibase",
      href: `https://avibase.bsc-eoc.org/species.jsp?avibaseid=${species.avibase.replace(/^avibase-/, "")}`,
    });
  }

  links.push({
    label: "Wikipedia",
    href: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(species.sciName)}`,
  });

  return links;
}
