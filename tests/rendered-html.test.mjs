import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("shows only uploaded artworks in date order", async () => {
  const page = await source("app/page.tsx");

  assert.doesNotMatch(page, /mockArtworks|When the Sun Forgets/);
  assert.match(page, /sortArtworksByDate/);
  assert.match(page, /b\.artworkDate/);
  assert.match(page, /No artworks yet/);
  assert.match(page, /Add artwork/);
  assert.match(page, /editorial-mobile-nav/);
  assert.match(page, /detailsSection/);
  assert.match(page, /Review with OpenAI/);
  assert.match(page, /prepareArtworkImage/);
  assert.match(page, /MAX_API_IMAGE_BYTES/);
  assert.match(page, /\/api\/artworks\/analyze/);
  assert.match(page, /\/api\/artworks/);
});

test("keeps structured OpenAI additional-note generation server-side", async () => {
  const [page, analysisService] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/artworks/_analysis.ts"),
  ]);

  assert.doesNotMatch(page, /OPENAI_API_KEY/);
  assert.match(analysisService, /bindings\.OPENAI_API_KEY/);
  assert.match(analysisService, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(analysisService, /type:\s*"input_image"/);
  assert.match(analysisService, /type:\s*"json_schema"/);
  assert.match(analysisService, /additionalNotes/);
  assert.match(analysisService, /classification/);
});

test("declares persistent image and metadata storage", async () => {
  const [hosting, schema, artworkRoute] = await Promise.all([
    source(".openai/hosting.json"),
    source("db/schema.ts"),
    source("app/api/artworks/route.ts"),
  ]);

  assert.match(hosting, /"d1":\s*"DB"/);
  assert.match(hosting, /"r2":\s*"ARTWORKS"/);
  assert.match(schema, /sqliteTable\("artworks"/);
  assert.match(schema, /classificationJson/);
  assert.match(artworkRoute, /ARTWORKS\.put/);
  assert.match(artworkRoute, /INSERT INTO artworks/);
});
