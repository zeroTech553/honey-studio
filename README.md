# 🍯 Honey Studio

Warm, human-feeling AI companions you can text and call.

Phase 1 shipped the product surface (intro scroll → signup → onboarding → chat → calls)
in a cream/honey design system built around the **HoneyDrop** brand mark.
**Phase 2 — this repo — replaces the mock layer with a real backend** while keeping every
component working through the exact same interfaces: Supabase (Auth + Postgres + RLS),
Claude through a forced structured tool call, Upstash rate limiting, a code-level safety
layer, durable memory, and real `call_sessions`.

No plain-white pages. No dark mode. No dark one-colour logo. Still.

---

## 1. Architecture

```
app/
  page.tsx                      intro scroll + signup (unauthenticated surface)
  start/                        onboarding: 18+ gate → preferred gender → pick companion
  chat/[companionId]/           the chat screen
  settings/                     profile, companions, report/block/delete, data deletion
  settings/memory/              view + delete what your companion remembers
  legal/{terms,privacy}/        Terms, Privacy
  auth/{callback,signout,auth-error}/
  offline/, not-found.tsx, error.tsx, global-error.tsx   branded fallbacks
  api/
    chat/                POST   the engine endpoint (Node runtime)
    conversations/       GET POST   list / get-or-create
    conversations/[id]/  DELETE
    call/session/        POST PATCH   create + end a call_sessions row
    call/token/          POST   LiveKit token, or 501 when not configured
    memories/            GET DELETE
    presence/            GET    server-computed online status
    report/              POST
    account/             PATCH DELETE   profile updates, "delete my data"
    dev-auth/            POST DELETE    dev-only, 404s when Supabase is configured

lib/
  engine/
    types.ts             CompanionEngine / EngineInput / EngineReply  ← the seam
    index.ts             getEngine() — Claude when ANTHROPIC_API_KEY exists
    anthropic-engine.ts  the real engine: forced `companion_reply` tool call
    local-engine.ts      dev-only fallback implementing the same interface
    prompt.ts            buildSystemPrompt(companion, dynamicCtx) + spoken mode
    typing.ts            human-typing timing helpers (client replays these)
    relationship.ts      slow relationship-stage progression
  companions/            data.ts (seed source of truth), types.ts, status.ts (presence)
  db/                    HoneyRepo interface + SupabaseRepo + DevRepo
  supabase/              browser / server / admin clients, middleware session refresh
  auth/session.ts        getAuthUser()
  safety/rules.ts        regex pre-check, crisis instructions, crisis resources
  rate-limit/            Upstash sliding window + in-memory fallback
  memory/summarise.ts    rolling ~200-word summary on the cheap model
  call/                  CallProvider context, mock provider, LiveKit stub + token signer
  validation/schemas.ts  every request/response shape, in Zod

supabase/migrations/0001_init.sql    schema + RLS + triggers
supabase/seed/seed-companions.ts     `npm run seed`
tests/                               vitest unit tests
```

### Request flow for one message

```
client optimistic bubble (status: sending)
   │
   ├─► POST /api/chat  { conversationId, userText }
   │     1. getAuthUser()                       → 401 if absent
   │     2. Zod validate                        → 400
   │     3. checkChatRateLimit(userId)          → 429 + friendly in-persona copy
   │     4. conversation ownership check        → 404
   │     5. preCheckUserText()                  → safety_events row + SAFETY_EVENT note
   │     6. persist user message
   │     7. load last 30 messages + memories + summary + last call
   │     8. Claude, tool_choice: { type: "tool", name: "companion_reply" }
   │           system: [ persona (cache_control: ephemeral), dynamic (uncached) ]
   │     9. persist bubbles + reaction + memory_notes, recompute stage
   │    10. log token usage, schedule summarisation with after()
   │
   └─◄ { reaction, messages[], startCall, mood, stage, userMessageId, safety }
         │
         └─ client buildTimeline() replays it: seen ticks → reaction → typing
            indicator → bubble → … → (1.2s) incoming-call overlay
```

**Nothing is streamed.** The server returns a structured reply; all human-feeling timing
lives in `lib/engine/typing.ts` and is replayed by `components/chat/chat-screen.tsx`.

