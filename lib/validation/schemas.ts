import { z } from "zod";

export const MOODS = [
  "happy",
  "playful",
  "caring",
  "sleepy",
  "shy",
  "excited",
  "sad",
  "flirty",
] as const;

export const engineEventSchema = z.enum(["call_declined", "call_ended", "call_missed"]);

/** POST /api/chat request body. */
export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().or(z.string().min(6)),
  userText: z.string().max(4000).default(""),
  event: engineEventSchema.optional(),
  /** Client-generated id so retries are idempotent-ish and optimistic UI can reconcile. */
  clientMessageId: z.string().min(4).max(64).optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** The shape Claude must return through the forced `companion_reply` tool. */
export const companionReplySchema = z.object({
  reaction: z
    .string()
    .trim()
    .max(8)
    .nullish()
    .transform((v) => (v && v.length ? v : null)),
  messages: z
    .array(z.string().trim().min(1).max(400))
    .min(1)
    .max(4),
  start_call: z
    .object({ reason: z.string().max(200) })
    .nullish()
    .transform((v) => v ?? null),
  memory_notes: z.array(z.string().trim().min(2).max(200)).max(3).default([]),
  mood: z.enum(MOODS).default("happy"),
});
export type CompanionReplyPayload = z.infer<typeof companionReplySchema>;

/** POST /api/chat response. */
export const chatResponseSchema = z.object({
  reaction: z.string().nullable(),
  messages: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
  startCall: z.object({ reason: z.string() }).nullable(),
  mood: z.enum(MOODS),
  stage: z.number().int().min(1).max(4),
  userMessageId: z.string(),
  safety: z
    .object({ crisis: z.boolean() })
    .default({ crisis: false }),
  degraded: z.boolean().default(false),
});
export type ChatResponse = z.infer<typeof chatResponseSchema>;

export const createConversationSchema = z.object({
  companionId: z.string().min(1).max(64),
});

export const callSessionCreateSchema = z.object({
  conversationId: z.string().min(6),
  initiatedBy: z.enum(["user", "companion"]),
  status: z.enum(["declined", "completed", "missed", "active"]).default("active"),
});

export const callSessionEndSchema = z.object({
  sessionId: z.string().min(6),
  conversationId: z.string().min(6),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 6),
  status: z.enum(["declined", "completed", "missed"]),
});

export const callTokenSchema = z.object({
  conversationId: z.string().min(6),
  sessionId: z.string().min(6).optional(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  preferredGender: z.enum(["girlfriend", "boyfriend"]).optional(),
  ageConfirmed: z.boolean().optional(),
  blockCompanionId: z.string().min(1).max(64).optional(),
  unblockCompanionId: z.string().min(1).max(64).optional(),
});

export const reportSchema = z.object({
  conversationId: z.string().min(6),
  reason: z.string().trim().min(3).max(600),
  category: z.enum(["harassment", "explicit", "unsafe", "bug", "other"]).default("other"),
});

/** Safe-parse helper that returns a flat message list for 400s. */
export function flattenIssues(err: z.ZodError) {
  return err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`);
}
