/**
 * The UI is Icelandic-first. English strings on the site are reference names for
 * birds, not interface copy.
 *
 * This is the whole translation layer for now: one dictionary, one locale. It
 * exists so that adding a second locale is a matter of adding a sibling object
 * and a locale segment to the routes, rather than hunting down hard-coded copy
 * in fifty components. Do not ship a half-translated English UI as the default.
 */

export const LOCALE = "is-IS" as const;

export const t = {
  site: {
    name: "Fuglanöfn",
    tagline: "Íslensk nöfn á fuglum heimsins",
    description:
      "Af 11.131 fuglategund heimsins eiga 2.729 íslenskt nafn. Hér má skoða hinar — og stinga upp á nafni.",
  },
  nav: {
    home: "Forsíða",
    orders: "Ættbálkar",
    suggestions: "Nýlegar tillögur",
    about: "Um verkefnið",
  },
  taxon: {
    order: "Ættbálkur",
    orders: "Ættbálkar",
    family: "Ætt",
    families: "Ættir",
    species: "Tegund",
    speciesPlural: "Tegundir",
    sciName: "Fræðiheiti",
    enName: "Enskt heiti",
    isName: "Íslenskt heiti",
    authority: "Höfundur lýsingar",
    iucn: "Verndarstaða",
    range: "Útbreiðsla",
    rangeMissing: "Engin útbreiðslulýsing fylgir gögnunum.",
  },
  status: {
    named: "Á sér nafn",
    pending: "Tillögur í umræðu",
    unnamed: "Vantar nafn",
    namedShort: "Nefnd",
    unnamedShort: "Nafnlaus",
    seeded: "Úr AviList",
    seededHelp:
      "Nafnið er þegar í almennri notkun og kemur úr AviList, ekki héðan.",
  },
  progress: {
    heading: "Framvinda",
    named: "með íslenskt nafn",
    needs: "vantar nafn",
    ofTotal: (named: number, total: number) =>
      `${fmt(named)} af ${fmt(total)} tegundum`,
    percentNamed: (pct: string) => `${pct}% nefnd`,
  },
  filters: {
    heading: "Sía",
    search: "Leita",
    searchPlaceholder: "Fræðiheiti, enskt eða íslenskt heiti",
    status: "Staða",
    statusAll: "Allar tegundir",
    statusNamed: "Á sér nafn",
    statusUnnamed: "Vantar nafn",
    iucn: "Verndarstaða",
    iucnAll: "Öll stig",
    sort: "Raða",
    sortTaxonomic: "Í ættfræðilegri röð",
    sortSci: "Eftir fræðiheiti",
    sortEn: "Eftir ensku heiti",
    sortIs: "Eftir íslensku heiti",
    reset: "Hreinsa síur",
    showing: (shown: number, total: number) =>
      shown === total
        ? `${fmt(total)} tegundir`
        : `${fmt(shown)} af ${fmt(total)} tegundum`,
    empty: "Engin tegund passar við síurnar.",
  },
  species: {
    links: "Ytri tenglar",
    bow: "Birds of the World",
    avibase: "Avibase",
    ebird: "eBird",
    previous: "Fyrri tegund",
    next: "Næsta tegund",
    suggestHeading: "Stingdu upp á nafni",
    suggestComingSoon:
      "Tillögur og umræður opna í næsta áfanga. Þangað til má skoða og undirbúa sig.",
    guidanceHeading: "Hvað einkennir íslenskt fuglsheiti?",
  },
  home: {
    ctaBrowse: "Skoða ættbálka",
    ctaAbout: "Hvernig tek ég þátt?",
    gapsHeading: "Hér vantar mest",
    gapsIntro:
      "Ættir þar sem flestar tegundir bíða nafns. Suðræn spörfuglaætt á sjaldnast nafn á íslensku.",
    doneHeading: "Þegar fullnefnt",
    doneIntro:
      "Stærstu ættirnar þar sem hver einasta tegund á sér íslenskt nafn.",
  },
  about: {
    heading: "Um verkefnið",
  },
  common: {
    backTo: (what: string) => `Til baka í ${what}`,
    notFound: "Fannst ekki",
  },
};

/**
 * Icelandic uses a full stop as the thousands separator and a comma as the
 * decimal mark: 11.131 and 24,5. Written out rather than delegated to
 * `Intl.NumberFormat(LOCALE)` for the same reason as the collator in
 * `lib/collate.ts` — a runtime without Icelandic locale data falls back to the
 * default locale without complaint, which on the client would render 11,131 next
 * to the server's 11.131 and trip a hydration mismatch.
 */
export function fmt(value: number): string {
  const negative = value < 0;
  const [whole, fraction] = Math.abs(value).toString().split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${grouped}${fraction ? `,${fraction}` : ""}`;
}

export function percent(part: number, whole: number): string {
  if (whole === 0) return "0";
  return (Math.round((part / whole) * 1000) / 10).toFixed(1).replace(".", ",");
}
