export type ArtworkClassification = {
  discipline: string;
  genre: string;
  visualLanguage: string;
  composition: string;
  palette: string[];
  mood: string[];
  subjects: string[];
};

export type ArtworkAnalysis = {
  title: string;
  description: string;
  additionalNotes: string;
  classification: ArtworkClassification;
  background: string;
  foreground: "#171612" | "#F1EEE6";
  soundtrack: {
    title: string;
    artist: string;
    rationale: string;
    youtubeUrl: string;
  };
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "additionalNotes", "classification", "background", "foreground", "soundtrack"],
  properties: {
    title: {
      type: "string",
      description: "An evocative, restrained artwork title of two to six words.",
    },
    description: {
      type: "string",
      description: "A precise portfolio description of 70 to 110 words covering visible subject, color, form, texture, atmosphere, and spatial arrangement.",
    },
    additionalNotes: {
      type: "string",
      description: "Professional additional notes of 100 to 160 words discussing strengths, tensions, visual hierarchy, rhythm, and the work's most productive ambiguity. Lightly witty through exact observation, never jokes or snark.",
    },
    classification: {
      type: "object",
      additionalProperties: false,
      required: ["discipline", "genre", "visualLanguage", "composition", "palette", "mood", "subjects"],
      properties: {
        discipline: {
          type: "string",
          description: "Broad practice or medium category, informed by the artist-provided medium.",
        },
        genre: {
          type: "string",
          description: "A visually supported genre or genre combination, without claiming formal movement membership.",
        },
        visualLanguage: {
          type: "string",
          description: "A concise phrase describing the work's stylistic and mark-making language.",
        },
        composition: {
          type: "string",
          description: "A concise phrase describing organization, balance, focal structure, or spatial strategy.",
        },
        palette: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" },
          description: "Three to five plain-language dominant color names.",
        },
        mood: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" },
          description: "Three to five concise tonal or atmospheric descriptors.",
        },
        subjects: {
          type: "array",
          minItems: 2,
          maxItems: 7,
          items: { type: "string" },
          description: "Two to seven clearly visible subjects or motifs.",
        },
      },
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
    soundtrack: {
      type: "object",
      additionalProperties: false,
      required: ["title", "artist", "rationale", "youtubeUrl"],
      properties: {
        title: {
          type: "string",
          description: "One existing, released song whose tone, rhythm, or atmosphere complements the visible artwork.",
        },
        artist: {
          type: "string",
          description: "The performing artist for the suggested song.",
        },
        rationale: {
          type: "string",
          description: "A concise one-sentence explanation grounded in the artwork's visible mood, rhythm, palette, or subject.",
        },
        youtubeUrl: {
          type: "string",
          description: "Always return an empty string. The owner supplies and verifies the playable YouTube URL.",
          maxLength: 0,
        },
      },
    },
  },
};

type OpenAIResponse = {
  status?: string;
  incomplete_details?: {
    reason?: string | null;
  } | null;
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: unknown;
      refusal?: unknown;
    }>;
  }>;
};

const MAX_ANALYSIS_ATTEMPTS = 2;
const MAX_ANALYSIS_OUTPUT_TOKENS = 4_000;

function extractOutputText(response: OpenAIResponse): string {
  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
      if (content.type === "refusal" && typeof content.refusal === "string") {
        throw new Error(content.refusal);
      }
    }
  }
  throw new Error("OpenAI returned no usable artwork review.");
}

export async function analyzeArtworkImage({
  imageBytes,
  mimeType,
  artworkDate,
  medium,
  currentTitle,
}: {
  imageBytes: ArrayBuffer;
  mimeType: string;
  artworkDate: string;
  medium: string;
  currentTitle?: string;
}): Promise<ArtworkAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured for this gallery.");
  }

  const dataUrl = `data:${mimeType};base64,${Buffer.from(imageBytes).toString("base64")}`;
  const requestBody = {
    model: process.env.OPENAI_MODEL_VISION || "gpt-5.6-sol",
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are a senior contemporary-art critic and portfolio editor.",
              "Write with professional authority, clarity, and lightly dry wit: the wit must come from precise observation, never jokes, puns, snark, hype, or theatrical claims.",
              "Ground every statement in what is visibly supported by the image.",
              "Do not invent the artist's intention, biography, symbolism, provenance, influences, process, materials, or movement affiliation.",
              "Keep description factual and visual; reserve interpretation and evaluation for the additional notes.",
              "Classification labels are descriptive viewing aids, not declarations of official art-historical membership.",
              "Choose a page background matching the artwork's perimeter so the image can visually dissolve into the page.",
              "Suggest one real, released song that complements the work. Do not invent or guess a YouTube URL; return an empty youtubeUrl.",
            ].join(" "),
          },
        ],
      },
      {
        role: "user",
        content: [
          { type: "input_image", image_url: dataUrl, detail: "high" },
          {
            type: "input_text",
            text: [
              `Artwork date: ${artworkDate}.`,
              `Artist-provided medium: ${medium || "Not specified"}.`,
              currentTitle
                ? `Current portfolio title: ${currentTitle}. Retain it unless a materially stronger title is clearly justified by the image.`
                : "Propose a portfolio title.",
              "Return the complete editorial record.",
            ].join(" "),
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "artwork_editorial_record",
        strict: true,
        schema: analysisSchema,
      },
    },
    max_output_tokens: MAX_ANALYSIS_OUTPUT_TOKENS,
  };

  for (let attempt = 1; attempt <= MAX_ANALYSIS_ATTEMPTS; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI artwork review failed", response.status, errorText);
      throw new Error("The artwork review could not be completed. Please try again.");
    }

    const result = await response.json() as OpenAIResponse;
    if (result.status === "incomplete") {
      console.warn(
        "OpenAI artwork review was incomplete",
        result.incomplete_details?.reason || "unknown reason",
      );
      if (attempt < MAX_ANALYSIS_ATTEMPTS) continue;
      break;
    }

    const outputText = extractOutputText(result);
    try {
      return JSON.parse(outputText) as ArtworkAnalysis;
    } catch (error) {
      console.warn("OpenAI artwork review returned invalid JSON", error);
      if (attempt < MAX_ANALYSIS_ATTEMPTS) continue;
      break;
    }
  }

  throw new Error("The artwork review was incomplete. Please try again.");
}
