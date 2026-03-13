import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ZaloPersonalConfig } from "./types.js";

const DEFAULT_CONFIG_PATH = join(homedir(), ".openclaw", "openclaw.json");

export type OpenClawConfig = {
  channels?: {
    "zalo-personal"?: ZaloPersonalConfig;
    [key: string]: any;
  };
  [key: string]: any;
};

/**
 * Read OpenClaw config from ~/.openclaw/openclaw.json
 */
export function readOpenClawConfig(configPath = DEFAULT_CONFIG_PATH): OpenClawConfig {
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to read config: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Write OpenClaw config to ~/.openclaw/openclaw.json
 */
export function writeOpenClawConfig(config: OpenClawConfig, configPath = DEFAULT_CONFIG_PATH): void {
  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(configPath, content, "utf-8");
  } catch (err) {
    throw new Error(`Failed to write config: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Get zalo-personal channel config
 */
export function getZaloPersonalConfig(config: OpenClawConfig): ZaloPersonalConfig {
  return config.channels?.["zalo-personal"] ?? {};
}

/**
 * Update zalo-personal channel config
 */
export function updateZaloPersonalConfig(
  config: OpenClawConfig,
  updates: Partial<ZaloPersonalConfig>,
): OpenClawConfig {
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
function addToArray<T>(arr: T[] | undefined, entry: T): T[] {
  const existing = arr ?? [];
  if (existing.includes(entry)) {
    return existing;
  }
  return [...existing, entry];
}

/**
 * Remove entry from array
 */
function removeFromArray<T>(arr: T[] | undefined, entry: T): T[] {
  const existing = arr ?? [];
  return existing.filter((item) => item !== entry);
}

/**
 * Add user to global denyFrom list
 */
export function addToDenyFrom(config: OpenClawConfig, userId: string): OpenClawConfig {
  const zpConfig = getZaloPersonalConfig(config);
  const denyFrom = addToArray(zpConfig.denyFrom, userId);
  return updateZaloPersonalConfig(config, { denyFrom });
}

/**
 * Remove user from global denyFrom list
 */
export function removeFromDenyFrom(config: OpenClawConfig, userId: string): OpenClawConfig {
  const zpConfig = getZaloPersonalConfig(config);
  const denyFrom = removeFromArray(zpConfig.denyFrom, userId);
  return updateZaloPersonalConfig(config, { denyFrom });
}

/**
 * Add user to group-specific denyUsers list
 */
export function addToGroupDenyUsers(
  config: OpenClawConfig,
  groupId: string,
  userId: string,
): OpenClawConfig {
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
export function removeFromGroupDenyUsers(
  config: OpenClawConfig,
  groupId: string,
  userId: string,
): OpenClawConfig {
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
export function listBlockedUsers(config: OpenClawConfig): Array<string | number> {
  const zpConfig = getZaloPersonalConfig(config);
  return zpConfig.denyFrom ?? [];
}

/**
 * List all allowed users (allowFrom)
 */
export function listAllowedUsers(config: OpenClawConfig): Array<string | number> {
  const zpConfig = getZaloPersonalConfig(config);
  return zpConfig.allowFrom ?? [];
}

/**
 * Add user to group-specific allowUsers list
 */
export function addToGroupAllowUsers(
  config: OpenClawConfig,
  groupId: string,
  userId: string,
): OpenClawConfig {
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
export function removeFromGroupAllowUsers(
  config: OpenClawConfig,
  groupId: string,
  userId: string,
): OpenClawConfig {
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
export function listAllowedUsersInGroup(config: OpenClawConfig, groupId: string): Array<string | number> {
  const zpConfig = getZaloPersonalConfig(config);
  const groupConfig = zpConfig.groups?.[groupId];
  return groupConfig?.allowUsers ?? [];
}

/**
 * List blocked users in specific group
 */
export function listBlockedUsersInGroup(config: OpenClawConfig, groupId: string): Array<string | number> {
  const zpConfig = getZaloPersonalConfig(config);
  const groupConfig = zpConfig.groups?.[groupId];
  return groupConfig?.denyUsers ?? [];
}

/**
 * Set requireMention for a specific group
 */
export function setGroupRequireMention(
  config: OpenClawConfig,
  groupId: string,
  requireMention: boolean,
): OpenClawConfig {
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
export function getGroupRequireMention(
  config: OpenClawConfig,
  groupId: string,
): boolean | undefined {
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
