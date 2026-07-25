import { NextResponse } from "next/server";
import { isAdminRequest } from "../../admin/_auth";
import {
  deleteArtworkImage,
  deleteArtworkRecord,
  getArtworkRecord,
} from "../_shared";

export const runtime = "nodejs";

export async function DELETE(
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

    await deleteArtworkImage(record);
    await deleteArtworkRecord(id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Artwork deletion error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artwork could not be deleted." },
      { status: 500 },
    );
  }
}
