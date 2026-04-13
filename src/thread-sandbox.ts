/**
 * Per-thread sandbox directory management.
 *
 * Each thread (DM or group) gets an isolated directory for:
 * - Downloaded media (images, voice, video)
 * - Files created by the bot
 * - Temporary files during processing
 *
 * Layout: ~/.openclaw/workspace/threads/{threadId}/
 *         ~/.openclaw/workspace/threads/{threadId}/media/
 *         ~/.openclaw/workspace/threads/{threadId}/files/
 *
 * Cleanup: size-based, not time-based.
 * When a sandbox exceeds maxSizeMB, oldest files are deleted first.
 * Files are never deleted just because they're old — only when space is needed.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const WORKSPACE_BASE = path.join(os.homedir(), ".openclaw", "workspace", "threads");
const DEFAULT_MAX_SIZE_MB = 200; // per thread, configurable via OPENCLAW_SANDBOX_MAX_MB env

/**
 * Get configured max sandbox size from environment or default.
 */
function getMaxSizeMB(): number {
  const envVal = process.env.OPENCLAW_SANDBOX_MAX_MB;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_SIZE_MB;
}

/**
 * Get the sandbox directory for a thread. Creates if not exists.
 */
export function getThreadSandbox(threadId: string): string {
  const sanitized = sanitizeThreadId(threadId);
  const dir = path.join(WORKSPACE_BASE, sanitized);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Get the media subdirectory for a thread.
 */
export function getThreadMediaDir(threadId: string): string {
  const dir = path.join(getThreadSandbox(threadId), "media");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Get the files subdirectory for a thread.
 */
export function getThreadFilesDir(threadId: string): string {
  const dir = path.join(getThreadSandbox(threadId), "files");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Validate that a path is within the thread's sandbox.
 */
export function validateSandboxPath(threadId: string, filePath: string): boolean {
  const sandbox = getThreadSandbox(threadId);
  const resolved = path.resolve(sandbox, filePath);
  return resolved.startsWith(sandbox);
}

/**
 * Enforce sandbox size limit. Deletes oldest files first when over limit.
 * Returns number of files deleted.
 */
export function enforceSandboxSizeLimit(threadId: string, maxSizeMB: number = getMaxSizeMB()): number {
  const sandbox = getThreadSandbox(threadId);
  const maxBytes = maxSizeMB * 1024 * 1024;

  // Collect all files recursively with stats
  const files = listFilesRecursive(sandbox);
  if (files.length === 0) return 0;

  // Calculate total size
  let totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize <= maxBytes) return 0;

  // Sort oldest first (by mtime)
  files.sort((a, b) => a.mtimeMs - b.mtimeMs);

  // Delete oldest files until under limit
  let deleted = 0;
  for (const file of files) {
    if (totalSize <= maxBytes) break;
    try {
      fs.unlinkSync(file.path);
      totalSize -= file.size;
      deleted++;
    } catch {
      // Skip files that can't be deleted
    }
  }

  // Clean up empty directories
  cleanEmptyDirs(sandbox);

  return deleted;
}

/**
 * Get current sandbox size in bytes.
 */
export function getSandboxSize(threadId: string): number {
  const sandbox = getThreadSandbox(threadId);
  const files = listFilesRecursive(sandbox);
  return files.reduce((sum, f) => sum + f.size, 0);
}

/**
 * Sanitize thread ID for use as directory name.
 */
function sanitizeThreadId(threadId: string): string {
  return threadId.replace(/[/\\:*?"<>|.\s]/g, "_").slice(0, 100);
}

/**
 * List all files recursively in a directory.
 */
function listFilesRecursive(dir: string): Array<{ path: string; size: number; mtimeMs: number }> {
  const results: Array<{ path: string; size: number; mtimeMs: number }> = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...listFilesRecursive(fullPath));
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          results.push({ path: fullPath, size: stat.size, mtimeMs: stat.mtimeMs });
        } catch {
          // Skip inaccessible files
        }
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return results;
}

/**
 * Remove empty directories (leaf-first).
 */
function cleanEmptyDirs(dir: string): void {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const subdir = path.join(dir, entry.name);
        cleanEmptyDirs(subdir);
        try {
          const contents = fs.readdirSync(subdir);
          if (contents.length === 0) fs.rmdirSync(subdir);
        } catch {}
      }
    }
  } catch {}
}
