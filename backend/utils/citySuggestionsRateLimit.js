const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;
const requestsByIp = new Map();

const citySuggestionsRateLimit = (req, res, next) => {
  const now = Date.now();
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  let entry = requestsByIp.get(ip);

  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
    requestsByIp.set(ip, entry);
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - entry.startedAt)) / 1000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ success: false, message: "Too many city searches. Please try again shortly." });
  }

  entry.count += 1;

  if (requestsByIp.size > 5000) {
    for (const [key, value] of requestsByIp) {
      if (now - value.startedAt >= WINDOW_MS) requestsByIp.delete(key);
    }
  }

  return next();
};

module.exports = citySuggestionsRateLimit;
