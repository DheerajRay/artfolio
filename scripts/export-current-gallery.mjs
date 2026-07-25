import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const d1Path = path.join(
  process.cwd(),
  ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite",
);
const r2MetadataPath = path.join(
  process.cwd(),
  ".wrangler/state/v3/r2/miniflare-R2BucketObject/49e6826fd41b4990fd0dd7b3ba19a3021a358ffb618ea1ab8f4454a592996ae7.sqlite",
);
const r2BlobRoot = path.join(
  process.cwd(),
  ".wrangler/state/v3/r2/site-creator-r2/blobs",
);
const dataRoot = path.join(process.cwd(), ".data");
const imageRoot = path.join(dataRoot, "artworks", "images");

const d1 = new DatabaseSync(d1Path, { readOnly: true });
const r2 = new DatabaseSync(r2MetadataPath, { readOnly: true });

const records = d1.prepare(`
  SELECT
    id,
    title,
    description,
    critique,
    classification_json AS classificationJson,
    artwork_date AS artworkDate,
    year,
    medium,
    background,
    foreground,
    object_key AS objectKey,
    mime_type AS mimeType,
    original_name AS originalName,
    created_at AS createdAt
  FROM artworks
  ORDER BY artwork_date DESC, created_at DESC
`).all();
const objects = new Map(
  r2.prepare("SELECT key, blob_id AS blobId FROM _mf_objects").all()
    .map((row) => [row.key, row.blobId]),
);

await mkdir(imageRoot, { recursive: true });

for (const record of records) {
  const blobId = objects.get(record.objectKey);
  if (!blobId) throw new Error(`Missing stored image for ${record.title}.`);
  const extension = path.extname(record.objectKey) || ".webp";
  const localObjectKey = `artworks/images/${record.id}${extension}`;
  await copyFile(path.join(r2BlobRoot, blobId), path.join(dataRoot, ...localObjectKey.split("/")));
  record.objectKey = localObjectKey;
}

await writeFile(
  path.join(dataRoot, "artworks.json"),
  `${JSON.stringify(records, null, 2)}\n`,
  "utf8",
);

d1.close();
r2.close();
console.log(`Exported ${records.length} artworks to ${dataRoot}.`);
