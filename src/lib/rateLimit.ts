// Simple in-memory sliding window rate limiter.
// Works per serverless function instance — provides real-world protection
// against bursts without requiring an external store like Redis.

const store = new Map<string, number[]>();

/**
 * Returns true if the request is allowed, false if it should be blocked.
 * @param key   Unique key — typically `${ip}:${routeName}`
 * @param limit Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) return false;
  timestamps.push(now);
  store.set(key, timestamps);
  return true;
}

export function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    { status: 429, headers: { "Content-Type": "application/json" } }
  );
}
