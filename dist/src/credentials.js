import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const CREDENTIALS_PATH = join(homedir(), ".openclaw", "zalo-personal-credentials.json");
export function saveCredentials(data) {
    writeFileSync(CREDENTIALS_PATH, JSON.stringify(data, null, 2), "utf-8");
}
export function loadCredentials() {
    if (!existsSync(CREDENTIALS_PATH)) {
        return null;
    }
    try {
        const raw = readFileSync(CREDENTIALS_PATH, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function deleteCredentials() {
    if (existsSync(CREDENTIALS_PATH)) {
        unlinkSync(CREDENTIALS_PATH);
    }
}
export function hasCredentials() {
    return existsSync(CREDENTIALS_PATH);
}
export function refreshCredentials(freshCookies) {
    const existing = loadCredentials();
    if (!existing)
        return;
    existing.cookie = freshCookies;
    saveCredentials(existing);
}
