import type { ChannelAccountSnapshot, ChannelStatusIssue } from "openclaw/plugin-sdk/channel-plugin-common";

type ZaloPersonalAccountStatus = {
  accountId?: unknown;
  enabled?: unknown;
  configured?: unknown;
  dmPolicy?: unknown;
  lastError?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object");

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : typeof value === "number" ? String(value) : undefined;

function readZaloPersonalAccountStatus(value: ChannelAccountSnapshot): ZaloPersonalAccountStatus | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    accountId: value.accountId,
    enabled: value.enabled,
    configured: value.configured,
    dmPolicy: value.dmPolicy,
    lastError: value.lastError,
  };
}

export function collectZaloPersonalStatusIssues(
  accounts: ChannelAccountSnapshot[],
): ChannelStatusIssue[] {
  const issues: ChannelStatusIssue[] = [];
  for (const entry of accounts) {
    const account = readZaloPersonalAccountStatus(entry);
    if (!account) {
      continue;
    }
    const accountId = asString(account.accountId) ?? "default";
    const enabled = account.enabled !== false;
    if (!enabled) {
      continue;
    }

    const configured = account.configured === true;

    if (!configured) {
      issues.push({
        channel: "zalo-personal",
        accountId,
        kind: "auth",
        message: "Not authenticated (no saved credentials).",
        fix: "Run: openclaw channels login --channel zalo-personal",
      });
      continue;
    }

    if (account.dmPolicy === "open") {
      issues.push({
        channel: "zalo-personal",
        accountId,
        kind: "config",
        message:
          'Zalo JS dmPolicy is "open", allowing any user to message the bot without pairing.',
        fix: 'Set channels["zalo-personal"].dmPolicy to "pairing" or "allowlist" to restrict access.',
      });
    }
  }
  return issues;
}
