import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "gallery_admin";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function sessionToken(password: string) {
  return createHash("sha256").update(`dheeraj-ray-gallery:${password}`).digest("hex");
}

export function isAdminConfigured() {
  return Boolean(process.env.GALLERY_ADMIN_PASSWORD);
}

export function isAdminRequest(request: Request) {
  const password = process.env.GALLERY_ADMIN_PASSWORD;
  if (!password) return process.env.NODE_ENV !== "production";

  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  if (!token) return false;

  const supplied = digest(token);
  const expected = digest(sessionToken(password));
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function verifyAdminPassword(candidate: string) {
  const password = process.env.GALLERY_ADMIN_PASSWORD;
  if (!password) return false;
  const supplied = digest(candidate);
  const expected = digest(password);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createAdminSessionToken() {
  const password = process.env.GALLERY_ADMIN_PASSWORD;
  if (!password) throw new Error("Gallery administration is not configured.");
  return sessionToken(password);
}
