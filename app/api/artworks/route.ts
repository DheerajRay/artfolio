import { NextResponse } from "next/server";
import {
  ArtworkRecord,
  ensureArtworksTable,
  getBindings,
  isHexColor,
  isSupportedImage,
  publicArtwork,
} from "./_shared";

export const runtime = "edge";

export async function GET() {
  try {
    const { DB } = getBindings();
    await ensureArtworksTable(DB);
    const result = await DB.prepare(`
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
    `).all<ArtworkRecord>();

    return NextResponse.json({ artworks: (result.results ?? []).map(publicArtwork) });
  } catch (error) {
    console.error("Artwork list error", error);
    return NextResponse.json({ artworks: [], error: "Stored artworks are unavailable." });
  }
}

export async function POST(request: Request) {
  let objectKey = "";
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const additionalNotes = String(formData.get("additionalNotes") || "").trim();
    const classificationJson = String(formData.get("classification") || "{}").trim();
    const artworkDate = String(formData.get("artworkDate") || "").trim();
    const medium = String(formData.get("medium") || "Mixed media").trim();
    const background = String(formData.get("background") || "").trim();
    const foreground = String(formData.get("foreground") || "").trim();

    if (!(image instanceof File) || !isSupportedImage(image)) {
      return NextResponse.json({ error: "Choose a JPEG, PNG, or WebP image." }, { status: 400 });
    }
    if (image.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "The image must be 15 MB or smaller." }, { status: 400 });
    }
    if (!title || title.length > 120 || !description || description.length > 1200) {
      return NextResponse.json({ error: "Add a title and a concise description." }, { status: 400 });
    }
    if (!additionalNotes || additionalNotes.length > 1800) {
      return NextResponse.json({ error: "Add concise additional notes." }, { status: 400 });
    }
    try {
      JSON.parse(classificationJson);
    } catch {
      return NextResponse.json({ error: "The artwork classification is invalid." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(artworkDate)) {
      return NextResponse.json({ error: "Add a valid artwork date." }, { status: 400 });
    }
    if (!isHexColor(background) || !["#171612", "#F1EEE6"].includes(foreground)) {
      return NextResponse.json({ error: "The artwork color settings are invalid." }, { status: 400 });
    }

    const { DB, ARTWORKS } = getBindings();
    await ensureArtworksTable(DB);

    const id = crypto.randomUUID();
    const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
    objectKey = `artworks/${id}.${extension}`;
    const createdAt = new Date().toISOString();
    const year = artworkDate.slice(0, 4);

    await ARTWORKS.put(objectKey, image.stream(), {
      httpMetadata: { contentType: image.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: image.name },
    });

    await DB.prepare(`
      INSERT INTO artworks (
        id, title, description, critique, classification_json, artwork_date, year, medium, background,
        foreground, object_key, mime_type, original_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      title,
      description,
      additionalNotes,
      classificationJson,
      artworkDate,
      year,
      medium || "Mixed media",
      background,
      foreground,
      objectKey,
      image.type,
      image.name,
      createdAt,
    ).run();

    return NextResponse.json({
      artwork: publicArtwork({
        id,
        title,
        description,
        critique: additionalNotes,
        classificationJson,
        artworkDate,
        year,
        medium: medium || "Mixed media",
        background,
        foreground,
        objectKey,
        mimeType: image.type,
        originalName: image.name,
        createdAt,
      }),
    }, { status: 201 });
  } catch (error) {
    console.error("Artwork save error", error);
    if (objectKey) {
      try {
        await getBindings().ARTWORKS.delete(objectKey);
      } catch (cleanupError) {
        console.error("Artwork upload cleanup failed", cleanupError);
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artwork could not be saved." },
      { status: 500 },
    );
  }
}
