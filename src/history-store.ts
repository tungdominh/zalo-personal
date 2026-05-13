// Persist every inbound Zalo message to a per-thread JSONL log so the agent
// can recall context from any DM/group later, even if dmPolicy="disabled" or
// the message wasn't @mentioned. The agent reads these files via its Read
// tool — no memory plugin required.

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const WORKSPACE_ROOT = path.join(
  process.env.OPENCLAW_STATE_DIR || path.join(os.homedir(), ".openclaw"),
  "workspace",
);
const THREADS_DIR = path.join(WORKSPACE_ROOT, "threads");
const PEERS_INDEX_PATH = path.join(WORKSPACE_ROOT, "peers", "zalo-personal.json");

const MAX_BYTES_PER_THREAD = 5 * 1024 * 1024; // 5MB rolling cap

export type HistoryEntry = {
  ts: number;
  msgId?: string;
  threadId: string;
  isGroup: boolean;
  groupId?: string;
  groupName?: string;
  senderId: string;
  senderName?: string;
  content: string;
  mediaUrls?: string[];
  wasMentioned?: boolean;
  replied: boolean;
};

function ensureDir(p: string) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

export function appendThreadHistory(entry: HistoryEntry): void {
  try {
    const threadDir = path.join(THREADS_DIR, entry.threadId);
    ensureDir(threadDir);
    const file = path.join(threadDir, "messages.jsonl");
    fs.appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");

    // Rolling cap: if file exceeds limit, archive to messages.prev.jsonl.
    try {
      const sz = fs.statSync(file).size;
      if (sz > MAX_BYTES_PER_THREAD) {
        const prev = path.join(threadDir, "messages.prev.jsonl");
        try { fs.unlinkSync(prev); } catch {}
        fs.renameSync(file, prev);
      }
    } catch {}
  } catch {
    // Capture-only path — never block reply pipeline on logging failure.
  }
}

export function rememberPeer(params: {
  threadId: string;
  isGroup: boolean;
  groupName?: string;
  senderId: string;
  senderName?: string;
}): void {
  try {
    ensureDir(path.dirname(PEERS_INDEX_PATH));
    let index: Record<string, any> = {};
    try {
      index = JSON.parse(fs.readFileSync(PEERS_INDEX_PATH, "utf8"));
    } catch {}
    const key = params.isGroup ? `group:${params.threadId}` : `user:${params.threadId}`;
    const existing = index[key] ?? {};
    index[key] = {
      ...existing,
      threadId: params.threadId,
      kind: params.isGroup ? "group" : "user",
      name: params.isGroup
        ? (params.groupName || existing.name)
        : (params.senderName || existing.name),
      lastSeenAt: Date.now(),
    };
    fs.writeFileSync(PEERS_INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
  } catch {}
}
