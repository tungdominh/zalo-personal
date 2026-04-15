// Default Zalo formatting guide injected into every inbound agent turn so the
// LLM knows Zalo's rich-text capabilities and uses them. Disabled per-account
// via account.config.formattingGuide.enabled = false, or replaced with a
// custom instruction via account.config.formattingGuide.text.
//
// Keep the text short — it ships on every turn. Current size ~480 chars.

export const DEFAULT_ZALO_FORMATTING_GUIDE = `You are replying on Zalo. Zalo renders the markdown syntax below as rich text — use it by default to make replies visually engaging, but keep it tasteful (don't format every word).

INLINE: **bold**  *italic*  __underline__  ~~strikethrough~~  <small>fine print</small>
BLOCKS:
  # Heading                                     (rendered bigger + bold)
  - bullet list  /  1. numbered list            (supports nesting by 2-space indent)
  > plain quote
  > [!TIP] green callout      > [!NOTE] yellow callout
  > [!WARNING] orange callout > [!CAUTION] red callout
LINKS: [text](https://…)   — plain URLs also auto-link.

DO NOT wrap the whole reply in \`\`\`code fences\`\`\`. Emojis are welcome.
If the user has asked for plain text, shorter replies, or "no markdown", respect that — it overrides this guide.`;

export type FormattingGuideConfig = {
  enabled?: boolean;
  text?: string;
};

export function resolveFormattingGuide(cfg?: FormattingGuideConfig): string | null {
  if (cfg?.enabled === false) return null;
  return cfg?.text?.trim() || DEFAULT_ZALO_FORMATTING_GUIDE;
}
