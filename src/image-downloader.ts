import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";

/**
 * Default allowed file extensions. Configurable via OPENCLAW_ALLOWED_FILE_TYPES env.
 * Set to "*" to allow all types. Comma-separated list of extensions.
 */
const DEFAULT_ALLOWED_TYPES = "*"; // all types allowed by default

function getAllowedTypes(): Set<string> | "*" {
  const env = process.env.OPENCLAW_ALLOWED_FILE_TYPES?.trim();
  if (!env || env === "*") return "*";
  return new Set(env.split(",").map(t => t.trim().toLowerCase().replace(/^\./, "")));
}

function isFileTypeAllowed(ext: string): boolean {
  const allowed = getAllowedTypes();
  if (allowed === "*") return true;
  return allowed.has(ext.toLowerCase());
}

/**
 * Download a file from a URL and save it locally.
 * Supports all file types: images, documents, archives, etc.
 * @param url - File URL to download
 * @param workspaceDir - Directory to save the file
 * @returns Local file path if successful, undefined if failed
 */
export async function downloadImageFromUrl(
  url: string,
  workspaceDir?: string,
): Promise<string | undefined> {
  try {
    const targetDir = workspaceDir || path.join(os.homedir(), ".openclaw/workspace/media");

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const urlHash = crypto.createHash("md5").update(url).digest("hex").substring(0, 8);
    const timestamp = formatLocalTimestamp();
    const ext = getExtensionFromUrl(url) || "bin";

    // Check if file type is allowed
    if (!isFileTypeAllowed(ext)) {
      console.log(`[downloader] Blocked file type: .${ext} (configure OPENCLAW_ALLOWED_FILE_TYPES)`);
      return undefined;
    }

    const filename = `${timestamp}-zalo-${urlHash}.${ext}`;
    const filePath = path.join(targetDir, filename);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[downloader] Failed to fetch ${url}: ${response.status}`);
      return undefined;
    }

    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    console.log(`[downloader] Downloaded: ${url} -> ${filePath} (${Math.round(buffer.byteLength / 1024)}KB)`);
    return filePath;
  } catch (err) {
    console.error(`[downloader] Error downloading ${url}:`, err);
    return undefined;
  }
}

/**
 * Download multiple files from URLs.
 */
export async function downloadImagesFromUrls(
  urls: string[],
  workspaceDir?: string,
): Promise<(string | undefined)[]> {
  const downloads = urls.map(url => downloadImageFromUrl(url, workspaceDir));
  return Promise.all(downloads);
}

/**
 * Format timestamp using local timezone.
 */
function formatLocalTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/**
 * Extract file extension from URL.
 */
function getExtensionFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}
