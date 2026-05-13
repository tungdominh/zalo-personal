// Track msgIds the bot itself has just sent so the inbound listener can drop
// them. Without this, any group that opts into allowSelf would echo the bot's
// own replies and trigger an infinite reply loop.

const recent = new Map<string, number>();
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 1000;

export function markOutboundMsgId(msgId: string | undefined | null): void {
  if (!msgId) return;
  const now = Date.now();
  recent.set(String(msgId), now);
  if (recent.size > MAX_ENTRIES) {
    const cutoff = now - TTL_MS;
    for (const [k, t] of recent) {
      if (t < cutoff) recent.delete(k);
    }
  }
}

export function wasRecentlyOutbound(msgId: string | undefined | null): boolean {
  if (!msgId) return false;
  const ts = recent.get(String(msgId));
  if (!ts) return false;
  if (Date.now() - ts > TTL_MS) {
    recent.delete(String(msgId));
    return false;
  }
  return true;
}
