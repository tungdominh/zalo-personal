import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "openclaw/plugin-sdk/channel-plugin-common";
import { hasStoredCredentials } from "./zalo-client.js";
function listConfiguredAccountIds(cfg) {
    const accounts = cfg.channels?.['zalo-personal']?.accounts;
    if (!accounts || typeof accounts !== "object") {
        return [];
    }
    return Object.keys(accounts).filter(Boolean);
}
export function listZaloPersonalAccountIds(cfg) {
    const ids = listConfiguredAccountIds(cfg);
    if (ids.length === 0) {
        return [DEFAULT_ACCOUNT_ID];
    }
    return ids.toSorted((a, b) => a.localeCompare(b));
}
export function resolveDefaultZaloPersonalAccountId(cfg) {
    const zaloPersonalConfig = cfg.channels?.['zalo-personal'];
    if (zaloPersonalConfig?.defaultAccount?.trim()) {
        return zaloPersonalConfig.defaultAccount.trim();
    }
    const ids = listZaloPersonalAccountIds(cfg);
    if (ids.includes(DEFAULT_ACCOUNT_ID)) {
        return DEFAULT_ACCOUNT_ID;
    }
    return ids[0] ?? DEFAULT_ACCOUNT_ID;
}
function resolveAccountConfig(cfg, accountId) {
    const accounts = cfg.channels?.['zalo-personal']?.accounts;
    if (!accounts || typeof accounts !== "object") {
        return undefined;
    }
    return accounts[accountId];
}
function mergeZaloPersonalAccountConfig(cfg, accountId) {
    const raw = (cfg.channels?.['zalo-personal'] ?? {});
    const { accounts: _ignored, defaultAccount: _ignored2, ...base } = raw;
    const account = resolveAccountConfig(cfg, accountId) ?? {};
    return { ...base, ...account };
}
export async function checkZaloPersonalAuthenticated() {
    return hasStoredCredentials();
}
export async function resolveZaloPersonalAccount(params) {
    const accountId = normalizeAccountId(params.accountId);
    const baseEnabled = params.cfg.channels?.['zalo-personal']?.enabled !== false;
    const merged = mergeZaloPersonalAccountConfig(params.cfg, accountId);
    const accountEnabled = merged.enabled !== false;
    const enabled = baseEnabled && accountEnabled;
    const authenticated = await checkZaloPersonalAuthenticated();
    return {
        accountId,
        name: merged.name?.trim() || undefined,
        enabled,
        authenticated,
        config: merged,
    };
}
export function resolveZaloPersonalAccountSync(params) {
    const accountId = normalizeAccountId(params.accountId);
    const baseEnabled = params.cfg.channels?.['zalo-personal']?.enabled !== false;
    const merged = mergeZaloPersonalAccountConfig(params.cfg, accountId);
    const accountEnabled = merged.enabled !== false;
    const enabled = baseEnabled && accountEnabled;
    return {
        accountId,
        name: merged.name?.trim() || undefined,
        enabled,
        authenticated: false,
        config: merged,
    };
}
export async function listEnabledZaloPersonalAccounts(cfg) {
    const ids = listZaloPersonalAccountIds(cfg);
    const accounts = await Promise.all(ids.map((accountId) => resolveZaloPersonalAccount({ cfg, accountId })));
    return accounts.filter((account) => account.enabled);
}
export async function getZaloPersonalUserInfo() {
    try {
        const { getApi } = await import("./zalo-client.js");
        const api = await getApi();
        const raw = await api.fetchAccountInfo();
        const info = raw?.profile ?? raw;
        return info ? { userId: info.userId, displayName: info.displayName } : null;
    }
    catch {
        return null;
    }
}
