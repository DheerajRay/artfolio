import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("keeps mock artworks while adding the upload workflow", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /const mockArtworks/);
  assert.match(page, /When the Sun Forgets/);
  assert.match(page, /Add artwork/);
  assert.match(page, /Review with OpenAI/);
  assert.match(page, /\/api\/artworks\/analyze/);
  assert.match(page, /\/api\/artworks/);
});

test("keeps OpenAI credentials server-side", async () => {
  const [page, analyzeRoute] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/artworks/analyze/route.ts"),
  ]);

  assert.doesNotMatch(page, /OPENAI_API_KEY/);
  assert.match(analyzeRoute, /bindings\.OPENAI_API_KEY/);
  assert.match(analyzeRoute, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(analyzeRoute, /type:\s*"input_image"/);
  assert.match(analyzeRoute, /type:\s*"json_schema"/);
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
  assert.match(artworkRoute, /ARTWORKS\.put/);
  assert.match(artworkRoute, /INSERT INTO artworks/);
});
