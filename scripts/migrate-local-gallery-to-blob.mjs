import { put } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import path from "node:path";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is required. Pull the Vercel project environment first.");
}

const dataRoot = path.join(process.cwd(), ".data");
const records = JSON.parse(await readFile(path.join(dataRoot, "artworks.json"), "utf8"));

for (const record of records) {
  const imageBytes = await readFile(path.join(dataRoot, ...record.objectKey.split("/")));
  const imageBlob = await put(record.objectKey, imageBytes, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: record.mimeType,
    cacheControlMaxAge: 31536000,
  });
  const migratedRecord = { ...record, objectKey: imageBlob.url };
  await put(`artworks/records/${record.id}.json`, JSON.stringify(migratedRecord), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
  console.log(`Migrated ${record.title}`);
}

console.log(`Migrated ${records.length} artworks to Vercel Blob.`);
