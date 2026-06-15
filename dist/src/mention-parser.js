import { getApi } from "./zalo-client.js";
/**
 * Group member name resolver + outbound @mention parser.
 *
 * LLM-friendly syntax (recommended): `@[Display Name]` — supports spaces,
 * unambiguous boundary. Bare `@Name` (no spaces) is also accepted as a
 * convenience for single-word names. Anything that does not resolve to
 * exactly one group member is left as plain text — we never emit a wrong
 * mention.
 *
 * Output: rewritten text with `@[...]` brackets stripped + a Mention[]
 * array sized so Zalo highlights the names and notifies the tagged users.
 */
const MEMBER_CACHE_TTL_MS = 5 * 60 * 1000;
const MEMBER_CACHE_MAX = 50;
const groupMemberCache = new Map();
function buildIndex(members) {
    const cleaned = members.filter((m) => m.uid && m.name && m.name.trim().length > 0);
    const counts = new Map();
    for (const m of cleaned) {
        const key = m.name.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const uniqueNameToUid = new Map();
    for (const m of cleaned) {
        const key = m.name.toLowerCase();
        if (counts.get(key) === 1) {
            uniqueNameToUid.set(key, m.uid);
        }
    }
    const byNameLower = cleaned
        .map((m) => ({ nameLower: m.name.toLowerCase(), nameOriginal: m.name, uid: m.uid }))
        .sort((a, b) => b.nameLower.length - a.nameLower.length);
    return { byNameLower, uniqueNameToUid };
}
async function loadGroupMemberIndex(groupId) {
    const cached = groupMemberCache.get(groupId);
    if (cached && Date.now() - cached.cachedAt < MEMBER_CACHE_TTL_MS) {
        return cached.index;
    }
    const api = await getApi();
    const groupResp = await api.getGroupInfo([groupId]);
    const info = groupResp?.gridInfoMap?.[groupId];
    if (!info) {
        return buildIndex([]);
    }
    // Mirror src/tool.ts:extractMemberIds — Zalo returns memberIds=[] but
    // memVerList carries "{uid}_{ver}" entries on newer accounts.
    let memberIds = info.memberIds ?? [];
    if (memberIds.length === 0) {
        const memVerList = info.memVerList ?? [];
        memberIds = memVerList.map((entry) => entry.split("_")[0]).filter(Boolean);
    }
    if (memberIds.length === 0) {
        return buildIndex([]);
    }
    const profilesResp = await api.getGroupMembersInfo(memberIds);
    const profiles = profilesResp?.profiles ?? {};
    const members = Object.entries(profiles).map(([uid, p]) => ({
        uid,
        name: String(p.displayName ?? p.dName ?? p.zaloName ?? "").trim(),
    }));
    const index = buildIndex(members);
    // LRU-ish: drop oldest entry when we exceed MEMBER_CACHE_MAX so the cache
    // never grows unbounded on bots that touch many groups per day.
    if (groupMemberCache.size >= MEMBER_CACHE_MAX) {
        const firstKey = groupMemberCache.keys().next().value;
        if (firstKey)
            groupMemberCache.delete(firstKey);
    }
    groupMemberCache.set(groupId, { index, cachedAt: Date.now() });
    return index;
}
/** Test/internal hook so callers can prime the cache without hitting Zalo. */
export function primeGroupMemberCacheForTesting(groupId, members) {
    groupMemberCache.set(groupId, { index: buildIndex(members), cachedAt: Date.now() });
}
/** Test/internal hook to clear cache between tests or after debug. */
export function clearGroupMemberCache() {
    groupMemberCache.clear();
}
function isWordChar(ch) {
    if (!ch)
        return false;
    return /[\p{L}\p{N}_]/u.test(ch);
}
function longestNamePrefixMatch(rest, index) {
    const restLower = rest.toLowerCase();
    for (const entry of index.byNameLower) {
        if (restLower.startsWith(entry.nameLower)) {
            // Reject partial-word matches: if the next char in input is a word
            // char, the bare @Name attempt was probably part of a longer string.
            const after = rest[entry.nameLower.length];
            if (isWordChar(after))
                continue;
            // Only emit if the lookup is unambiguous.
            if (index.uniqueNameToUid.get(entry.nameLower) === entry.uid) {
                return rest.substring(0, entry.nameLower.length);
            }
        }
    }
    return null;
}
export function parseOutboundMentions(input, index) {
    if (!input || index.byNameLower.length === 0) {
        return { text: input, mentions: [], stripIndices: [] };
    }
    let output = "";
    const mentions = [];
    const stripIndices = [];
    let i = 0;
    while (i < input.length) {
        const ch = input[i];
        if (ch === "@") {
            // Skip @ that is part of an email-like token (preceded by a word char).
            const prev = i > 0 ? input[i - 1] : undefined;
            if (isWordChar(prev)) {
                output += ch;
                i++;
                continue;
            }
            // Form 1: @[Display Name]
            if (input[i + 1] === "[") {
                const close = input.indexOf("]", i + 2);
                if (close !== -1) {
                    const name = input.substring(i + 2, close);
                    const uid = index.uniqueNameToUid.get(name.toLowerCase());
                    if (uid) {
                        const pos = output.length;
                        output += "@" + name;
                        mentions.push({ pos, uid, len: 1 + name.length });
                        stripIndices.push(i + 1); // dropped `[`
                        stripIndices.push(close); // dropped `]`
                        i = close + 1;
                        continue;
                    }
                }
            }
            // Form 2: bare @<longest member name>
            const rest = input.substring(i + 1);
            const matchedName = longestNamePrefixMatch(rest, index);
            if (matchedName) {
                const uid = index.uniqueNameToUid.get(matchedName.toLowerCase());
                if (uid) {
                    const pos = output.length;
                    output += "@" + matchedName;
                    mentions.push({ pos, uid, len: 1 + matchedName.length });
                    i += 1 + matchedName.length;
                    continue;
                }
            }
        }
        output += ch;
        i++;
    }
    return { text: output, mentions, stripIndices };
}
/**
 * Resolve mentions for an outbound group message. Fetches/caches the member
 * roster, parses the text, and returns the rewritten text + Mention[] payload
 * ready to hand to `api.sendMessage`. On any failure, returns the original
 * text with no mentions — outbound delivery must never break because mention
 * resolution went sideways.
 */
export async function resolveOutboundMentions(groupId, text) {
    if (!text || !groupId)
        return { text, mentions: [], stripIndices: [] };
    // Cheap pre-check: skip the API call entirely when the text contains no `@`.
    if (!text.includes("@"))
        return { text, mentions: [], stripIndices: [] };
    try {
        const index = await loadGroupMemberIndex(groupId);
        return parseOutboundMentions(text, index);
    }
    catch (err) {
        console.error(`[mention-parser] resolve failed for group ${groupId}:`, err);
        return { text, mentions: [], stripIndices: [] };
    }
}
