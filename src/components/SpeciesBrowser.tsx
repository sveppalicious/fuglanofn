"use client";

import { useMemo, useState } from "react";

import { compareNames } from "@/lib/collate";
import { IUCN_ORDER, iucnLabel } from "@/lib/iucn";
import { t } from "@/lib/strings";
import type { Species } from "@/lib/types";

import { SpeciesCard } from "./SpeciesCard";

type StatusFilter = "all" | "has_name" | "needs_name";
type SortKey = "taxonomic" | "sci" | "en" | "is";

const PAGE = 120;

/**
 * Filtering and sorting happen in the browser over the family's species, which
 * arrive as props from the statically generated page. The largest family is a
 * few hundred rows, so this stays comfortably fast without an index or a
 * round-trip; cards render in pages of {@link PAGE} to keep the first paint cheap.
 */
export function SpeciesBrowser({ species }: { species: Species[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [iucn, setIucn] = useState("all");
  const [sort, setSort] = useState<SortKey>("taxonomic");
  const [limit, setLimit] = useState(PAGE);

  const iucnPresent = useMemo(() => {
    const present = new Set(species.map((s) => s.iucn).filter(Boolean));
    return IUCN_ORDER.filter((code) => present.has(code));
  }, [species]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const rows = species.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (iucn !== "all" && s.iucn !== iucn) return false;
      if (!needle) return true;
      return (
        s.sciName.toLowerCase().includes(needle) ||
        s.enName.toLowerCase().includes(needle) ||
        s.isName.toLowerCase().includes(needle)
      );
    });

    if (sort === "taxonomic") return rows;

    const sorted = [...rows];
    if (sort === "sci") sorted.sort((a, b) => compareNames(a.sciName, b.sciName));
    if (sort === "en") sorted.sort((a, b) => compareNames(a.enName, b.enName));
    if (sort === "is") {
      // Unnamed species have no Icelandic name to sort by; they go last, in
      // taxonomic order among themselves.
      sorted.sort((a, b) => {
        if (!a.isName && !b.isName) return a.seq - b.seq;
        if (!a.isName) return 1;
        if (!b.isName) return -1;
        return compareNames(a.isName, b.isName);
      });
    }
    return sorted;
  }, [species, query, status, iucn, sort]);

  const dirty = query !== "" || status !== "all" || iucn !== "all" || sort !== "taxonomic";

  function reset() {
    setQuery("");
    setStatus("all");
    setIucn("all");
    setSort("taxonomic");
    setLimit(PAGE);
  }

  const shown = filtered.slice(0, limit);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-56">
          <span className="text-xs font-medium text-muted">{t.filters.search}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={t.filters.searchPlaceholder}
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">{t.filters.status}</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as StatusFilter);
              setLimit(PAGE);
            }}
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t.filters.statusAll}</option>
            <option value="has_name">{t.filters.statusNamed}</option>
            <option value="needs_name">{t.filters.statusUnnamed}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">{t.filters.iucn}</span>
          <select
            value={iucn}
            onChange={(e) => {
              setIucn(e.target.value);
              setLimit(PAGE);
            }}
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t.filters.iucnAll}</option>
            {iucnPresent.map((code) => (
              <option key={code} value={code}>
                {code} — {iucnLabel(code)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">{t.filters.sort}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
          >
            <option value="taxonomic">{t.filters.sortTaxonomic}</option>
            <option value="sci">{t.filters.sortSci}</option>
            <option value="en">{t.filters.sortEn}</option>
            <option value="is">{t.filters.sortIs}</option>
          </select>
        </label>

        {dirty && (
          <button
            type="button"
            onClick={reset}
            className="self-start rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-accent sm:self-auto"
          >
            {t.filters.reset}
          </button>
        )}
      </div>

      <p aria-live="polite" className="mb-3 text-sm text-muted tabular-nums">
        {t.filters.showing(filtered.length, species.length)}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
          {t.filters.empty}
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((s) => (
              <li key={s.slug} className="contents">
                <SpeciesCard species={s} />
              </li>
            ))}
          </ul>

          {filtered.length > shown.length && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
              >
                Sýna fleiri ({filtered.length - shown.length} eftir)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
