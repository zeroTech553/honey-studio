export const metadata = { title: "Privacy — Honey Studio" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-cocoa-400">Last updated: 6 October 2026</p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Account:</strong> your user id, email address, display name, preferred
          companion type, and the timestamp of your 18+ confirmation.
        </li>
        <li>
          <strong>Conversations:</strong> your messages, your companion&apos;s replies,
          reactions, and call records (start time, duration, outcome).
        </li>
        <li>
          <strong>Memories &amp; summaries:</strong> short durable facts your companion
          picked up, plus a rolling ~200-word conversation summary.
        </li>
        <li>
          <strong>Safety events:</strong> the <em>type</em> of a flagged event and when it
          happened. We do not copy your message text into this log.
        </li>
        <li>
          <strong>Usage:</strong> model name and token counts per request, for cost
          monitoring.
        </li>
      </ul>

      <h2>Row-level security</h2>
      <p>
        Every table is protected by Postgres row-level security. A signed-in user can only
        read or write rows tied to their own account — this is enforced in the database,
        not just the application.
      </p>

      <h2>Who we share with</h2>
      <p>
        Message content is sent to Anthropic to generate replies, and (when you make a
        voice call) to our speech providers. We do not sell your data, and we do not use
        your conversations to train models.
      </p>

      <h2>What we never ask for</h2>
      <p>
        Companions are instructed never to request passwords, card numbers or government
        IDs. Please don&apos;t share them — if you do, delete the message from Settings.
      </p>

      <h2>Your controls</h2>
      <ul>
        <li>View and delete individual memories in Settings → Memory.</li>
        <li>Delete a whole conversation (messages, memories and call records go with it).</li>
        <li>Block a companion.</li>
        <li>Delete your account and all associated data, permanently.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        We keep your data until you delete it. Deleting your account removes conversations,
        messages, memories, call sessions and safety events, then closes the account.
      </p>

      <h2>Contact</h2>
      <p>Questions? Reach us at privacy@honeystudio.app.</p>
    </>
  );
}
