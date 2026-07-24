import { env } from "cloudflare:workers";

export type ArtworkRecord = {
  id: string;
  title: string;
  description: string;
  critique: string;
  classificationJson: string;
  artworkDate: string;
  year: string;
  medium: string;
  background: string;
  foreground: string;
  objectKey: string;
  mimeType: string;
  originalName: string;
  createdAt: string;
};

export type GalleryBindings = {
  DB: D1Database;
  ARTWORKS: R2Bucket;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL_VISION?: string;
};

export function getBindings(): GalleryBindings {
  return env as unknown as GalleryBindings;
}

export async function ensureArtworksTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      critique TEXT NOT NULL DEFAULT '',
      classification_json TEXT NOT NULL DEFAULT '{}',
      artwork_date TEXT NOT NULL,
      year TEXT NOT NULL,
      medium TEXT NOT NULL,
      background TEXT NOT NULL,
      foreground TEXT NOT NULL,
      object_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `).run();
  const columns = await db.prepare("PRAGMA table_info(artworks)").all<{ name: string }>();
  const columnNames = new Set((columns.results ?? []).map((column) => column.name));
  if (!columnNames.has("critique")) {
    await db.prepare("ALTER TABLE artworks ADD COLUMN critique TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columnNames.has("classification_json")) {
    await db.prepare(
      "ALTER TABLE artworks ADD COLUMN classification_json TEXT NOT NULL DEFAULT '{}'"
    ).run();
  }
  await db.prepare(
    "CREATE INDEX IF NOT EXISTS artworks_created_at_idx ON artworks(created_at DESC)"
  ).run();
}

export function isSupportedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function publicArtwork(record: ArtworkRecord) {
  let classification = {};
  try {
    classification = JSON.parse(record.classificationJson || "{}");
  } catch {
    classification = {};
  }
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    critique: record.critique || "",
    classification,
    artworkDate: record.artworkDate,
    year: record.year,
    medium: record.medium,
    background: record.background,
    foreground: record.foreground,
    createdAt: record.createdAt,
    imageUrl: `/api/artworks/${record.id}/image`,
  };
}
