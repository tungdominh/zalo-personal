# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`zalo-personal` is an **OpenClaw channel plugin** that turns a Zalo personal account into an AI-powered messaging assistant. It integrates with OpenClaw's AI gateway via the OpenClaw Plugin SDK. There are no build/test/lint scripts — OpenClaw runs the plugin directly as TypeScript via its jiti loader.

## Plugin Development

Since there are no local scripts, development is done against a live OpenClaw instance:

```sh
# Install plugin into local OpenClaw
openclaw plugins install ./

# Reload plugin after changes
openclaw plugins reload zalo-personal

# Login / onboarding wizard
openclaw channels login --channel zp

# View plugin status / logs
openclaw status
openclaw logs --channel zp
```

TypeScript is executed directly (no compilation step). The plugin entry is `index.ts`, which OpenClaw loads via jiti.

## Architecture

```
index.ts               — registers channel + tool with OpenClaw SDK
src/
  channel.ts           — OpenClaw channel: dock, directory listing, onboarding
  tool.ts              — 141 agent tool actions (send, groups, friends, profile…)
  monitor.ts           — inbound message listener: policy gating, mention parsing, media download
  send.ts              — markdown → Zalo TextStyle rich text conversion + chunking
  mention-parser.ts    — resolve @[Name] mentions to Zalo UIDs
  onboarding.ts        — QR login wizard flow
  zalo-client.ts       — singleton zca-js API instance, QR login, credential persistence
  credentials.ts       — save/load encrypted credentials (imei, cookie, userAgent)
  accounts.ts          — multi-account config resolution
  config-schema.ts     — Zod schema for channel config
  config-manager.ts    — read/write OpenClaw config, manage allowlists/blocklists
  history-store.ts     — append-only JSONL thread history (per thread)
  outbound-tracker.ts  — track sent msgIds to prevent echo/self-reply loops
  output-filter.ts     — strip AI reasoning blocks (<think>…</think>) before sending
  image-downloader.ts  — download Zalo images to local disk for AI vision
  thread-sandbox.ts    — per-thread media size limits
  formatting-guide.ts  — system prompt fragment teaching LLM Zalo markdown syntax
  runtime.ts           — singleton OpenClaw runtime handle
  types.ts             — shared TypeScript types
  probe.ts             — connection health check
  qr-display.ts        — render PNG QR code in terminal
  status-issues.ts     — aggregate connection/auth issues for channel status
  friend-request-store.ts — track pending friend requests
```

## Key Data Flows

**Inbound (Zalo → AI agent):**
1. `monitor.ts` receives events from `zca-js`
2. Policy checked: DM policy (pairing/allowlist/open/disabled/silent) + group policy + blocklist
3. Groups require `@mention` by default (`requireMention: true`) — non-mention messages buffered (max 200, 4-hour TTL) for context injection
4. Images downloaded locally (`image-downloader.ts`)
5. `@[Name]` mentions resolved to UIDs (`mention-parser.ts`)
6. Thread history appended (`history-store.ts`, JSONL per thread)
7. Event emitted to OpenClaw inbound webhook

**Outbound (AI agent → Zalo):**
1. Reasoning blocks stripped (`output-filter.ts`)
2. Markdown converted to Zalo TextStyle spans (`send.ts`) — bold, italic, underline, strikethrough, lists, inline code
3. Messages >2000 chars chunked into multiple sends
4. Mentions resolved and tagged
5. `zca-js.sendMessage()` called
6. MsgId tracked in `outbound-tracker.ts` to prevent echo loops

## Config Schema

The Zod schema in `config-schema.ts` defines the channel config structure:

```typescript
{
  dmPolicy: "pairing" | "allowlist" | "open" | "disabled" | "silent"
  allowFrom: (string | number)[]   // UID allowlist
  denyFrom: (string | number)[]    // Blocklist (always wins)
  groupPolicy: "disabled" | "allowlist" | "open"
  groups: {
    [groupName]: {
      allow?: boolean
      requireMention?: boolean     // default true
      allowSelf?: boolean          // allow bot to reply to its own messages
      denyUsers?: []
      tools?: { allow?: string[], deny?: string[] }
    }
  }
  accounts?: { [id]: ZaloPersonalAccountConfig }  // multi-account
}
```

## Important Implementation Details

- **No tsconfig.json** — OpenClaw provides TypeScript config at the gateway level via jiti
- **ESM-only** (`"type": "module"`) — all imports must use `.js` extension even for `.ts` source files
- **`zca-js`** is the unofficial Zalo API library — treat it as a black box; its API surface is in `node_modules/zca-js`
- **Credential storage:** `~/.openclaw/zalo-personal-credentials.json` — contains imei, cookie, userAgent
- **Thread history:** JSONL files, one per thread, stored in OpenClaw's data directory
- **Self-reply guard:** `outbound-tracker.ts` records sent msgIds; `monitor.ts` skips inbound if msgId matches recent outbound
- **Mention buffer:** group messages without @mention are buffered and prepended when @mention finally arrives, giving the AI conversation context without triggering on every message
- **Rich text:** `send.ts` implements a custom markdown parser that produces Zalo `TextStyle` span objects — this is not standard markdown; Zalo has its own format
- **`openclaw.plugin.json`:** plugin manifest consumed by OpenClaw 2026.4.29+ for auto-discovery; `channelConfigs` key provides schema metadata for UI generation
