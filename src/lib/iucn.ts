/**
 * IUCN Red List categories, with the Icelandic terms used by
 * Náttúrufræðistofnun. AviList also carries the parenthesised provisional forms
 * `CR (PE)` (possibly extinct) and `CR (PEW)` (possibly extinct in the wild).
 */
export const IUCN_LABELS: Record<string, string> = {
  EX: "Útdauð",
  EW: "Útdauð í náttúrunni",
  "CR (PEW)": "Í bráðri hættu — líklega útdauð í náttúrunni",
  "CR (PE)": "Í bráðri hættu — líklega útdauð",
  CR: "Í bráðri hættu",
  EN: "Í hættu",
  VU: "Í nokkurri hættu",
  NT: "Í yfirvofandi hættu",
  LC: "Ekki í hættu",
  DD: "Gögn vantar",
  NE: "Ekki metin",
};

/** Most threatened first, so filter menus read top-down as urgency descending. */
export const IUCN_ORDER = [
  "EX",
  "EW",
  "CR (PEW)",
  "CR (PE)",
  "CR",
  "EN",
  "VU",
  "NT",
  "LC",
  "DD",
  "NE",
];

/** Categories that count as threatened for the purposes of highlighting. */
const THREATENED = new Set(["EX", "EW", "CR (PEW)", "CR (PE)", "CR", "EN", "VU"]);

export function iucnLabel(code: string): string {
  return IUCN_LABELS[code] ?? code;
}

export function isThreatened(code: string): boolean {
  return THREATENED.has(code);
}

export function iucnClasses(code: string): string {
  if (code === "EX" || code === "EW") return "bg-neutral-800 text-neutral-100";
  if (code.startsWith("CR")) return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
  if (code === "EN") return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200";
  if (code === "VU") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (code === "NT") return "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200";
  if (code === "LC") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  return "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
}
