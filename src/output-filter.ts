/**
 * Output filter — redact internal information before sending to users.
 *
 * Prevents leaking:
 * - File paths (/root/..., /home/..., ~/.openclaw/...)
 * - MCP tool names (mcp__zalo__send, mcp__memory__...)
 * - Session/thread IDs (UUIDs, numeric IDs)
 * - Config values (API keys, tokens)
 * - Process info (PID, PM2 commands)
 * - OpenClaw internals (plugin-sdk, node_modules paths)
 *
 * Redaction is best-effort — applied via regex patterns.
 * Does NOT block messages, only sanitizes.
 */

const REDACTION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Absolute file paths
  { pattern: /\/root\/[^\s"'`)\]}>]+/g, replacement: "[path]" },
  { pattern: /\/home\/[^\s"'`)\]}>]+/g, replacement: "[path]" },
  { pattern: /~\/\.openclaw\/[^\s"'`)\]}>]+/g, replacement: "[path]" },
  { pattern: /\/usr\/lib\/node_modules\/[^\s"'`)\]}>]+/g, replacement: "[path]" },

  // MCP tool names (mcp__provider__tool)
  { pattern: /\bmcp__[a-z_-]+__[a-z_-]+/g, replacement: "[tool]" },

  // OpenClaw plugin-sdk internals
  { pattern: /openclaw\/plugin-sdk\/[^\s"'`)\]}>]+/g, replacement: "[internal]" },
  { pattern: /openclaw\/dist\/[^\s"'`)\]}>]+/g, replacement: "[internal]" },

  // Session IDs (UUIDs)
  { pattern: /\bsession[_-]?id[:\s=]+[a-f0-9-]{36}/gi, replacement: "session [id]" },

  // API keys / tokens (common patterns)
  { pattern: /\b(api[_-]?key|token|secret|password)[:\s=]+["']?[A-Za-z0-9_\-./+=]{20,}["']?/gi, replacement: "$1=[redacted]" },

  // PM2 / process commands
  { pattern: /\bpm2\s+(restart|stop|start|delete|logs)\s+[^\s]+/g, replacement: "pm2 [command]" },

  // Node.js error stacks with internal paths
  { pattern: /at\s+[^\n]*node_modules[^\n]*/g, replacement: "at [internal]" },
  { pattern: /at\s+[^\n]*\/dist\/[^\n]*/g, replacement: "at [internal]" },
];

/**
 * Redact internal information from text before sending to users.
 * Returns sanitized text.
 */
export function redactOutput(text: string): string {
  let result = text;
  for (const { pattern, replacement } of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Check if text contains patterns that should be redacted.
 */
export function hasInternalInfo(text: string): boolean {
  return REDACTION_PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(text);
  });
}
