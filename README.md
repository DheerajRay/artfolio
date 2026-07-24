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
2. OpenAI proposes a title, description, and page colors. Review or edit them,
   then publish the artwork to the local presentation.

Source images up to 15 MB are automatically prepared as a high-resolution WebP
for reliable review and web delivery.

Uploaded metadata is stored in the `DB` D1 binding and image files in the
`ARTWORKS` R2 binding.

## Checks

```bash
npm run lint
npm test
npm run db:generate
```
