// Shared-password gate for the whole site (board page + API).
// Uses HTTP Basic Auth via Vercel Edge Middleware. The password lives only in
// the BOARD_PASSWORD environment variable — never in this file or the browser.
//
// - Set BOARD_PASSWORD (and optionally BOARD_USER, default "acacia") in Vercel.
// - Until BOARD_PASSWORD is set, the site stays open (fail-open) so you can't
//   lock yourself out before configuring it.
// - To "log out": close the browser (Basic Auth has no logout button).
import { next } from "@vercel/edge";

export const config = {
  // Run on every request except the favicon.
  matcher: "/((?!favicon.ico).*)"
};

export default function middleware(request) {
  const expectedPass = process.env.BOARD_PASSWORD;

  // No password configured yet -> let everything through (avoids a lockout).
  if (!expectedPass) return next();

  const expectedUser = process.env.BOARD_USER || "acacia";
  const header = request.headers.get("authorization") || "";
  const [scheme, encoded] = header.split(" ");

  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try {
      decoded = atob(encoded);
    } catch (e) {
      decoded = "";
    }
    const i = decoded.indexOf(":");
    const user = decoded.slice(0, i);
    const pass = decoded.slice(i + 1);
    if (user === expectedUser && pass === expectedPass) {
      return next(); // authenticated -> continue to the board / API
    }
  }

  return new Response("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Acacia Seedboard", charset="UTF-8"'
    }
  });
}
