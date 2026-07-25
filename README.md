# Dheeraj Ray — Artwork Portfolio

A full-screen, scroll-snapped portfolio PWA. Uploaded artworks are presented
newest-first by artwork date, with each slide adapting to the artwork's
background color.

## Local setup

Requires Node.js `>=22.13.0`.

1. Copy `.env.local.example` to `.env.local`.
2. Add the server-side `OPENAI_API_KEY` value. Never expose this key in client
   code.
3. Start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The plus button opens a two-step workflow:

1. Import a JPEG, PNG, or WebP and add its date and optional medium.
2. OpenAI proposes a title, portfolio description, professional additional notes,
   structured classification, and page colors. Review or edit them, then
   publish the artwork to the local presentation.

Each published slide keeps the description compact. Its “Additional notes” action
opens the complete editorial record: discipline, genre, visual language,
composition, palette, mood, and visible subjects.

Source images up to 15 MB are automatically prepared as a high-resolution WebP
for reliable review and web delivery.

Local development stores artwork records and images in the ignored `.data`
directory. Production uses Vercel Blob for both image files and artwork records.

## Vercel deployment

Import the GitHub repository into Vercel as a Next.js project and connect a
public Vercel Blob store. Configure these server-side variables for Production,
Preview, and Development:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_VISION` (optional; defaults to `gpt-5.6-sol`)
- `BLOB_READ_WRITE_TOKEN` (automatically added when Blob is connected)
- `GALLERY_ADMIN_PASSWORD`

The public portfolio remains available to everyone. Add, review, and delete
controls are protected by the owner password and an HTTP-only session cookie.

To migrate an existing local collection after linking the Vercel project:

```bash
vercel env pull .env.local
npm run migrate:vercel
```

## Checks

```bash
npm run lint
npm test
```
