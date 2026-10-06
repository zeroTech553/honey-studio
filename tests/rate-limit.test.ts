import { beforeEach, describe, expect, it } from "vitest";
import {
  MemoryCounterStore,
  checkChatRateLimit,
} from "@/lib/rate-limit";

describe("rate limiter", () => {
  let store: MemoryCounterStore;
  let clock: number;

  beforeEach(() => {
    clock = Date.UTC(2026, 9, 6, 10, 0, 0);
    store = new MemoryCounterStore(() => clock);
  });

  const call = (userId = "u1") =>
    checkChatRateLimit(userId, {
      store,
      perMinute: 20,
      perDay: 50,
      now: new Date(clock),
    });

  it("allows up to 20 messages in a minute", async () => {
    for (let i = 0; i < 20; i++) {
      const r = await call();
      expect(r.success).toBe(true);
    }
    expect((await call()).success).toBe(false);
  });

  it("reports the minute scope and a retry-after", async () => {
    for (let i = 0; i < 20; i++) await call();
    const blocked = await call();
    expect(blocked.scope).toBe("minute");
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("counts remaining correctly", async () => {
    const first = await call();
    expect(first.remaining).toBe(19);
  });

  it("frees up in the next minute bucket", async () => {
    for (let i = 0; i < 20; i++) await call();
    expect((await call()).success).toBe(false);
    clock += 61_000;
    expect((await call()).success).toBe(true);
  });

  it("isolates users from each other", async () => {
    for (let i = 0; i < 20; i++) await call("u1");
    expect((await call("u1")).success).toBe(false);
    expect((await call("u2")).success).toBe(true);
  });

  it("enforces the daily cap across minutes", async () => {
    let allowed = 0;
    for (let minute = 0; minute < 10; minute++) {
      for (let i = 0; i < 20; i++) {
        const r = await call();
        if (r.success) allowed++;
        else if (r.scope === "day") {
          expect(allowed).toBe(50);
          return;
        }
      }
      clock += 61_000;
    }
    throw new Error("daily cap never triggered");
  });
});
