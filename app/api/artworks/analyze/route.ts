import { NextResponse } from "next/server";
import { getBindings, isSupportedImage } from "../_shared";

export const runtime = "edge";

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "background", "foreground"],
  properties: {
    title: {
      type: "string",
      description: "An evocative original artwork title of two to six words.",
    },
    description: {
      type: "string",
      description: "A concise visual description of no more than 60 words.",
    },
    background: {
      type: "string",
      description: "A six-digit hex color matching the image perimeter or dominant background.",
      pattern: "^#[0-9A-Fa-f]{6}$",
    },
    foreground: {
      type: "string",
      enum: ["#171612", "#F1EEE6"],
      description: "The more legible text color against background.",
    },
  },
};

type OpenAIResponse = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
      refusal?: unknown;
    }>;
  }>;
};

function extractOutputText(response: OpenAIResponse): string {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
      if (content?.type === "refusal" && typeof content.refusal === "string") {
        throw new Error(content.refusal);
      }
    }
  }
  throw new Error("OpenAI returned no usable artwork review.");
}

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

    const bindings = getBindings();
    if (!bindings.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured for this gallery." },
        { status: 503 },
      );
    }

    const bytes = await image.arrayBuffer();
    const dataUrl = `data:${image.type};base64,${Buffer.from(bytes).toString("base64")}`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bindings.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: bindings.OPENAI_MODEL_VISION || "gpt-5.6-sol",
        reasoning: { effort: "low" },
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are an art portfolio editor. Review only what is visually supported by the uploaded artwork. Propose an original, restrained title and a concise description of its visible color, form, texture, atmosphere, and composition. Do not invent the artist's intent, history, symbolism, materials, influences, or provenance. Choose a page background color that matches the artwork's outer edge or dominant background so the image can visually dissolve into a full-screen page.",
              },
            ],
          },
          {
            role: "user",
            content: [
              { type: "input_image", image_url: dataUrl, detail: "high" },
              {
                type: "input_text",
                text: `Artwork date: ${artworkDate}. Artist-provided medium: ${medium || "Not specified"}. Return the proposed portfolio metadata.`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "artwork_portfolio_metadata",
            strict: true,
            schema: analysisSchema,
          },
        },
        max_output_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI artwork review failed", response.status, errorText);
      return NextResponse.json(
        { error: "The artwork review could not be completed. Please try again." },
        { status: 502 },
      );
    }

    const result = await response.json();
    const analysis = JSON.parse(extractOutputText(result));
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Artwork analysis error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Artwork analysis failed." },
      { status: 500 },
    );
  }
}
