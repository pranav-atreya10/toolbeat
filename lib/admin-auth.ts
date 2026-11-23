/**
 * A simple password check for admin-only links, using the browser's
 * built-in username/password prompt ("Basic auth").
 *
 * Set ADMIN_PASSWORD in your environment. Any username works; only the
 * password is checked. This is a stopgap until real sign-in (Milestone 3).
 */
import { timingSafeEqual } from "node:crypto";

export function checkAdmin(request: Request): "ok" | "unauthorized" | "disabled" {
  const password = process.env.ADMIN_PASSWORD;
  // Refuse weak or missing passwords, so the link is never left open by accident.
  if (!password || password.length < 12) return "disabled";

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return "unauthorized";
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const given = decoded.slice(decoded.indexOf(":") + 1);

  // Compare in constant time so the password can't be guessed by timing.
  const a = Buffer.from(given);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "unauthorized";
}

export function unauthorizedResponse() {
  return new Response("Password required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Toolbeat admin", charset="UTF-8"' },
  });
}
