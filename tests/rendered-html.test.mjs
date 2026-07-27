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
  assert.match(page, /classification-index/);
  assert.match(page, /classification-tags/);
  assert.match(page, /detailsSection/);
  assert.match(page, /Review with OpenAI/);
  assert.match(page, /prepareArtworkImage/);
  assert.match(page, /MAX_API_IMAGE_BYTES/);
  assert.match(page, /encodeCanvasImage/);
  assert.match(page, /"image\/webp", "image\/jpeg"/);
  assert.match(page, /\/api\/artworks\/analyze/);
  assert.match(page, /\/api\/artworks/);
  assert.match(page, /Delete artwork/);
  assert.doesNotMatch(page, /spotlight/i);
  assert.match(page, /Start fullscreen slideshow/);
  assert.match(page, /requestFullscreen/);
  assert.match(page, /SLIDESHOW_DELAY_MS = 7_000/);
  assert.match(page, /fullscreenchange/);
  assert.match(page, /slideshow-stage/);
  assert.match(page, /slideshow-title/);
  assert.match(page, /slideshow-description/);
});

test("keeps mobile PWA dialogs inside safe areas", async () => {
  const [page, styles] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(styles, /\.editorial-panel > header[\s\S]*safe-area-inset-top/);
  assert.match(styles, /\.dialog-header[\s\S]*safe-area-inset-top/);
  assert.match(styles, /\.dialog-panel[\s\S]*100dvh/);
  assert.match(styles, /\.field input,[\s\S]*font-size:\s*16px/);
  assert.match(page, /ai-review-loading/);
  assert.match(page, /role="status"/);
});

test("declares Artfolio install metadata and icons", async () => {
  const [layout, manifest] = await Promise.all([
    source("app/layout.tsx"),
    source("public/manifest.webmanifest"),
  ]);
  const installManifest = JSON.parse(manifest);

  assert.match(layout, /applicationName:\s*"Artfolio"/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.equal(installManifest.name, "Artfolio");
  assert.equal(installManifest.short_name, "Artfolio");
  assert.deepEqual(
    installManifest.icons.map(({ sizes, purpose }) => ({ sizes, purpose })),
    [
      { sizes: "192x192", purpose: "any" },
      { sizes: "512x512", purpose: "any maskable" },
    ],
  );
});

test("keeps structured OpenAI additional-note generation server-side", async () => {
  const [page, analysisService] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/artworks/_analysis.ts"),
  ]);

  assert.doesNotMatch(page, /OPENAI_API_KEY/);
  assert.match(analysisService, /process\.env\.OPENAI_API_KEY/);
  assert.match(analysisService, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(analysisService, /type:\s*"input_image"/);
  assert.match(analysisService, /type:\s*"json_schema"/);
  assert.match(analysisService, /additionalNotes/);
  assert.match(analysisService, /classification/);
});

test("declares persistent image and metadata storage", async () => {
  const [storage, artworkRoute, deleteRoute] = await Promise.all([
    source("app/api/artworks/_shared.ts"),
    source("app/api/artworks/route.ts"),
    source("app/api/artworks/[id]/route.ts"),
  ]);

  assert.match(storage, /@vercel\/blob/);
  assert.match(storage, /BLOB_READ_WRITE_TOKEN/);
  assert.match(storage, /LOCAL_DATA_ROOT/);
  assert.match(artworkRoute, /storeArtworkImage/);
  assert.match(artworkRoute, /saveArtworkRecord/);
  assert.match(deleteRoute, /deleteArtworkImage/);
  assert.match(deleteRoute, /deleteArtworkRecord/);
});

test("protects portfolio mutations behind owner access", async () => {
  const [page, auth, session, artworkRoute] = await Promise.all([
    source("app/page.tsx"),
    source("app/api/admin/_auth.ts"),
    source("app/api/admin/session/route.ts"),
    source("app/api/artworks/route.ts"),
  ]);

  assert.match(page, /Owner access/);
  assert.match(page, /\/api\/admin\/session/);
  assert.match(auth, /GALLERY_ADMIN_PASSWORD/);
  assert.match(auth, /timingSafeEqual/);
  assert.match(session, /httpOnly:\s*true/);
  assert.match(artworkRoute, /isAdminRequest/);
});
