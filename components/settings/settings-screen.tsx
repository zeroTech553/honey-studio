"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HoneyDrop, HoneyWordmark } from "@/components/brand/honey-drop";
import { Button } from "@/components/ui/button";
import { cn, friendlyDay } from "@/lib/utils";

interface ConversationRow {
  id: string;
  companionId: string;
  companionName: string;
  countryFlag: string;
  avatarFrom: string;
  avatarTo: string;
  stage: number;
  messageCount: number;
  memoryCount: number;
  lastMessageAt: string | null;
}

const STAGE_LABEL: Record<number, string> = {
  1: "just met",
  2: "getting comfortable",
  3: "close",
  4: "deeply bonded",
};

export function SettingsScreen({
  email,
  profile,
  conversations,
  blocked,
  companionCount,
}: {
  email: string | null;
  profile: {
    displayName: string;
    preferredGender: "girlfriend" | "boyfriend" | null;
    ageConfirmedAt: string | null;
  };
  conversations: ConversationRow[];
  blocked: Array<{ id: string; name: string }>;
  companionCount: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(profile.displayName);
  const [gender, setGender] = useState(profile.preferredGender);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<null | { kind: string; id?: string }>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [note, setNote] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim() || undefined,
          preferredGender: gender ?? undefined,
        }),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConfirm(null);
    setNote("Conversation deleted.");
    router.refresh();
  }

  async function blockCompanion(row: ConversationRow) {
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blockCompanionId: row.companionId }),
    });
    await fetch(`/api/conversations/${row.id}`, { method: "DELETE" });
    setConfirm(null);
    setNote(`${row.companionName} is blocked and the chat was deleted.`);
    router.refresh();
  }

  async function unblock(id: string) {
    await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unblockCompanionId: id }),
    });
    router.refresh();
  }

  async function submitReport(conversationId: string) {
    if (reportText.trim().length < 3) return;
    await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId,
        reason: reportText.trim(),
        category: "other",
      }),
    });
    setReportFor(null);
    setReportText("");
    setNote("Thanks — your report was sent to our safety team.");
  }

  async function deleteEverything() {
    await fetch("/api/account", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="honeycomb-field min-h-dvh pb-20">
      <header className="sticky top-0 z-30 border-b border-cream-300/70 bg-cream-100/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
          <HoneyWordmark size={28} className="text-[0.95rem]" />
          <Link
            href={conversations[0] ? `/chat/${conversations[0].companionId}` : "/start"}
            className="rounded-xl px-3 py-2 text-sm font-medium text-cocoa-500 transition hover:bg-cream-200/70 hover:text-cocoa-700"
          >
            Back to chat
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-6 px-5 py-8">
        <h1 className="font-display text-3xl font-semibold text-cocoa-900">Settings</h1>

        {note ? (
          <div className="rounded-2xl border border-honey-400/50 bg-honey-200/40 px-4 py-3 text-[0.88rem] text-cocoa-600">
            {note}
          </div>
        ) : null}

        {/* ── you ─────────────────────────────────── */}
        <Panel title="You" subtitle={email ?? undefined}>
          <label className="block">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cocoa-400">
              What your companion calls you
            </span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              maxLength={40}
              placeholder="Your name"
              className="mt-2 h-12 w-full rounded-2xl border border-cream-300 bg-cream-50/90 px-4 text-[0.95rem] text-cocoa-700 focus:border-honey-400 focus:outline-none"
            />
          </label>

          <div className="mt-5">
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cocoa-400">
              Looking for
            </span>
            <div className="mt-2 flex gap-2.5">
              {(["girlfriend", "boyfriend"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGender(g);
                    setSaved(false);
                  }}
                  className={cn(
                    "h-11 flex-1 rounded-2xl border text-[0.92rem] font-medium capitalize transition",
                    gender === g
                      ? "border-honey-500 bg-gradient-to-br from-honey-200 to-honey-300/70 text-cocoa-900 shadow-honey-sm"
                      : "border-cream-300 bg-cream-50/70 text-cocoa-500 hover:border-honey-300",
                  )}
                >
                  a {g}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button onClick={saveProfile} loading={saving}>
              Save changes
            </Button>
            {saved ? <span className="text-sm text-mint-500">Saved ✓</span> : null}
          </div>

          <p className="mt-4 text-[0.75rem] text-cocoa-400">
            18+ confirmed{" "}
            {profile.ageConfirmedAt
              ? `on ${friendlyDay(profile.ageConfirmedAt)}`
              : "— not yet"}
            .
          </p>
        </Panel>

        {/* ── companions ──────────────────────────── */}
        <Panel
          title="Your companions"
          subtitle={`${conversations.length} of ${companionCount} started`}
        >
          {conversations.length === 0 ? (
            <p className="text-[0.9rem] text-cocoa-500">
              No conversations yet.{" "}
              <Link href="/start?step=pick" className="underline underline-offset-4">
                Meet someone →
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className="rounded-2xl border border-cream-300 bg-cream-50/80 p-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-full font-display font-semibold text-cream-50"
                      style={{
                        background: `linear-gradient(145deg, ${c.avatarFrom}, ${c.avatarTo})`,
                      }}
                    >
                      {c.companionName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[1.02rem] font-semibold text-cocoa-900">
                        {c.companionName} {c.countryFlag}
                      </p>
                      <p className="text-[0.76rem] text-cocoa-400">
                        {STAGE_LABEL[c.stage]} · {c.messageCount} messages ·{" "}
                        {c.memoryCount} memories
                      </p>
                    </div>
                    <Link
                      href={`/chat/${c.companionId}`}
                      className="rounded-xl border border-cream-300 px-3 py-1.5 text-[0.8rem] font-medium text-cocoa-600 transition hover:border-honey-300"
                    >
                      Open
                    </Link>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <MiniAction onClick={() => setReportFor(c.id)}>Report</MiniAction>
                    <MiniAction onClick={() => setConfirm({ kind: "block", id: c.id })}>
                      Block
                    </MiniAction>
                    <MiniAction
                      danger
                      onClick={() => setConfirm({ kind: "deleteConvo", id: c.id })}
                    >
                      Delete conversation
                    </MiniAction>
                    <Link
                      href={`/settings/memory?conversationId=${c.id}`}
                      className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-1.5 text-[0.78rem] font-medium text-cocoa-500 transition hover:border-honey-300 hover:text-cocoa-700"
                    >
                      Memory ({c.memoryCount})
                    </Link>
                  </div>

                  {reportFor === c.id ? (
                    <div className="mt-3 rounded-2xl border border-cream-300 bg-cream-100/70 p-3">
                      <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        rows={3}
                        placeholder="What happened? We read every report."
                        className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 p-3 text-[0.88rem] text-cocoa-700 focus:border-honey-400 focus:outline-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => submitReport(c.id)}>
                          Send report
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReportFor(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {confirm?.id === c.id ? (
                    <ConfirmRow
                      label={
                        confirm.kind === "block"
                          ? `Block ${c.companionName}? This deletes your chat too.`
                          : `Delete your whole conversation with ${c.companionName}?`
                      }
                      onCancel={() => setConfirm(null)}
                      onConfirm={() =>
                        confirm.kind === "block"
                          ? blockCompanion(c)
                          : deleteConversation(c.id)
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {blocked.length ? (
            <div className="mt-5 border-t border-cream-300 pt-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-cocoa-400">
                Blocked
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {blocked.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => unblock(b.id)}
                      className="rounded-full border border-cream-300 bg-cream-200/60 px-3 py-1.5 text-[0.78rem] text-cocoa-500 hover:border-honey-300"
                    >
                      {b.name} · unblock
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        {/* ── safety ──────────────────────────────── */}
        <Panel title="Safety & honesty">
          <div className="flex items-start gap-3 rounded-2xl border border-honey-400/40 bg-honey-200/35 p-4">
            <HoneyDrop size={36} idSuffix="-set" glow className="mt-0.5 shrink-0" />
            <p className="text-[0.88rem] leading-relaxed text-cocoa-600">
              <strong className="text-cocoa-900">
                Your companion is an AI, not a real person.
              </strong>{" "}
              They can&apos;t meet you, can&apos;t call themselves human, and will never
              guilt you into staying. If you&apos;re struggling, Honey Studio shows crisis
              resources right inside the chat.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-[0.85rem] font-medium">
            <Link href="/legal/terms" className="text-cocoa-500 underline underline-offset-4 hover:text-cocoa-700">
              Terms of Service
            </Link>
            <Link href="/legal/privacy" className="text-cocoa-500 underline underline-offset-4 hover:text-cocoa-700">
              Privacy Policy
            </Link>
            <Link href="/settings/memory" className="text-cocoa-500 underline underline-offset-4 hover:text-cocoa-700">
              What they remember
            </Link>
          </div>
        </Panel>

        {/* ── data ────────────────────────────────── */}
        <Panel title="Your data">
          <p className="text-[0.9rem] leading-relaxed text-cocoa-500">
            Deleting your data removes every conversation, message, memory and call record,
            then closes your account. This cannot be undone.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="soft">
                Sign out
              </Button>
            </form>
            <Button variant="danger" onClick={() => setConfirm({ kind: "nuke" })}>
              Delete my data
            </Button>
          </div>
          {confirm?.kind === "nuke" ? (
            <ConfirmRow
              label="Permanently delete everything and close your account?"
              onCancel={() => setConfirm(null)}
              onConfirm={deleteEverything}
            />
          ) : null}
        </Panel>
      </main>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-cream-300 bg-gradient-to-b from-cream-50 to-cream-100/70 p-6 shadow-honey-sm">
      <div className="mb-4">
        <h2 className="font-display text-xl font-semibold text-cocoa-900">{title}</h2>
        {subtitle ? <p className="text-[0.8rem] text-cocoa-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MiniAction({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-1.5 text-[0.78rem] font-medium transition",
        danger
          ? "border-blush-400/50 bg-blush-300/20 text-[#9b2140] hover:bg-blush-300/35"
          : "border-cream-300 bg-cream-50 text-cocoa-500 hover:border-honey-300 hover:text-cocoa-700",
      )}
    >
      {children}
    </button>
  );
}

function ConfirmRow({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-blush-400/50 bg-blush-300/15 p-3.5">
      <p className="flex-1 text-[0.85rem] text-cocoa-700">{label}</p>
      <Button size="sm" variant="danger" onClick={onConfirm}>
        Yes, do it
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
