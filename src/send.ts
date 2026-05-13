import { ThreadType, TextStyle, type Style, type MessageContent, type Mention, type SendMessageQuote } from "zca-js";
import { getApi } from "./zalo-client.js";
import { resolveOutboundMentions } from "./mention-parser.js";
import { redactOutput } from "./output-filter.js";
import { markOutboundMsgId } from "./outbound-tracker.js";
import { readOpenClawConfig } from "./config-manager.js";
import * as fs from "fs";
import * as path from "path";

// zca-js sendMessage can produce up to TWO server-side messages per call when
// the payload mixes text + attachment (or oversized text + quote): one for
// `result.message` and one (or more) for `result.attachment[]`. Each gets a
// distinct msgId, and EACH is echoed back to the listener. We must mark every
// returned msgId so the outbound-tracker can drop the echoes — otherwise the
// untracked one looks like a fresh inbound and the bot reply-loops on its
// own message.
function markAllMsgIds(result: any): string | undefined {
  let primary: string | undefined;
  const msgFromMessage = result?.message?.msgId;
  if (msgFromMessage != null) {
    markOutboundMsgId(String(msgFromMessage));
    primary = String(msgFromMessage);
  }
  const atts = Array.isArray(result?.attachment) ? result.attachment : [];
  for (const a of atts) {
    const id = a?.msgId;
    if (id != null) {
      markOutboundMsgId(String(id));
      if (!primary) primary = String(id);
    }
  }
  return primary;
}

// In silent DM mode we still want OpenClaw's session store to capture the
// agent's would-be reply (so future recalls have full context), but we must
// NOT actually push the message to the peer over zca-js. This guard reads
// the live config every send and short-circuits the network call for DMs
// while letting the rest of the send() return path run normally.
function shouldSuppressOutbound(threadId: string, isGroup: boolean): boolean {
  if (isGroup) return false;
  try {
    const cfg = readOpenClawConfig();
    const channel = cfg.channels?.["zalo-personal"];
    const accountCfg = channel?.accounts?.default ?? {};
    const dmPolicy = accountCfg.dmPolicy ?? channel?.dmPolicy ?? "open";
    return dmPolicy === "silent";
  } catch {
    return false;
  }
}

const ZALO_MAX_TEXT_LENGTH = 4000;
const TRUNCATION_SUFFIX = "\n\n[...tin nhắn quá dài, đã cắt bớt]";

/**
 * Convert markdown to Zalo rich text + TextStyle spans.
 *
 * Zalo accepts per-range styles matching the client toolbar: Bold / Italic /
 * Underline / StrikeThrough / Small / Big / color (red, orange, yellow, green)
 * / UnorderedList / OrderedList / Indent. No monospace. Links are plain text
 * Zalo auto-detects as tappable.
 *
 * Strategy: process each line independently. For each line, peel off its
 * block marker (heading / bullet / number / blockquote) and emit an
 * appropriate block-level span for the stripped line content. Then run inline
 * passes on that line content, tracking offset shifts so inline spans stay
 * aligned after `**`/`~~`/etc markers are removed. Finally append the line to
 * the output buffer with newline, accumulating a global cursor so all spans
 * are stored in FINAL-text offsets.
 *
 * Handled:
 *  - **bold**, ***bold italic*** → Bold
 *  - *italic*, _italic_          → Italic
 *  - __underline__               → Underline
 *  - ~~strikethrough~~           → StrikeThrough
 *  - `inline code`               → Bold (Zalo has no mono font)
 *  - ```fenced code blocks```    → strip fences, keep content
 *  - # / ## / ###… headings       → content becomes Big + Bold (Zalo-native)
 *  - - / * / + bullets           → UnorderedList span on stripped content
 *  - 1. 2. 3. numbered lists     → OrderedList span on stripped content
 *  -   - nested lists (indent)   → extra Indent span per 2-space level
 *  - [text](url)                 → "text (url)" so URL stays tappable
 *  - >blockquote                 → "│ text" (Zalo has no quote style)
 *  - <small>text</small>         → Small (f_13) inline span
 *  - > [!NOTE|TIP|IMPORTANT|…]   → coloured blockquote using GFM admonitions:
 *      NOTE      → Yellow       (informational)
 *      TIP       → Green        (positive / suggestion)
 *      IMPORTANT → Yellow       (emphasis, same as NOTE)
 *      WARNING   → Orange       (caution)
 *      CAUTION   → Red          (danger)
 *      DANGER    → Red          (alias for CAUTION)
 *  - 3+ blank lines              → collapsed to 2
 */
