import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window frees up. */
  retryAfter: number;
  scope: "minute" | "day";
}

export const PER_MINUTE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 20);
export const DAILY_LIMIT = Number(process.env.RATE_LIMIT_PER_DAY ?? 300);

export const FRIENDLY_LIMIT_MESSAGE =
  "whoa, slow down a little 🥺 give me a minute to catch up and send that again";
export const FRIENDLY_DAILY_MESSAGE =
  "we've talked a LOT today 🫶 let's pick this back up tomorrow, okay?";

/* ──────────────────────────────────────────────────────────────
   Store abstraction — Upstash when configured, in-memory otherwise.
   ────────────────────────────────────────────────────────────── */

export interface CounterStore {
  /** Increment `key`, returning the new count. Sets a TTL on first write. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  reset?(): void;
}

export class MemoryCounterStore implements CounterStore {
  private map = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly nowFn: () => number = Date.now) {}

  async incr(key: string, ttlSeconds: number) {
    const now = this.nowFn();
    const cur = this.map.get(key);
    if (!cur || cur.expiresAt <= now) {
      this.map.set(key, { count: 1, expiresAt: now + ttlSeconds * 1000 });
      return 1;
    }
    cur.count += 1;
    return cur.count;
  }

  async ttl(key: string) {
    const cur = this.map.get(key);
    if (!cur) return 0;
    return Math.max(0, Math.ceil((cur.expiresAt - this.nowFn()) / 1000));
  }

  reset() {
    this.map.clear();
  }
}

export class RedisCounterStore implements CounterStore {
  constructor(private readonly redis: Redis) {}

  async incr(key: string, ttlSeconds: number) {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, ttlSeconds);
    return count;
  }

  async ttl(key: string) {
    const t = await this.redis.ttl(key);
    return typeof t === "number" && t > 0 ? t : 0;
  }
}

let store: CounterStore | null = null;

export function getCounterStore(): CounterStore {
  if (store) return store;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    store = new RedisCounterStore(new Redis({ url, token }));
  } else {
    store = new MemoryCounterStore();
  }
  return store;
}

/** Test seam. */
export function __setCounterStore(s: CounterStore | null) {
  store = s;
}

function dayStamp(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * 20 messages / minute, plus a configurable daily cap, per user.
 */
export async function checkChatRateLimit(
  userId: string,
  opts: {
    store?: CounterStore;
    perMinute?: number;
    perDay?: number;
    now?: Date;
  } = {},
): Promise<RateLimitResult> {
  const s = opts.store ?? getCounterStore();
  const perMinute = opts.perMinute ?? PER_MINUTE_LIMIT;
  const perDay = opts.perDay ?? DAILY_LIMIT;
  const now = opts.now ?? new Date();

  const minuteBucket = Math.floor(now.getTime() / 60_000);
  const minuteKey = `hs:rl:m:${userId}:${minuteBucket}`;
  const dayKey = `hs:rl:d:${userId}:${dayStamp(now)}`;

  const minuteCount = await s.incr(minuteKey, 65);
  if (minuteCount > perMinute) {
    return {
      success: false,
      limit: perMinute,
      remaining: 0,
      retryAfter: (await s.ttl(minuteKey)) || 60,
      scope: "minute",
    };
  }

  const dayCount = await s.incr(dayKey, 60 * 60 * 26);
  if (dayCount > perDay) {
    return {
      success: false,
      limit: perDay,
      remaining: 0,
      retryAfter: (await s.ttl(dayKey)) || 3600,
      scope: "day",
    };
  }

  return {
    success: true,
    limit: perMinute,
    remaining: Math.max(0, perMinute - minuteCount),
    retryAfter: 0,
    scope: "minute",
  };
}
