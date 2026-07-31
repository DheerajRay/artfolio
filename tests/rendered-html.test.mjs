import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("shows only uploaded artworks in date order", async () => {
  const [page, styles] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
  ]);

  assert.doesNotMatch(page, /mockArtworks|When the Sun Forgets/);
  assert.match(page, /sortArtworksByDate/);
  assert.match(page, /b\.artworkDate/);
  assert.match(page, /No artworks yet/);
  assert.match(page, /EditorialLoadingState/);
  assert.match(page, /Assembling the collection/);
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
  assert.match(styles, /\.magnifier-icon::before[\s\S]*1px 6px no-repeat/);
  assert.match(styles, /\.search-toggle > span[\s\S]*border-radius:\s*50%/);
  assert.match(page, /requestFullscreen/);
  assert.match(page, /SLIDESHOW_DELAY_MS = 5_000/);
  assert.match(page, /createShuffledIndices/);
  assert.match(page, /Math\.random\(\)/);
  assert.match(page, /slideshowOrderRef/);
  assert.match(page, /fullscreenchange/);
  assert.match(page, /slideshow-stage/);
  assert.match(styles, /--info-rail-width:\s*clamp\(280px, 24vw, 390px\)/);
  assert.match(styles, /\.presentation\s*\{[\s\S]*--info-rail-width:\s*clamp\(280px, 24vw, 390px\)/);
  assert.match(styles, /\.magnifier-canvas[\s\S]*width:\s*100vw[\s\S]*height:\s*100vh/);
  assert.match(styles, /\.slideshow-stage \.artwork-visual\s*\{\s*inset:\s*4\.5% calc\(var\(--info-rail-width\) \+ 38px\) 4\.5% max\(4\.5%, 28px\)/);
  assert.match(styles, /\.artwork-description[\s\S]*width:\s*var\(--info-rail-width\)/);
  assert.match(styles, /\.slideshow-stage \.artwork-visual\s*\{\s*inset:\s*17% 1% 29%/);
  assert.match(page, /slideshow-title/);
  assert.match(page, /slideshow-description/);
  assert.match(page, /slideshow-meta/);
  assert.match(page, /slideshowArtwork\.classification\?\.genre/);
  assert.match(page, /className="slide-top-right slideshow-header"/);
  assert.doesNotMatch(page, /Stop slideshow and exit fullscreen/);
  assert.doesNotMatch(page, /document\.exitFullscreen\(\)/);
  assert.match(page, /artwork\.id === pendingArtworkId/);
  assert.match(page, /slideRefs\.current\[targetIndex\]\?\.scrollIntoView/);
  assert.doesNotMatch(page, /slideRefs\.current\[0\]\?\.scrollIntoView/);
  assert.match(page, /ArtworkSoundtrackPlayer/);
  assert.match(page, /PRESENTATION_IMAGE_BUFFER = 2/);
  assert.match(page, /Math\.abs\(index - current\) <= PRESENTATION_IMAGE_BUFFER/);
  assert.match(page, /loadImage=\{Math\.abs/);
  assert.match(page, /loading=\{priority \? "eager" : "lazy"\}/);
  assert.match(page, /viewMode === "magnify" && currentArtwork/);
  assert.match(page, /decoding="async"/);
  assert.match(page, /fetchPriority=\{visibleIndex < 6 \? "auto" : "low"\}/);
  assert.match(styles, /\.artwork-image\.is-deferred\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(page, /touchDistance/);
  assert.match(page, /constrainPan/);
  assert.match(page, /onTouchStart=\{startImageGesture\}/);
  assert.match(page, /onTouchMove=\{moveImageGesture\}/);
  assert.match(page, /Math\.min\(3\.5,/);
  assert.match(styles, /\.artwork-image\s*\{[\s\S]*touch-action:\s*pan-y/);
  assert.match(styles, /\.artwork-image\.is-image-zoomed\s*\{\s*touch-action:\s*none/);
  assert.doesNotMatch(page, /Scroll to next work/);
});

test("adds curated and AI-suggested artwork soundtracks", async () => {
  const [page, styles, player, catalog, analysisService, artworkRoute] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
    source("app/artwork-soundtrack-player.tsx"),
    source("app/artwork-soundtracks.ts"),
    source("app/api/artworks/_analysis.ts"),
    source("app/api/artworks/route.ts"),
  ]);

  assert.equal((catalog.match(/youtubeUrl:\s*"https:\/\/www\.youtube\.com\/watch\?v=/g) || []).length, 32);
  assert.match(player, /youtube\.com\/iframe_api/);
  assert.match(player, /seekTo/);
  assert.match(player, /soundtrack-title-viewport/);
  assert.match(player, /soundtrack-video/);
  assert.match(styles, /\.soundtrack-video iframe,[\s\S]*filter:\s*grayscale\(1\)/);
  assert.match(page, /Suggested song/);
  assert.match(page, /YouTube video link/);
  assert.match(page, /Open selected video/);
  assert.match(page, /Choose another on YouTube/);
  assert.match(analysisService, /Suggest one real, released song/);
  assert.match(analysisService, /type: "web_search"/);
  assert.match(analysisService, /allowed_domains: \["youtube\.com"\]/);
  assert.match(analysisService, /verifyYouTubeUrl/);
  assert.match(analysisService, /playableInEmbed/);
  assert.match(artworkRoute, /soundtrackYoutubeUrl/);
  assert.match(artworkRoute, /Add a valid YouTube video link for the suggested soundtrack/);
});

test("provides a public, irregular gallery index", async () => {
  const [page, styles, databasePlan] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
    source("docs/database-upgrade-plan.md"),
  ]);

  assert.match(page, /galleryOpen/);
  assert.match(page, /Open gallery view/);
  assert.match(page, /className="gallery-index-grid"/);
  assert.match(page, /GALLERY_DESKTOP_SPANS/);
  assert.match(page, /GALLERY_MOBILE_SPANS/);
  assert.match(page, /GALLERY_HOVER_TILTS/);
  assert.match(page, /selectGalleryArtwork/);
  assert.match(page, /galleryCardRefs\.current\[current\]\?\.scrollIntoView/);
  assert.match(page, /block: "center"/);
  assert.match(page, /aria-current=\{index === current/);
  assert.match(page, /slideRefs\.current\[index\]\?\.scrollIntoView/);
  assert.match(page, /loading=\{visibleIndex < 6 \? "eager" : "lazy"\}/);
  assert.match(styles, /grid-template-columns:\s*repeat\(12,/);
  assert.match(styles, /grid-auto-rows:\s*4px/);
  assert.match(styles, /grid-auto-flow:\s*dense/);
  assert.match(styles, /grid-column:\s*span var\(--gallery-span\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(6,/);
  assert.match(styles, /\.gallery-card-image img[\s\S]*height:\s*auto/);
  assert.match(page, /useLayoutEffect/);
  assert.match(page, /new ResizeObserver\(layoutGalleryCards\)/);
  assert.match(page, /card\.style\.gridRowEnd = `span \$\{rowSpan\}`/);
  assert.match(page, /Math\.ceil\(\(cardHeight \+ rowGap\) \/ \(rowHeight \+ rowGap\)\)/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(styles, /rotate\(var\(--gallery-hover-tilt\)\)/);
  assert.match(styles, /\.gallery-card-image::after[\s\S]*border:\s*1px solid currentColor/);
  assert.match(styles, /\.gallery-card:hover \.gallery-card-caption i[\s\S]*rotate\(-12deg\)/);
  assert.doesNotMatch(
    styles.match(/\.gallery-card-image::after\s*\{[\s\S]*?\}/)?.[0] || "",
    /linear-gradient/,
  );
  assert.match(databasePlan, /Status: parked/);
  assert.match(databasePlan, /cursor-based pages/);
});

test("searches artwork metadata in both portfolio views", async () => {
  const [page, styles] = await Promise.all([
    source("app/page.tsx"),
    source("app/globals.css"),
  ]);

  assert.match(page, /artworkMatchesSearch/);
  assert.match(page, /classification\?\.subjects/);
  assert.match(page, /classification\?\.palette/);
  assert.match(page, /classification\?\.visualLanguage/);
  assert.match(page, /tokens\.every/);
  assert.match(page, /className="presentation-search"/);
  assert.match(page, /className="gallery-index-search"/);
  assert.match(page, /Search title, character, color, style/);
  assert.match(page, /searchMatches\.map/);
  assert.match(page, /selectArtworkFromSearch/);
  assert.match(styles, /\.presentation-search/);
  assert.match(styles, /\.gallery-index-search/);
  assert.match(styles, /\.gallery-empty-results/);
  assert.match(styles, /\.gallery-empty-results > strong[\s\S]*var\(--font-sans\)/);
  assert.doesNotMatch(styles, /\.gallery-empty-results[\s\S]{0,180}font:\s*italic/);
  assert.match(styles, /\.collection-loading\.ai-review-loading/);
  assert.match(styles, /\.artwork-search-field input[\s\S]*font-size:\s*16px/);
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
  assert.match(analysisService, /MAX_ANALYSIS_ATTEMPTS = 2/);
  assert.match(analysisService, /MAX_ANALYSIS_OUTPUT_TOKENS = 4_000/);
  assert.match(analysisService, /result\.status === "incomplete"/);
  assert.match(analysisService, /The artwork review was incomplete\. Please try again\./);
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
