import "server-only";

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const allowedOrigins = new Set([new URL(request.url).origin]);
  if (process.env.APP_URL) {
    allowedOrigins.add(new URL(process.env.APP_URL).origin);
  }

  return allowedOrigins.has(origin);
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
