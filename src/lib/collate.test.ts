import assert from "node:assert/strict";
import { test } from "node:test";

// Explicit .ts extensions: this file is run by `node --test`, which resolves
// imports as plain ESM and will not guess an extension.
import { compareNames } from "./collate.ts";
import { slugify } from "./slug.ts";
import { fmt, percent } from "./strings.ts";

test("Þ, Æ and Ö sort after Z, not beside their lookalikes", () => {
  const sorted = ["Örn", "Æðarfugl", "Þröstur", "Akurgæs", "Ugla"].sort(compareNames);
  assert.deepEqual(sorted, ["Akurgæs", "Ugla", "Þröstur", "Æðarfugl", "Örn"]);
});

test("accented vowels are their own letters, filed after the plain one", () => {
  // Á follows all of A, so Álft comes after Andesönd rather than after Alaskagæs.
  const sorted = ["Álft", "Andesönd", "Akurgæs"].sort(compareNames);
  assert.deepEqual(sorted, ["Akurgæs", "Andesönd", "Álft"]);
});

test("Ð follows D and Ý follows Y", () => {
  assert.ok(compareNames("dvergönd", "ðvergönd") < 0);
  assert.ok(compareNames("ýlir", "ylir") > 0);
  assert.ok(compareNames("ýlir", "þröstur") < 0);
});

test("a space sorts before a letter, so a binomial stays with its genus", () => {
  const sorted = ["Anasarcus", "Anas acuta", "Anas crecca"].sort(compareNames);
  assert.deepEqual(sorted, ["Anas acuta", "Anas crecca", "Anasarcus"]);
});

test("comparison is case-insensitive on the letter, and never returns 0 for different strings", () => {
  assert.equal(compareNames("Álft", "álft") !== 0, true);
  assert.equal(compareNames("álft", "álft"), 0);
});

test("scientific names slugify to hyphenated lowercase", () => {
  assert.equal(slugify("Grallaria ridgelyi"), "grallaria-ridgelyi");
  assert.equal(slugify("Anseriformes"), "anseriformes");
});

test("numbers group with a full stop and take a comma decimal", () => {
  assert.equal(fmt(11131), "11.131");
  assert.equal(fmt(842), "842");
  assert.equal(fmt(1000000), "1.000.000");
  assert.equal(percent(2729, 11131), "24,5");
});
