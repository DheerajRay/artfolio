import { NextResponse } from "next/server";
import { ensureArtworksTable, getBindings } from "../_shared";

export const runtime = "edge";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    }

    const { DB, ARTWORKS } = getBindings();
    await ensureArtworksTable(DB);
    const record = await DB.prepare(
      "SELECT object_key AS objectKey FROM artworks WHERE id = ?"
    ).bind(id).first<{ objectKey: string }>();

    if (!record) {
      return NextResponse.json({ error: "Artwork not found." }, { status: 404 });
    }

    await ARTWORKS.delete(record.objectKey);
    await DB.prepare("DELETE FROM artworks WHERE id = ?").bind(id).run();

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Artwork deletion error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artwork could not be deleted." },
      { status: 500 },
    );
  }
}
