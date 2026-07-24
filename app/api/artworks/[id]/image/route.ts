import { getBindings } from "../../_shared";

export const runtime = "edge";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const { DB, ARTWORKS } = getBindings();
  const row = await DB.prepare(
    "SELECT object_key AS objectKey, mime_type AS mimeType FROM artworks WHERE id = ?"
  ).bind(id).first<{ objectKey: string; mimeType: string }>();

  if (!row) return new Response("Not found", { status: 404 });
  const object = await ARTWORKS.get(row.objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", row.mimeType);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
