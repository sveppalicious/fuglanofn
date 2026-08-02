import Link from "next/link";

import { iucnClasses } from "@/lib/iucn";
import type { Species } from "@/lib/types";

import { ImageCredit, SpeciesThumb } from "./SpeciesThumb";
import { StatusBadge } from "./StatusBadge";

export function SpeciesCard({ species }: { species: Species }) {
  const named = species.status === "has_name";

  return (
    <Link
      href={`/species/${species.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md focus-visible:shadow-md"
    >
      <div className="relative">
        <SpeciesThumb
          sciName={species.sciName}
          family={species.family}
          image={species.image}
          alt={species.isName || species.enName}
        />
        <StatusBadge
          status={named ? "named" : "unnamed"}
          className="absolute top-2 right-2 shadow-sm"
        />
        {species.iucn && species.iucn !== "NE" && (
          <span
            className={`absolute top-2 left-2 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold shadow-sm ${iucnClasses(species.iucn)}`}
          >
            {species.iucn}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-3">
        {named ? (
          <h3 className="leading-snug font-semibold text-accent group-hover:underline">
            {species.isName}
          </h3>
        ) : (
          <h3 className="leading-snug font-semibold group-hover:underline">
            {species.enName}
          </h3>
        )}
        <p className="text-sm text-muted italic">{species.sciName}</p>
        {named && <p className="text-sm text-muted">{species.enName}</p>}
        {species.image && (
          <div className="mt-auto pt-2">
            <ImageCredit image={species.image} compact />
          </div>
        )}
      </div>
    </Link>
  );
}