type StyleSpan = { start: number; len: number; st: Exclude<TextStyle, TextStyle.Indent> };

/** Inline-markdown passes using a placeholder-token scheme.
 *
 *  Naive approach (run each regex on the text and emit spans using result.length)
 *  breaks when later passes strip characters that lie BEFORE earlier-recorded
 *  span positions — the earlier spans then point into the wrong part of the
 *  final text. That's how "__Chữ gạch chân__" ended up covering "ữ gạch chân."
 *  in the live test: the `**` markers stripped by a later pass shifted the
 *  underline span by two chars and it was never re-aligned.
 *
 *  Fix: replace each matched segment with a sentinel token `\u0001<N>\u0001`,
 *  stash the original content + style at index N. After all passes are done
 *  tokens are still unambiguous and their sizes no longer depend on strip
 *  amounts in other passes. Then a single final walk replaces each token
 *  with its content at the correct final offset and emits the span. */
function applyInlineStyles(text: string): { text: string; styles: StyleSpan[] } {
  const patterns: Array<{ regex: RegExp; style: TextStyle }> = [
    // Order: longer / more-specific markers first so regex doesn't greedy-match
    // the wrong pattern.
    { regex: /<small>([^<\n]+)<\/small>/gi, style: TextStyle.Small },
    { regex: /\*\*\*([^*\n]+)\*\*\*/g, style: TextStyle.Bold },   // ***x*** → Bold (italic lost in Zalo)
    { regex: /\*\*([^*\n]+)\*\*/g, style: TextStyle.Bold },
    { regex: /__([^_\n]+)__/g, style: TextStyle.Underline },
    { regex: /~~([^~\n]+)~~/g, style: TextStyle.StrikeThrough },
    { regex: /`([^`\n]+)`/g, style: TextStyle.Bold },              // inline code → Bold fallback
    { regex: /(?<![*\w])\*(?!\*)([^*\n]+?)\*(?!\*)(?!\w)/g, style: TextStyle.Italic },
    { regex: /(?<![_\w])_(?!_)([^_\n]+?)_(?!_)(?!\w)/g, style: TextStyle.Italic },
  ];

  // 1. Tokenise: successive passes replace each match with a sentinel token.
  //    Already-tokenised content is inert because later regexes don't match
  //    the token characters (\u0001 + digits + \u0001).
  const stored: Array<{ content: string; style: TextStyle }> = [];
  let work = text;
  for (const { regex, style } of patterns) {
    work = work.replace(regex, (_whole, content) => {
      const n = stored.length;
      stored.push({ content, style });
      return `\u0001${n}\u0001`;
    });
  }

  // 2. Final walk: expand tokens, track spans against the rebuilt string.
  const styles: StyleSpan[] = [];
  let out = "";
  let i = 0;
  while (i < work.length) {
    if (work.charCodeAt(i) === 0x0001) {
      const end = work.indexOf("\u0001", i + 1);
      if (end === -1) { out += work[i++]; continue; }
      const n = Number(work.slice(i + 1, end));
      const entry = stored[n];
      if (!entry) { out += work[i++]; continue; }
      const start = out.length;
      out += entry.content;
      styles.push({ start, len: entry.content.length, st: entry.style as StyleSpan["st"] });
      i = end + 1;
    } else {
      out += work[i++];
    }
  }
  return { text: out, styles };
}

export function markdownToZaloStyles(input: string): { text: string; styles: Style[] } {
  let src = input;

  // ---- Global pre-normalisation (whole-text, no offset bookkeeping) -------
  // Strip fenced code block fences, keep inner content as plain text.
  src = src.replace(/```(?:\w+)?\n?([\s\S]*?)```/g, (_, body) => body.trimEnd());
  // Collapse 3+ blank lines to 2.
  src = src.replace(/\n{3,}/g, "\n\n");
  // [text](url) → "text (url)" (skip if they're identical to avoid "url (url)").
  src = src.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, (_, t, u) => {
    return t.trim() === u.trim() ? u : `${t} (${u})`;
  });

  // LLMs often emit admonitions as "> [!TIP] content on same line" instead of
  // the canonical GFM two-line form. Expand the inline variant so the block
  // pre-scan below treats both shapes identically.
  src = src.replace(/^(>[ \t]*)\[!([A-Z]+)\][ \t]+(\S.*)$/gm, "$1[!$2]\n> $3");

  // ---- Admonition pre-pass: "> [!TYPE]\n> body..." → stash colour per block -
  // GFM admonitions turn a blockquote into a call-out. We extract the type
  // from the first line, drop the marker, and carry a per-line colour
  // through the rest of the block (lines starting with `>` that follow).
  // Maps: NOTE/IMPORTANT=Yellow, TIP=Green, WARNING=Orange, CAUTION/DANGER=Red.
  const ADMONITION_COLOR: Record<string, TextStyle> = {
    NOTE: TextStyle.Yellow,
    IMPORTANT: TextStyle.Yellow,
    TIP: TextStyle.Green,
    WARNING: TextStyle.Orange,
    CAUTION: TextStyle.Red,
    DANGER: TextStyle.Red,
  };
  // Pre-scan: map source-line-index → colour TextStyle for blockquote lines.
  const lineAdmonitionColor: Record<number, TextStyle> = {};
  {
    const srcLines = src.split("\n");
    let active: TextStyle | null = null;
    for (let j = 0; j < srcLines.length; j++) {
      const ln = srcLines[j];
      const mAdm = /^>\s*\[!([A-Z]+)\]\s*$/.exec(ln);
      if (mAdm) {
        active = ADMONITION_COLOR[mAdm[1]] ?? null;
        continue; // marker line; we'll drop it when rendering
      }
      if (/^>\s?/.test(ln)) {
        if (active) lineAdmonitionColor[j] = active;
      } else {
        active = null; // blockquote ended → clear
      }
    }
  }

  // ---- Per-line pass ------------------------------------------------------
  const lines = src.split("\n");
  const outParts: string[] = [];
  const styles: Style[] = [];
  let cursor = 0;

  const pushBlockStyle = (start: number, len: number, st: Exclude<TextStyle, TextStyle.Indent>) => {
    if (len > 0) styles.push({ start, len, st });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip admonition marker lines outright (the colour is already applied to
    // the body lines below). Drop the newline too — we don't want a visible
    // blank line where the marker used to be.
    if (/^>\s*\[![A-Z]+\]\s*$/.test(line)) {
      continue;
    }

    // Detect block type + strip marker → keep `content` + `indent` prefix.
    let content = line;
    let indent = "";
    let blockSpans: Array<Exclude<TextStyle, TextStyle.Indent>> = [];
    let quotePrefix = "";

    const mHead = /^(#{1,6})[ \t]+(.+)$/.exec(line);
    const mUl   = !mHead && /^(\s*)[-*+][ \t]+(.+)$/.exec(line);
    const mOl   = !mHead && !mUl && /^(\s*)\d+\.[ \t]+(.+)$/.exec(line);
    const mQuote = !mHead && !mUl && !mOl && /^>[ \t]?(.*)$/.exec(line);

    if (mHead) {
      content = mHead[2].trimEnd();
      // Big makes headings visibly larger; Bold adds weight for older clients.
      blockSpans = [TextStyle.Big, TextStyle.Bold];
    } else if (mUl) {
      indent = mUl[1];
      content = mUl[2];
      blockSpans = [TextStyle.UnorderedList];
    } else if (mOl) {
      indent = mOl[1];
      content = mOl[2];
      blockSpans = [TextStyle.OrderedList];
    } else if (mQuote) {
      content = mQuote[1];
      quotePrefix = "│ ";
    }

    // Colour from admonition block (applies to the full line content).
    const lineColor = lineAdmonitionColor[i];
    if (lineColor) {
      blockSpans.push(lineColor as Exclude<TextStyle, TextStyle.Indent>);
    }

    // Inline styles on the content only.
    const { text: styledContent, styles: inlineStyles } = applyInlineStyles(content);

    // Write to output: indent + quotePrefix + styledContent
    const lineStartInOutput = cursor + indent.length + quotePrefix.length;
    const lineText = `${indent}${quotePrefix}${styledContent}`;
    outParts.push(lineText);

    // Emit block spans over the styled content range in FINAL offsets.
    for (const st of blockSpans) {
      pushBlockStyle(lineStartInOutput, styledContent.length, st);
    }
    // Emit inline spans, shifted by lineStartInOutput.
    for (const s of inlineStyles) {
      styles.push({ start: lineStartInOutput + s.start, len: s.len, st: s.st });
    }

    // Emit Indent span for nested list items. Each 2 spaces of source
    // indentation becomes one level. zca-js encodes Indent by substituting
    // "$" in "ind_$" with `${indentSize}0` — so indentSize:1 → "ind_10"
    // (shift level 1), indentSize:2 → "ind_20" (shift level 2), etc.
    // Indent only applies to real list items; bare indented paragraphs
    // would look weird with a list-style offset.
    if ((mUl || mOl) && indent.length >= 2) {
      const level = Math.floor(indent.length / 2);
      styles.push({
        start: lineStartInOutput,
        len: styledContent.length,
        st: TextStyle.Indent,
        indentSize: level,
      } as Style);
    }

    cursor += lineText.length;
    if (i < lines.length - 1) { outParts.push("\n"); cursor += 1; }
  }

  return { text: outParts.join(""), styles };
}

/** Binary search count of how many entries in `sorted` are strictly less than `value`. */
function countStripsBefore(sorted: number[], value: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export type ZaloPersonalSendOptions = {
  mediaUrl?: string;
  caption?: string;
  isGroup?: boolean;
  localPath?: string;  // Local file path to upload
  cleanupAfterUpload?: boolean;  // Delete local file after upload
  quote?: SendMessageQuote;  // Quote/reply to a specific message
};

export type ZaloPersonalSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
};

export async function sendMessageZaloPersonal(
  threadId: string,
  text: string,
  options: ZaloPersonalSendOptions = {},
): Promise<ZaloPersonalSendResult> {
  if (!threadId?.trim()) {
    return { ok: false, error: "No threadId provided" };
  }

  // Silent DM mode: agent already produced a reply, we record it via
  // OpenClaw's session store but do NOT push it to the Zalo peer.
  if (shouldSuppressOutbound(threadId, options.isGroup === true)) {
    console.log(`[zalo-personal] suppressed DM outbound to ${threadId} (dmPolicy=silent) text="${text.slice(0, 80)}"`);
    return { ok: true, messageId: undefined };
  }

  // Handle local file upload (explicit)
  if (options.localPath) {
    return uploadAndSendLocalImage(threadId, options.localPath, {
      ...options,
      caption: text || options.caption,
    });
  }

  // Auto-detect if text is a local file path
  if (text && isLocalFilePath(text.trim()) && fs.existsSync(text.trim())) {
    console.log("[zalo-personal] Auto-detected local file path:", text.trim());
    return uploadAndSendLocalImage(threadId, text.trim(), {
      ...options,
      caption: options.caption,
    });
  }

  if (options.mediaUrl) {
    return sendMediaZaloPersonal(threadId, options.mediaUrl, {
      ...options,
      caption: text || options.caption,
    });
  }

  try {
    const api = await getApi();
    const type = options.isGroup ? ThreadType.Group : ThreadType.User;
    // Redact internal info (paths, tool names, tokens) before sending
    const redacted = redactOutput(text);
    // Truncate to Zalo's limit with indicator
    const truncated = redacted.length > ZALO_MAX_TEXT_LENGTH
      ? redacted.slice(0, ZALO_MAX_TEXT_LENGTH - TRUNCATION_SUFFIX.length) + TRUNCATION_SUFFIX
      : redacted;
    const { text: postMarkdownText, styles } = markdownToZaloStyles(truncated);
    // Resolve @[Name]/@Name → Zalo Mention[] AFTER markdown styling. Mention
    // parsing strips `[`/`]`, which can shift any style span that started
    // after a stripped position; we walk styles once and shift each by the
    // count of strip indices below its start so style highlighting stays
    // aligned with the final outbound text.
    let outboundText = postMarkdownText;
    let mentions: Mention[] = [];
    let alignedStyles = styles;
    if (options.isGroup) {
      const resolved = await resolveOutboundMentions(threadId.trim(), postMarkdownText);
      outboundText = resolved.text;
      mentions = resolved.mentions;
      if (resolved.stripIndices.length > 0 && styles.length > 0) {
        alignedStyles = styles.map((s) => {
          const shift = countStripsBefore(resolved.stripIndices, s.start);
          return shift === 0 ? s : { ...s, start: s.start - shift };
        });
      }
    }
    const content: { msg: string; styles?: Style[]; mentions?: Mention[]; quote?: SendMessageQuote } = { msg: outboundText };
    if (alignedStyles.length > 0) {
      content.styles = alignedStyles;
    }
    if (mentions.length > 0) {
      content.mentions = mentions;
    }
    if (options.quote) {
      content.quote = options.quote;
    }
    const result = await api.sendMessage(
      content,
      threadId.trim(),
      type,
    );
    const msgId = markAllMsgIds(result);
    return { ok: true, messageId: msgId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendMediaZaloPersonal(
  threadId: string,
  mediaUrl: string,
  options: ZaloPersonalSendOptions = {},
): Promise<ZaloPersonalSendResult> {
  if (!threadId?.trim()) {
    return { ok: false, error: "No threadId provided" };
  }
  if (!mediaUrl?.trim()) {
    return { ok: false, error: "No media URL provided" };
  }

  if (shouldSuppressOutbound(threadId, options.isGroup === true)) {
    console.log(`[zalo-personal] suppressed DM media outbound to ${threadId} (dmPolicy=silent)`);
    return { ok: true, messageId: undefined };
  }

  try {
    const api = await getApi();
    const type = options.isGroup ? ThreadType.Group : ThreadType.User;

    // Use sendLink for URLs as zca-js doesn't support sending images by URL directly
    const result = await api.sendLink(
      {
        url: mediaUrl.trim(),
        title: options.caption || mediaUrl.trim(),
      },
      threadId.trim(),
      type,
    );
    const msgId = markAllMsgIds(result);
    return { ok: true, messageId: msgId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendLinkZaloPersonal(
  threadId: string,
  url: string,
  options: ZaloPersonalSendOptions = {},
): Promise<ZaloPersonalSendResult> {
  if (!threadId?.trim()) {
    return { ok: false, error: "No threadId provided" };
  }
  if (!url?.trim()) {
    return { ok: false, error: "No URL provided" };
  }

  if (shouldSuppressOutbound(threadId, options.isGroup === true)) {
    console.log(`[zalo-personal] suppressed DM link outbound to ${threadId} (dmPolicy=silent)`);
    return { ok: true, messageId: undefined };
  }

  try {
    const api = await getApi();
    const type = options.isGroup ? ThreadType.Group : ThreadType.User;
    const result = await api.sendLink(
      { url: url.trim() },
      threadId.trim(),
      type,
    );
    const msgId = markAllMsgIds(result);
    return { ok: true, messageId: msgId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Upload a local image file to Zalo and send it
 * @param threadId - Chat thread ID
 * @param localPath - Local file path to upload
 * @param options - Send options including caption and cleanup flag
 */
async function uploadAndSendLocalImage(
  threadId: string,
  localPath: string,
  options: ZaloPersonalSendOptions = {},
): Promise<ZaloPersonalSendResult> {
  console.log("[zalo-personal] uploadAndSendLocalImage called:", { threadId, localPath, options });

  if (!threadId?.trim()) {
    return { ok: false, error: "No threadId provided" };
  }
  if (!localPath?.trim()) {
    return { ok: false, error: "No local path provided" };
  }

  if (shouldSuppressOutbound(threadId, options.isGroup === true)) {
    console.log(`[zalo-personal] suppressed DM image outbound to ${threadId} (dmPolicy=silent)`);
    return { ok: true, messageId: undefined };
  }

  // Check if file exists
  if (!fs.existsSync(localPath)) {
    console.error(`[zalo-personal] File not found: ${localPath}`);
    return { ok: false, error: `File not found: ${localPath}` };
  }

  try {
    const api = await getApi();
    const type = options.isGroup ? ThreadType.Group : ThreadType.User;

    console.log(`[zalo-personal] Uploading and sending: ${localPath} to thread ${threadId}`);

    // Send message with attachment - sendMessage will handle the upload internally
    const result = await api.sendMessage(
      {
        msg: options.caption || "",
        attachments: localPath,  // Pass file path directly
      },
      threadId.trim(),
      type,
    );

    console.log("[zalo-personal] Send result:", result);

    // Clean up local file after successful send (default: false to avoid race conditions)
    // OpenClaw's MEDIA: token processing may need the file, so only cleanup when explicitly requested
    if (options.cleanupAfterUpload === true) {
      try {
        fs.unlinkSync(localPath);
        console.log(`[zalo-personal] Cleaned up local file: ${localPath}`);
      } catch (cleanupErr) {
        console.warn(`[zalo-personal] Failed to cleanup ${localPath}:`, cleanupErr);
      }
    }

    const msgId = markAllMsgIds(result);
    return { ok: true, messageId: msgId };
  } catch (err) {
    console.error("[zalo-personal] Upload error:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Check if a string looks like a local file path
 */
export function isLocalFilePath(str: string): boolean {
  if (!str) return false;
  // Check if it's an absolute path or relative path pattern
  return (
    str.startsWith("/") ||
    str.startsWith("./") ||
    str.startsWith("../") ||
    str.includes("/.openclaw/workspace/")
  );
}
