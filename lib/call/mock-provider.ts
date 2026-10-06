import type { CallEvent, CallHandle, CallProvider, CallConnectOptions } from "./types";

/**
 * Simulated voice provider. No audio is transmitted — it drives the exact
 * same CallHandle surface so the call UI, timers, call_sessions rows and
 * engine events are all real. Used until LIVEKIT_* is configured.
 */
export class MockCallProvider implements CallProvider {
  readonly name = "mock";

  async isAvailable() {
    return true;
  }

  async connect(opts: CallConnectOptions): Promise<CallHandle> {
    const listeners = new Map<CallEvent, Set<(p?: unknown) => void>>();
    const emit = (e: CallEvent, p?: unknown) =>
      listeners.get(e)?.forEach((cb) => cb(p));

    let disposed = false;

    // Simulated "connecting" handshake.
    const connectTimer = setTimeout(() => {
      if (!disposed) emit("connected");
    }, 900 + Math.random() * 700);

    // Simulated speaking rhythm so the orb animates believably.
    const speakTimer = setInterval(() => {
      if (disposed) return;
      emit("speaking", Math.random() > 0.45);
    }, 1400);

    return {
      room: `mock_${opts.conversationId}`,
      setMuted() {},
      setSpeaker() {},
      async disconnect() {
        disposed = true;
        clearTimeout(connectTimer);
        clearInterval(speakTimer);
        emit("disconnected");
      },
      on(event, cb) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
        return () => listeners.get(event)?.delete(cb);
      },
    };
  }
}
