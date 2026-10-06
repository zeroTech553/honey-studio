/**
 * Seeds the `companions` table from lib/companions/data.ts.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { COMPANIONS } from "../../lib/companions/data";

function loadEnvLocal() {
  // dotenv/config reads .env — also pull in .env.local like Next does.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require("dotenv");
    dotenv.config({ path: ".env.local", override: false });
  } catch {
    /* ignore */
  }
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "  Add them to .env.local (see .env.example) and run `npm run seed` again.",
    );
    process.exit(1);
  }

  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = COMPANIONS.map((c) => ({
    id: c.id,
    name: c.name,
    age: c.age,
    gender: c.gender,
    city: c.city,
    country: c.country,
    country_flag: c.countryFlag,
    timezone: c.timezone,
    tagline: c.tagline,
    bio: c.bio,
    tags: c.tags,
    interests: c.interests,
    favourite_food: c.favouriteFood,
    languages: c.languages,
    slang: c.slang,
    signature_phrases: c.signaturePhrases,
    emoji_rate: c.emojiRate,
    lowercase: c.lowercase,
    typing_wpm: c.typingWpm,
    voice_id: c.voiceId,
    accent: c.accent,
    avatar_from: c.avatarFrom,
    avatar_to: c.avatarTo,
    wake_hour: c.wakeHour,
    sleep_hour: c.sleepHour,
    is_active: true,
  }));

  const { error } = await db.from("companions").upsert(rows, { onConflict: "id" });
  if (error) {
    console.error("✗ Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`✓ Seeded ${rows.length} companions`);
  for (const r of rows) {
    console.log(`  · ${r.country_flag}  ${r.name} (${r.gender}) — ${r.city}`);
  }
}

main();
