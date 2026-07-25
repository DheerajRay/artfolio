import { del, list, put } from "@vercel/blob";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

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

const RECORD_PREFIX = "artworks/records/";
const LOCAL_DATA_ROOT = path.join(process.cwd(), ".data");
const LOCAL_RECORDS_PATH = path.join(LOCAL_DATA_ROOT, "artworks.json");

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

async function readLocalRecords(): Promise<ArtworkRecord[]> {
  try {
    return JSON.parse(await readFile(LOCAL_RECORDS_PATH, "utf8")) as ArtworkRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeLocalRecords(records: ArtworkRecord[]) {
  await mkdir(LOCAL_DATA_ROOT, { recursive: true });
  await writeFile(LOCAL_RECORDS_PATH, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

export async function listArtworkRecords(): Promise<ArtworkRecord[]> {
  const token = blobToken();
  if (!token) return readLocalRecords();

  const result = await list({ prefix: RECORD_PREFIX, limit: 1000, token });
  return Promise.all(
    result.blobs.map(async (blob) => {
      const response = await fetch(blob.url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not read artwork record ${blob.pathname}.`);
      return response.json() as Promise<ArtworkRecord>;
    }),
  );
}

export async function getArtworkRecord(id: string): Promise<ArtworkRecord | null> {
  const records = await listArtworkRecords();
  return records.find((record) => record.id === id) ?? null;
}

export async function saveArtworkRecord(record: ArtworkRecord) {
  const token = blobToken();
  if (token) {
    await put(`${RECORD_PREFIX}${record.id}.json`, JSON.stringify(record), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token,
    });
    return;
  }

  const records = await readLocalRecords();
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) records[index] = record;
  else records.push(record);
  await writeLocalRecords(records);
}

export async function deleteArtworkRecord(id: string) {
  const token = blobToken();
  if (token) {
    await del(`${RECORD_PREFIX}${id}.json`, { token });
    return;
  }

  const records = await readLocalRecords();
  await writeLocalRecords(records.filter((record) => record.id !== id));
}

export async function storeArtworkImage(image: File, id: string) {
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `artworks/images/${id}.${extension}`;
  const token = blobToken();

  if (token) {
    const blob = await put(objectKey, image, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: image.type,
      cacheControlMaxAge: 31536000,
      token,
    });
    return blob.url;
  }

  const destination = path.join(LOCAL_DATA_ROOT, ...objectKey.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, Buffer.from(await image.arrayBuffer()));
  return objectKey;
}

export async function readArtworkImage(record: ArtworkRecord) {
  if (/^https:\/\//.test(record.objectKey)) {
    const response = await fetch(record.objectKey, { cache: "no-store" });
    if (!response.ok) return null;
    return {
      body: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") || record.mimeType,
    };
  }

  try {
    return {
      body: await readFile(path.join(LOCAL_DATA_ROOT, ...record.objectKey.split("/"))),
      contentType: record.mimeType,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteArtworkImage(record: ArtworkRecord) {
  const token = blobToken();
  if (token && /^https:\/\//.test(record.objectKey)) {
    await del(record.objectKey, { token });
    return;
  }
  if (!/^https:\/\//.test(record.objectKey)) {
    try {
      await unlink(path.join(LOCAL_DATA_ROOT, ...record.objectKey.split("/")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
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
    additionalNotes: record.critique || "",
    classification,
    artworkDate: record.artworkDate,
    year: record.year,
    medium: record.medium,
    background: record.background,
    foreground: record.foreground,
    createdAt: record.createdAt,
    imageUrl: /^https:\/\//.test(record.objectKey)
      ? record.objectKey
      : `/api/artworks/${record.id}/image`,
  };
}