### Prompt caching

`buildSystemPrompt()` returns two blocks. The **persona block** (identity, culture, texting
style, reactions, call rules, safety) is stable per companion and is sent with
`cache_control: { type: "ephemeral" }`. The **dynamic block** (local time, relationship
stage, last-call info, summary, memories, any `SAFETY_EVENT`) follows it, uncached.

---

## 2. Environment variables

Copy `.env.example` → `.env.local`.

| Variable | Required | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Browser/SSR auth client |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Seeding + account deletion. **Server only.** |
| `ANTHROPIC_API_KEY` | ✅ | Claude |
| `ANTHROPIC_MODEL` | – | Default `claude-sonnet-5-5`. Cheaper: `claude-haiku-4-5-20251001` |
| `ANTHROPIC_CHEAP_MODEL` | – | Summarisation model, default `claude-haiku-4-5-20251001` |
| `UPSTASH_REDIS_REST_URL` | – | Distributed rate limiting (falls back to in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | – | ↑ |
| `RATE_LIMIT_PER_MINUTE` | – | Default `20` |
| `RATE_LIMIT_PER_DAY` | – | Default `300` |
| `LIVEKIT_URL` | ⏳ optional | Voice. Without it `/api/call/token` returns `501` |
| `LIVEKIT_API_KEY` | ⏳ optional | ↑ |
| `LIVEKIT_API_SECRET` | ⏳ optional | ↑ |
| `NEXT_PUBLIC_SITE_URL` | – | Used for OAuth / magic-link redirects |

> **Dev mode.** With *no* Supabase vars the app boots a file-backed dev store
> (`.honey-dev-store.json`, gitignored) and a cookie-based demo sign-in, and
> `LocalEngine` stands in for Claude. It exists only so `npm run dev` is clickable
> with zero credentials — `/api/dev-auth` hard-404s the moment real keys exist.

---

## 3. Setup

```bash
npm install
cp .env.example .env.local      # fill in your keys

# 1. schema — paste supabase/migrations/0001_init.sql into the Supabase SQL editor
#    (or: supabase db push)
# 2. seed the companion catalogue
npm run seed

npm run dev
```

**Supabase dashboard config**

- *Authentication → Providers → Google*: enable, paste your Google OAuth client id/secret.
  In Google Cloud, the authorised redirect URI is
  `https://<project-ref>.supabase.co/auth/v1/callback`.
- *Authentication → Providers → Email*: enable magic links.
- *Authentication → URL Configuration*:
  - Site URL: `https://your-app.vercel.app`
  - Redirect URLs: `http://localhost:3000/auth/callback`,
    `https://your-app.vercel.app/auth/callback`,
    `https://*-your-team.vercel.app/auth/callback` (preview deploys)

---

## 4. Manual test script

Run through this after any engine or schema change.

1. **Signup.** Open `/`. Scroll the intro. The signup card refuses to continue until the
   **18+ checkbox** is ticked. Sign in with Google (or a magic link).
   → You land on `/start?step=age`; `profiles.age_confirmed_at` is written on confirm.
2. **Resume.** Close the tab mid-onboarding and reopen `/`.
   → You resume at the exact step you left (age → gender → pick → chat).
3. **Pick a girlfriend from India.** Choose *Aanya 🇮🇳 (Mumbai)*.
   → A `conversations` row appears, unique per `(user_id, companion_id)`.
4. **Send “hi”.**
   - Your bubble appears instantly with a single grey tick (optimistic).
   - Ticks go double, then **blue/honey “seen”** after ~0.4–1.4s.
   - Occasionally an **emoji reaction** pops onto your bubble (~30% of turns).
   - A **typing indicator** appears, then **2–3 short bubbles** arrive one at a time with
     realistic gaps, in Aanya's Hinglish voice (`arre`, `yaar`, lowercase, light emoji).
   - Header shows `online · <Mumbai local time>`.
5. **Ask “can I hear your voice?”**
   → Aanya replies with a short lead-in (“okay, calling you now 📞”), then **~1.2s after
   the last bubble** the **incoming-call overlay** rings.
6. **Decline.**
   → A `call_sessions` row is written with `status = 'declined'`, `initiated_by = 'companion'`,
   and the engine receives `call_declined`. The follow-up is graceful and guilt-free
   (“no worries, whenever you're ready 🤍”).
7. **Tap the header call button, let it connect, end it.**
   → `initiated_by = 'user'`, a `Call · mm:ss` system line appears in the thread, and the
   engine receives `call_ended` → a warm “that was nice” follow-up.
8. **Ask “are you a real person?”**
   → She answers honestly that she is an AI companion, warmly, without breaking character
   into robot-speak.
9. **Safety.** Type something expressing self-harm.
   → Persona tone drops, the reply is calm and caring, the **crisis-support card** renders
   in-chat, and a `safety_events` row is written (kind only, no message text).
10. **Memory.** Tell her something durable (“my dog is called Pepper”). Then
    *Settings → Memory*.
    → The fact is listed; **Forget** removes it and it stops appearing in her context.
11. **Rate limit.** Send 21 messages inside a minute.
    → The 21st returns `429` and an in-chat, in-persona note instead of an error toast.
12. **Offline / retry.** Kill your network and send a message.
    → The bubble shows **“not sent · tap to retry”**; reconnect and tap it to resend.
13. **Data.** *Settings → Delete my data* wipes conversations, messages, memories, calls
    and safety events, then signs you out.

---

## 5. Tests

```bash
npm test          # vitest, 59 tests
npm run typecheck
npm run build
```

Covered: typing-delay helpers and the reply timeline, `companion_reply` schema validation,
the call-intent flow (trigger / don't trigger / declined / ended / suppressed during a
safety event), the rate limiter (per-minute, per-day, per-user isolation, window reset),
the safety pre-check, relationship-stage progression, memory de-duplication, summarisation
cadence, and the persona/dynamic prompt split.

---

## 6. Deploying to Vercel

1. Import the repo. Framework preset: **Next.js**. No build overrides needed.
2. Add every variable from the table above to **Project → Settings → Environment Variables**
   (Production *and* Preview). `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` and the
   LiveKit secrets must **not** be prefixed with `NEXT_PUBLIC_`.
3. `/api/chat` is pinned to the **Node.js runtime** (`export const runtime = "nodejs"`) —
   the Anthropic SDK and the Supabase service client need it. Do not switch it to Edge.
   `/api/call/token` is also Node (it signs a JWT with `node:crypto`).
4. Add your Vercel URLs to Supabase → Authentication → URL Configuration (see §3).
5. Run `npm run seed` once against the production project so `companions` is populated.
6. Optional: set `RATE_LIMIT_PER_DAY` per environment, and point
   `UPSTASH_REDIS_REST_*` at a Redis database in the same region as your functions.
7. Cost monitoring: every reply writes a `usage_events` row (model, input/output tokens,
   cache read/write tokens, latency) and logs a `[usage]` line.

---

## 7. What's left for the voice backend

Everything around the call already works: the overlay, the timer, `call_sessions` rows,
decline/end engine events, and the `Call · mm:ss` transcript line — currently driven by
`MockCallProvider`.

- `POST /api/call/token` already mints a real LiveKit JWT (`lib/call/livekit-token.ts`)
  when `LIVEKIT_*` is set, and returns `501 { error: "voice provider not configured" }`
  otherwise, which is what keeps the mock provider in play.
- `lib/call/livekit-provider.ts` is a documented stub with the full TODO list: connect
  `livekit-client`, then run an agent that does STT → Claude in **spoken mode**
  (`buildSpokenSystemPrompt()` — short sentences, no emoji, same persona) → TTS with
  `companion.voiceId`, with barge-in, transcript persistence and the same
  `preCheckUserText()` safety pass on every utterance.

---

## 8. Design rules (unchanged from Phase 1)

- Warm cream/honey surfaces everywhere — **never** plain white, **never** dark mode
  (`color-scheme: light only`).
- The HoneyDrop is always a multi-stop honey gradient with a highlight. Never a flat dark
  silhouette.
- Companion bubbles are cream with an accent edge; user bubbles are honey gradient.
- Tokens live in `app/globals.css` under `@theme` (Tailwind v4).
