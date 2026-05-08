const userLimits = new Map<number, { count: number; resetAt: number }>();

export function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const limit = userLimits.get(userId);

  if (!limit || limit.resetAt < now) {
    userLimits.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
}
