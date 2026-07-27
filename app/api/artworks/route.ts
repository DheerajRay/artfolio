import { NextResponse } from "next/server";
import { isAdminRequest } from "../admin/_auth";
import {
  ArtworkRecord,
  deleteArtworkImage,
  isHexColor,
  isSupportedImage,
  listArtworkRecords,
  publicArtwork,
  saveArtworkRecord,
  storeArtworkImage,
} from "./_shared";
import { youtubeVideoId } from "../../artwork-soundtracks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const records = await listArtworkRecords();
    records.sort((a, b) => {
      const dateOrder = b.artworkDate.localeCompare(a.artworkDate);
      return dateOrder || b.createdAt.localeCompare(a.createdAt);
    });
    return NextResponse.json({ artworks: records.map(publicArtwork) });
  } catch (error) {
    console.error("Artwork list error", error);
    return NextResponse.json({ artworks: [], error: "Stored artworks are unavailable." });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Owner access is required." }, { status: 401 });
  }
  let uploadedRecord: ArtworkRecord | null = null;
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
    const soundtrackTitle = String(formData.get("soundtrackTitle") || "").trim();
    const soundtrackArtist = String(formData.get("soundtrackArtist") || "").trim();
    const soundtrackYoutubeUrl = String(formData.get("soundtrackYoutubeUrl") || "").trim();
    const soundtrackRationale = String(formData.get("soundtrackRationale") || "").trim();

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
    if (!soundtrackTitle || soundtrackTitle.length > 160 || !soundtrackArtist || soundtrackArtist.length > 160) {
      return NextResponse.json({ error: "Add a soundtrack title and artist." }, { status: 400 });
    }
    if (!soundtrackYoutubeUrl || !youtubeVideoId(soundtrackYoutubeUrl)) {
      return NextResponse.json({ error: "Add a valid YouTube video link for the suggested soundtrack." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    uploadedRecord = {
      id,
      title,
      description,
      critique: additionalNotes,
      classificationJson,
      artworkDate,
      year: artworkDate.slice(0, 4),
      medium: medium || "Mixed media",
      background,
      foreground,
      objectKey: await storeArtworkImage(image, id),
      mimeType: image.type,
      originalName: image.name,
      createdAt,
      soundtrackTitle,
      soundtrackArtist,
      soundtrackYoutubeUrl,
      soundtrackRationale,
    };
    await saveArtworkRecord(uploadedRecord);

    return NextResponse.json({ artwork: publicArtwork(uploadedRecord) }, { status: 201 });
  } catch (error) {
    console.error("Artwork save error", error);
    if (uploadedRecord) {
      try {
        await deleteArtworkImage(uploadedRecord);
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
