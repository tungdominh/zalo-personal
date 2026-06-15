import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const DEFAULT_CONFIG_PATH = join(homedir(), ".openclaw", "openclaw.json");
/**
 * Read OpenClaw config from ~/.openclaw/openclaw.json
 */
export function readOpenClawConfig(configPath = DEFAULT_CONFIG_PATH) {
    try {
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content);
    }
    catch (err) {
        throw new Error(`Failed to read config: ${err instanceof Error ? err.message : String(err)}`);
    }
}
/**
 * Write OpenClaw config to ~/.openclaw/openclaw.json
 */
export function writeOpenClawConfig(config, configPath = DEFAULT_CONFIG_PATH) {
    try {
        const content = JSON.stringify(config, null, 2);
        writeFileSync(configPath, content, "utf-8");
    }
    catch (err) {
        throw new Error(`Failed to write config: ${err instanceof Error ? err.message : String(err)}`);
    }
}
/**
 * Get zalo-personal channel config
 */
export function getZaloPersonalConfig(config) {
    return config.channels?.["zalo-personal"] ?? {};
}
/**
 * Update zalo-personal channel config
 */
export function updateZaloPersonalConfig(config, updates) {
    return {
        ...config,
        channels: {
            ...config.channels,
            "zalo-personal": {
                ...getZaloPersonalConfig(config),
                ...updates,
            },
        },
    };
}
/**
 * Add entry to array if not exists
 */
function addToArray(arr, entry) {
    const existing = arr ?? [];
    if (existing.includes(entry)) {
        return existing;
    }
    return [...existing, entry];
}
/**
 * Remove entry from array
 */
function removeFromArray(arr, entry) {
    const existing = arr ?? [];
    return existing.filter((item) => item !== entry);
}
/**
 * Add user to global denyFrom list
 */
export function addToDenyFrom(config, userId) {
    const zpConfig = getZaloPersonalConfig(config);
    const denyFrom = addToArray(zpConfig.denyFrom, userId);
    return updateZaloPersonalConfig(config, { denyFrom });
}
/**
 * Remove user from global denyFrom list
 */
export function removeFromDenyFrom(config, userId) {
    const zpConfig = getZaloPersonalConfig(config);
    const denyFrom = removeFromArray(zpConfig.denyFrom, userId);
    return updateZaloPersonalConfig(config, { denyFrom });
}
/**
 * Add user to group-specific denyUsers list
 */
export function addToGroupDenyUsers(config, groupId, userId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groups = zpConfig.groups ?? {};
    const groupConfig = groups[groupId] ?? {};
    const denyUsers = addToArray(groupConfig.denyUsers, userId);
    return updateZaloPersonalConfig(config, {
        groups: {
            ...groups,
            [groupId]: {
                ...groupConfig,
                denyUsers,
            },
        },
    });
}
/**
 * Remove user from group-specific denyUsers list
 */
export function removeFromGroupDenyUsers(config, groupId, userId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groups = zpConfig.groups ?? {};
    const groupConfig = groups[groupId];
    if (!groupConfig) {
        return config; // Group not configured, nothing to remove
    }
    const denyUsers = removeFromArray(groupConfig.denyUsers, userId);
    return updateZaloPersonalConfig(config, {
        groups: {
            ...groups,
            [groupId]: {
                ...groupConfig,
                denyUsers,
            },
        },
    });
}
/**
 * List all blocked users (global denyFrom)
 */
export function listBlockedUsers(config) {
    const zpConfig = getZaloPersonalConfig(config);
    return zpConfig.denyFrom ?? [];
}
/**
 * List all allowed users (allowFrom)
 */
export function listAllowedUsers(config) {
    const zpConfig = getZaloPersonalConfig(config);
    return zpConfig.allowFrom ?? [];
}
/**
 * Add user to group-specific allowUsers list
 */
export function addToGroupAllowUsers(config, groupId, userId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groups = zpConfig.groups ?? {};
    const groupConfig = groups[groupId] ?? {};
    const allowUsers = addToArray(groupConfig.allowUsers, userId);
    return updateZaloPersonalConfig(config, {
        groups: {
            ...groups,
            [groupId]: {
                ...groupConfig,
                allowUsers,
            },
        },
    });
}
/**
 * Remove user from group-specific allowUsers list
 */
export function removeFromGroupAllowUsers(config, groupId, userId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groups = zpConfig.groups ?? {};
    const groupConfig = groups[groupId];
    if (!groupConfig) {
        return config;
    }
    const allowUsers = removeFromArray(groupConfig.allowUsers, userId);
    return updateZaloPersonalConfig(config, {
        groups: {
            ...groups,
            [groupId]: {
                ...groupConfig,
                allowUsers,
            },
        },
    });
}
/**
 * List allowed users in specific group
 */
export function listAllowedUsersInGroup(config, groupId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groupConfig = zpConfig.groups?.[groupId];
    return groupConfig?.allowUsers ?? [];
}
/**
 * List blocked users in specific group
 */
export function listBlockedUsersInGroup(config, groupId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groupConfig = zpConfig.groups?.[groupId];
    return groupConfig?.denyUsers ?? [];
}
/**
 * Set requireMention for a specific group
 */
export function setGroupRequireMention(config, groupId, requireMention) {
    const zpConfig = getZaloPersonalConfig(config);
    const groups = zpConfig.groups ?? {};
    const groupConfig = groups[groupId] ?? {};
    return updateZaloPersonalConfig(config, {
        groups: {
            ...groups,
            [groupId]: {
                ...groupConfig,
                requireMention,
            },
        },
    });
}
/**
 * Get requireMention setting for a specific group.
 * Checks groupId first, then wildcard "*", then returns undefined (use default).
 */
export function getGroupRequireMention(config, groupId) {
    const zpConfig = getZaloPersonalConfig(config);
    const groups = zpConfig.groups ?? {};
    const direct = groups[groupId];
    if (direct && typeof direct.requireMention === "boolean") {
        return direct.requireMention;
    }
    const wildcard = groups["*"];
    if (wildcard && typeof wildcard.requireMention === "boolean") {
        return wildcard.requireMention;
    }
    return undefined;
}
