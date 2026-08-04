import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { slugify } from "../src/lib/slug.ts";

/**
 * Seed the species reference table from site-data/species.json.
 *
 * Re-runnable, and it reports rather than silently overwriting — §10 of the
 * brief. AviList publishes annually and splits and lumps species; a seeder that
 * quietly upserts would erase the evidence that a name is now attached to a
 * species that no longer means what it did.
 *
 * What it will not do: touch `acceptedName` on a species this site has already
 * named. A name coined here outranks whatever AviList carried, and reconciling
 * the two is a human decision.
 *
 *   npm run db:seed
 *   npm run db:seed -- --prune    # also delete species no longer in AviList
 */

type RawSpecies = {
  sciName: string;
  isName: string;
  status: "has_name" | "needs_name";
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const prune = process.argv.includes("--prune");

  const file = path.join(process.cwd(), "site-data", "species.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as RawSpecies[];

  const incoming = new Map(
    raw.map((row) => [
      row.sciName,
      {
        sciName: row.sciName,
        slug: slugify(row.sciName),
        acceptedName: row.isName || null,
        seededName: row.status === "has_name",
      },
    ]),
  );

  const existing = await db.species.findMany({
    select: { sciName: true, acceptedName: true, seededName: true },
  });
  const existingBySci = new Map(existing.map((s) => [s.sciName, s]));

  const added: string[] = [];
  const renamedName: string[] = [];
  const removed: string[] = [];
  const conflicts: string[] = [];

  for (const [sciName, next] of incoming) {
    const current = existingBySci.get(sciName);

    if (!current) {
      added.push(sciName);
      continue;
    }

    // A name this site coined is not AviList's to overwrite.
    if (current.acceptedName && !current.seededName) {
      if (next.acceptedName && next.acceptedName !== current.acceptedName) {
        conflicts.push(
          `${sciName}: site has "${current.acceptedName}", AviList now carries "${next.acceptedName}"`,
        );
      }
      continue;
    }

    if (current.acceptedName !== next.acceptedName) {
      renamedName.push(
        `${sciName}: ${current.acceptedName ?? "(none)"} → ${next.acceptedName ?? "(none)"}`,
      );
    }
  }

  for (const s of existing) {
    if (!incoming.has(s.sciName)) removed.push(s.sciName);
  }

  // Upsert everything except site-coined names, in batches so 11.131 rows do
  // not become 11.131 round-trips.
  const writable = [...incoming.values()].filter((s) => {
    const current = existingBySci.get(s.sciName);
    return !(current?.acceptedName && !current.seededName);
  });

  const BATCH = 500;
  for (let i = 0; i < writable.length; i += BATCH) {
    const batch = writable.slice(i, i + BATCH);
    await db.$transaction(
      batch.map((s) =>
        db.species.upsert({
          where: { sciName: s.sciName },
          create: s,
          update: {
            slug: s.slug,
            acceptedName: s.acceptedName,
            seededName: s.seededName,
          },
        }),
      ),
    );
  }

  const total = await db.species.count();
  const named = await db.species.count({ where: { acceptedName: { not: null } } });

  console.log(`\nSeeded ${total} species — ${named} named, ${total - named} needing a name.`);
  console.log(`  added        ${added.length}`);
  console.log(`  name changed ${renamedName.length}`);
  console.log(`  no longer in AviList ${removed.length}`);
  console.log(`  conflicts    ${conflicts.length}`);

  for (const line of renamedName.slice(0, 10)) console.log(`    ~ ${line}`);
  if (renamedName.length > 10) console.log(`    … and ${renamedName.length - 10} more`);

  for (const line of conflicts) console.log(`    ! ${line}`);

  if (removed.length) {
    console.log(
      `\n${removed.length} species are in the database but not in AviList — split, lumped or renamed upstream.`,
    );
    for (const sciName of removed.slice(0, 10)) console.log(`    - ${sciName}`);
    if (prune) {
      const { count } = await db.species.deleteMany({
        where: { sciName: { in: removed } },
      });
      console.log(`Deleted ${count}. Any suggestions attached to them went too.`);
    } else {
      console.log("Left in place. Re-run with --prune to delete them, but read them first:");
      console.log("names attached to a species that was later split need human review.");
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
