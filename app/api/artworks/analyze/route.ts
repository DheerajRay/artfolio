import { NextResponse } from "next/server";
import { analyzeArtworkImage } from "../_analysis";
import { getBindings, isSupportedImage } from "../_shared";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    const artworkDate = String(formData.get("artworkDate") || "").trim();
    const medium = String(formData.get("medium") || "Mixed media").trim();

    if (!(image instanceof File) || !isSupportedImage(image)) {
      return NextResponse.json(
        { error: "Choose a JPEG, PNG, or WebP artwork image." },
        { status: 400 },
      );
    }
    if (image.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "The image must be 15 MB or smaller." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(artworkDate)) {
      return NextResponse.json({ error: "Add a valid artwork date." }, { status: 400 });
    }

    const analysis = await analyzeArtworkImage({
      bindings: getBindings(),
      imageBytes: await image.arrayBuffer(),
      mimeType: image.type,
      artworkDate,
      medium,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Artwork analysis error", error);
    const message = error instanceof Error ? error.message : "Artwork analysis failed.";
    return NextResponse.json(
      { error: message },
      { status: message.includes("OPENAI_API_KEY") ? 503 : 500 },
    );
  }
}
