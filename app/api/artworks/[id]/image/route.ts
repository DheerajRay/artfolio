import { getArtworkRecord, readArtworkImage } from "../../_shared";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const record = await getArtworkRecord(id);
  if (!record) return new Response("Not found", { status: 404 });
  if (/^https:\/\//.test(record.objectKey)) {
    return Response.redirect(record.objectKey, 302);
  }

  const image = await readArtworkImage(record);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
