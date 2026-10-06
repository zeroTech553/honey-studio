import crypto from "node:crypto";

/**
 * Minimal LiveKit access-token signer (HS256 JWT) so we do not need the full
 * server SDK just to mint a join token.
 * Docs: https://docs.livekit.io/home/get-started/authentication/
 */
export interface LiveKitGrantOptions {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name?: string;
  room: string;
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createLiveKitToken(opts: LiveKitGrantOptions): string {
  const now = Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSeconds ?? 60 * 30;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: opts.apiKey,
    sub: opts.identity,
    nbf: now - 10,
    iat: now,
    exp: now + ttl,
    name: opts.name ?? opts.identity,
    metadata: opts.metadata ? JSON.stringify(opts.metadata) : undefined,
    video: {
      room: opts.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto
    .createHmac("sha256", opts.apiSecret)
    .update(signingInput)
    .digest();
  return `${signingInput}.${b64url(sig)}`;
}

export function livekitConfigured() {
  return Boolean(
    process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET,
  );
}
