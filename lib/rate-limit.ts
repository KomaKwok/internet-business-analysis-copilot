const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, windowMs: number, maxRequests: number) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? [];
  const active = bucket.filter((timestamp) => now - timestamp < windowMs);

  if (active.length >= maxRequests) {
    buckets.set(key, active);
    return { allowed: false, remaining: 0 };
  }

  active.push(now);
  buckets.set(key, active);
  return { allowed: true, remaining: maxRequests - active.length };
}
