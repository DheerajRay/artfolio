import { NextResponse } from "next/server";
import { analyzeArtworkImage } from "../../_analysis";
import {
  ArtworkRecord,
  ensureArtworksTable,
  getBindings,
  publicArtwork,
} from "../../_shared";

export const runtime = "edge";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    }

    const bindings = getBindings();
    await ensureArtworksTable(bindings.DB);
    const record = await bindings.DB.prepare(`
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
      WHERE id = ?
    `).bind(id).first<ArtworkRecord>();

    if (!record) {
      return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    }

    const object = await bindings.ARTWORKS.get(record.objectKey);
    if (!object) {
      return NextResponse.json({ error: "Artwork image not found." }, { status: 404 });
    }

    const analysis = await analyzeArtworkImage({
      bindings,
      imageBytes: await object.arrayBuffer(),
      mimeType: record.mimeType,
      artworkDate: record.artworkDate,
      medium: record.medium,
      currentTitle: record.title,
    });
    const classificationJson = JSON.stringify(analysis.classification);

    await bindings.DB.prepare(`
      UPDATE artworks
      SET
        title = ?,
        description = ?,
        critique = ?,
        classification_json = ?,
        background = ?,
        foreground = ?
      WHERE id = ?
    `).bind(
      analysis.title,
      analysis.description,
      analysis.additionalNotes,
      classificationJson,
      analysis.background,
      analysis.foreground,
      id,
    ).run();

    return NextResponse.json({
      artwork: publicArtwork({
        ...record,
        title: analysis.title,
        description: analysis.description,
        critique: analysis.additionalNotes,
        classificationJson,
        background: analysis.background,
        foreground: analysis.foreground,
      }),
    });
  } catch (error) {
    console.error("Artwork reanalysis error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artwork reanalysis failed." },
      { status: 500 },
    );
  }
}
