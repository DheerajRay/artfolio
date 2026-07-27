import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../admin/_auth";
import { analyzeArtworkImage } from "../../_analysis";
import {
  getArtworkRecord,
  publicArtwork,
  readArtworkImage,
  saveArtworkRecord,
} from "../../_shared";
import { CURATED_SOUNDTRACKS } from "../../../../artwork-soundtracks";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Owner access is required." }, { status: 401 });
  }
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    }

    const record = await getArtworkRecord(id);
    if (!record) {
      return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    }

    const image = await readArtworkImage(record);
    if (!image) {
      return NextResponse.json({ error: "Artwork image not found." }, { status: 404 });
    }

    const analysis = await analyzeArtworkImage({
      imageBytes: image.body instanceof ArrayBuffer
        ? image.body
        : image.body.buffer.slice(image.body.byteOffset, image.body.byteOffset + image.body.byteLength),
      mimeType: image.contentType,
      artworkDate: record.artworkDate,
      medium: record.medium,
      currentTitle: record.title,
    });
    const curatedSoundtrack = CURATED_SOUNDTRACKS[record.title];
    const updated = {
      ...record,
      title: analysis.title,
      description: analysis.description,
      critique: analysis.additionalNotes,
      classificationJson: JSON.stringify(analysis.classification),
      background: analysis.background,
      foreground: analysis.foreground,
      soundtrackTitle: record.soundtrackTitle || curatedSoundtrack?.title || analysis.soundtrack.title,
      soundtrackArtist: record.soundtrackArtist || curatedSoundtrack?.artist || analysis.soundtrack.artist,
      soundtrackYoutubeUrl: record.soundtrackYoutubeUrl || curatedSoundtrack?.youtubeUrl || analysis.soundtrack.youtubeUrl,
      soundtrackRationale: record.soundtrackRationale || curatedSoundtrack?.rationale || analysis.soundtrack.rationale,
    };
    await saveArtworkRecord(updated);

    return NextResponse.json({ artwork: publicArtwork(updated) });
  } catch (error) {
    console.error("Artwork reanalysis error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artwork reanalysis failed." },
      { status: 500 },
    );
  }
}
