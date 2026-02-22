import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const STORE_PATH = join(homedir(), ".openclaw", "zalo-friend-requests.json");

export type PendingFriendRequest = {
  fromUid: string;
  message: string;
  receivedAt: number;
  src?: number;
};

type FriendRequestStore = {
  pending: PendingFriendRequest[];
};

function loadStore(): FriendRequestStore {
  if (!existsSync(STORE_PATH)) {
    return { pending: [] };
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    return JSON.parse(raw) as FriendRequestStore;
  } catch {
    return { pending: [] };
  }
}

function saveStore(store: FriendRequestStore): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export function addPendingRequest(fromUid: string, message: string, src?: number): void {
  const store = loadStore();
  // Avoid duplicates - replace if same fromUid already exists
  store.pending = store.pending.filter(r => r.fromUid !== fromUid);
  store.pending.push({
    fromUid,
    message,
    receivedAt: Date.now(),
    src,
  });
  saveStore(store);
}

export function removePendingRequest(fromUid: string): void {
  const store = loadStore();
  store.pending = store.pending.filter(r => r.fromUid !== fromUid);
  saveStore(store);
}

export function getPendingRequests(): PendingFriendRequest[] {
  return loadStore().pending;
}

export function clearPendingRequests(): void {
  saveStore({ pending: [] });
}
