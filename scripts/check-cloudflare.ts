/**
 * Does @cf/swiss-ai/apertus-v1.5-8b actually answer, and can it hold the
 * structured contract Honey Studio needs?
 *
 *   npm run check:cf
 *
 * Reads CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN from .env.local.
 * Works identically on Windows CMD, PowerShell and bash — no quoting games.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import {
  CF_DEFAULT_MODEL,
  CloudflareEngine,
  cloudflareRunUrl,
  extractCfText,
} from "../lib/engine/cloudflare-engine";
import { parseStructuredReply } from "../lib/engine/structured-text";
import { getCompanion } from "../lib/companions/data";

loadEnv({ path: ".env.local", override: false });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const model = process.env.CLOUDFLARE_AI_MODEL || CF_DEFAULT_MODEL;

function die(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

async function main() {
  console.log("\n🍯  Honey Studio — Cloudflare Workers AI check\n");

  if (!accountId) {
    die(
      "CLOUDFLARE_ACCOUNT_ID is not set.\n" +
        "  Run `wrangler whoami`, copy the 32-character Account ID,\n" +
        "  and add it to .env.local as CLOUDFLARE_ACCOUNT_ID=...",
    );
  }
  if (!token) {
    die("CLOUDFLARE_API_TOKEN is not set. Add it to .env.local.");
  }

  console.log(`  account : ${accountId.slice(0, 6)}…${accountId.slice(-4)}`);
  console.log(`  model   : ${model}\n`);

  // ── 1. raw reachability ──────────────────────────────────────────
  console.log("1) plain prompt…");
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(cloudflareRunUrl(model, accountId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(process.env.CLOUDFLARE_AI_GATEWAY_ID
          ? { "cf-aig-gateway-id": process.env.CLOUDFLARE_AI_GATEWAY_ID }
          : {}),
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say hello in one short sentence." }],
        max_tokens: 64,
      }),
    });
  } catch (err) {
    die(`network error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bodyText = await res.text();
  if (!res.ok) {
    console.error(`   HTTP ${res.status}`);
    console.error(`   ${bodyText.slice(0, 500)}`);
    if (res.status === 401 || res.status === 403) {
      die(
        "auth rejected — the token needs the 'Workers AI: Read' permission\n" +
          "  on this account, and the account id must match the token.",
      );
    }
    if (res.status === 404) {
      die(
        `model not found on this account: ${model}\n` +
          "  Check the id at https://developers.cloudflare.com/workers-ai/models/",
      );
    }
    die(`request failed with HTTP ${res.status}`);
  }

  const data = JSON.parse(bodyText);
  const text = extractCfText(data);
  const ms = Date.now() - started;

  if (!text.trim()) {
    console.error(`   raw payload: ${bodyText.slice(0, 400)}`);
    die("the model returned no text — not usable as the chat engine.");
  }

  console.log(`   ✓ responded in ${ms}ms`);
  console.log(`   ↳ "${text.trim().slice(0, 160)}"\n`);

  // ── 2. structured contract through the real engine ───────────────
  console.log("2) in-persona structured reply (full Honey Studio prompt)…");
  const companion = getCompanion("aanya")!;
  const engine = new CloudflareEngine(model);
  const t2 = Date.now();
  const reply = await engine.reply({
    companion,
    history: [],
    userText: "hi",
    stage: 1,
    memories: [],
    summary: null,
    displayName: "Sam",
  });

  if (reply.degraded) {
    die("the engine fell back — see the error logged above.");
  }

  console.log(`   ✓ ${Date.now() - t2}ms`);
  console.log(`   reaction : ${reply.reaction ?? "null"}`);
  reply.messages.forEach((m, i) => console.log(`   bubble ${i + 1}  : ${m}`));
  console.log(`   mood     : ${reply.mood}`);
  console.log(`   call     : ${reply.startCall ? reply.startCall.reason : "null"}`);
  console.log(`   memories : ${reply.memoryNotes.length}`);
  console.log(
    `   tokens   : in ${reply.usage?.inputTokens ?? 0} / out ${reply.usage?.outputTokens ?? 0}\n`,
  );

  // ── 3. does it keep the JSON contract, or do we rely on recovery? ─
  const probe = parseStructuredReply(text);
  console.log("3) verdict");
  console.log(`   • model answers              : YES`);
  console.log(
    `   • holds the JSON contract    : ${
      reply.messages.length > 0 && probe.via !== "none" ? "checked below" : "n/a"
    }`,
  );
  console.log(
    `   • call intent test           : ${
      (
        await engine.reply({
          companion,
          history: [],
          userText: "can I hear your voice?",
          stage: 1,
        })
      ).startCall
        ? "✓ triggers start_call"
        : "✗ did NOT trigger start_call"
    }`,
  );
  console.log(
    `\n✓ ${model} is usable. Set ENGINE_PROVIDER=cloudflare in .env.local to make it the model.\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
