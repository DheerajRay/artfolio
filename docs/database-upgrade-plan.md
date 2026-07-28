# Deferred database and image-storage upgrade

Status: parked while the current Supabase account is at its two-project limit.

The present application remains on its existing local/Vercel Blob storage. This
note records the intended database upgrade so it can resume later without
redesigning the data model from memory.

## Target architecture

- Store original and web-optimized artwork images in object storage.
- Store one structured artwork record per image in Postgres.
- Keep editorial fields as explicit columns where they are queried or sorted:
  title, artwork date, year, medium, description, additional notes, background,
  foreground, created time, and storage path.
- Store classifications in a JSONB field containing discipline, genre, visual
  language, composition, palette, mood, and subjects.
- Store soundtrack title, artist, verified YouTube URL, and rationale together.
- Fetch newest-first in cursor-based pages rather than sending the complete
  collection to the browser.
- Load the next page before the visitor reaches the final few artworks.
- Generate a smaller gallery thumbnail alongside the presentation image.

## Security

- Public visitors receive read-only published artwork records and public image
  URLs.
- Inserts, updates, reanalysis, and deletion stay behind owner authentication.
- Service-role credentials remain server-only.
- Storage deletion and record deletion happen in one controlled server action.

## Migration sequence

1. Create the database project and storage bucket.
2. Add the artwork schema, indexes on artwork date and creation time, and access
   policies.
3. Write an idempotent migration that reads the current Vercel Blob records,
   uploads both image sizes, and preserves artwork IDs and dates.
4. Compare record counts and sample image checksums before switching reads.
5. Add cursor pagination and gallery-thumbnail URLs to `/api/artworks`.
6. Update the full-screen presentation to prefetch nearby images.
7. Keep the old Blob records until the production collection is verified.

No Supabase keys or project identifiers should be committed to this file.
