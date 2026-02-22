# Implementation Guide - OpenClaw Zalo Personal Features

> **Target**: AI Sonnet 4.5 hoặc developers
> **Architecture**: Dựa trên kiến trúc có sẵn của `openclaw-zalo-personal`
> **Verified**: Tất cả API signatures đã được kiểm tra từ zca-js v2.0.4 type definitions

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Phase 1: Kết Bạn & Gửi Tin Nhắn Số Lạ](#phase-1-kết-bạn--gửi-tin-nhắn-số-lạ) - URGENT
3. [Phase 2: Friends Management](#phase-2-friends-management)
4. [Phase 3: Groups Management](#phase-3-groups-management)
5. [Phase 4 (Future): Video & Voice](#phase-4-future-video--voice)

---

## Architecture Overview

### File Structure

```
src/
├── tool.ts              # AI tool actions & schema - FILE CHÍNH CẦN SỬA
├── zalo-client.ts       # zca-js API wrapper (getApi() singleton)
├── config-manager.ts    # Config read/write operations
├── send.ts              # Message sending (text, media, local file)
├── monitor.ts           # Message listener (ĐÃ CÓ auto-restart via retryOnClose: true)
├── onboarding.ts        # Login & setup wizard
├── accounts.ts          # Account management
├── config-schema.ts     # Zod config schema
├── credentials.ts       # Credential storage
├── image-downloader.ts  # Download images from Zalo
├── qr-display.ts        # QR code terminal display
├── types.ts             # TypeScript type definitions
└── runtime.ts           # Runtime singleton
index.ts                 # Plugin entry point (registerChannel + registerTool)
```

### Design Patterns

**Pattern 1 - Tool Actions** (`src/tool.ts`):
```typescript
const ACTIONS = ["send", "image", ...] as const;

export const ZaloPersonalToolSchema = Type.Object({
  action: stringEnum(ACTIONS, { ... }),
  // ... params
});

export async function executeZaloPersonalTool(...): Promise<AgentToolResult> {
  switch (params.action) {
    case "send": { ... }
    // ... more cases
    default: { params.action satisfies never; }
  }
}
```

**Pattern 2 - API Access** (`src/zalo-client.ts`):
```typescript
const api = await getApi();  // Singleton, auto-login with stored credentials
```

**Pattern 3 - Name Resolution** (`src/tool.ts`):
```typescript
async function resolveUserId(nameOrId: string): Promise<string>  // name → numeric ID
async function resolveGroupId(nameOrId: string): Promise<string> // name → numeric ID
```

**Pattern 4 - Response Format**:
```typescript
function json(payload: unknown): AgentToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }], details: payload };
}
```

### VERIFIED zca-js API Signatures

**QUAN TRỌNG**: Thứ tự params của zca-js KHÁC với trực giác thông thường!

#### Friend APIs:
```typescript
api.findUser(phoneNumber: string) => Promise<FindUserResponse>
api.sendFriendRequest(msg: string, userId: string) => Promise<"">
api.acceptFriendRequest(friendId: string) => Promise<"">          // CHỈ 1 PARAM
api.rejectFriendRequest(friendId: string) => Promise<"">          // CHỈ 1 PARAM
api.undoFriendRequest(friendId: string) => Promise<"">            // CHỈ 1 PARAM
api.removeFriend(friendId: string) => Promise<"">
api.changeFriendAlias(alias: string, friendId: string) => Promise<""> // alias TRƯỚC, friendId SAU
api.removeFriendAlias(friendId: string) => Promise<"">
api.getAllFriends(count?: number, page?: number) => Promise<User[]>
api.getFriendOnlines() => Promise<{ onlines: [{userId, status}], ownerStatus, predefine }>
api.getSentFriendRequest() => Promise<{ [userId: string]: SentFriendRequestInfo }>  // OBJECT, không phải array
api.getFriendRequestStatus(friendId: string) => Promise<{ is_friend, is_requested, is_requesting, ... }>
```

#### Group APIs:
```typescript
api.getAllGroups() => Promise<{ gridVerMap: { [groupId: string]: string } }>
api.getGroupInfo(groupId: string | string[]) => Promise<{ gridInfoMap: { [id]: GroupInfo } }>
api.createGroup(options: { name?: string, members: string[] }) => Promise<{ groupId, sucessMembers, errorMembers }>
api.addUserToGroup(memberId: string | string[], groupId: string) => Promise<...>     // memberId TRƯỚC
api.removeUserFromGroup(memberId: string | string[], groupId: string) => Promise<...> // memberId TRƯỚC
api.leaveGroup(groupId: string, silent?: boolean) => Promise<...>
api.changeGroupName(name: string, groupId: string) => Promise<...>                    // name TRƯỚC
api.changeGroupOwner(memberId: string, groupId: string) => Promise<...>               // memberId TRƯỚC
api.addGroupDeputy(memberId: string | string[], groupId: string) => Promise<"">       // memberId TRƯỚC
api.removeGroupDeputy(memberId: string | string[], groupId: string) => Promise<"">    // memberId TRƯỚC
```

#### Message APIs:
```typescript
api.sendMessage(message: MessageContent | string, threadId: string, type?: ThreadType) => Promise<SendMessageResponse>
// ThreadType.User = 0, ThreadType.Group = 1  (KHÔNG phải 1 và 2!)
```

#### Key Types:
```typescript
// FindUserResponse
{ uid: string, display_name: string, zalo_name: string, avatar: string, cover: string, status: string, gender: Gender, dob: number, sdob: string, globalId: string, bizPkg: ZBusinessPackage }

// User (from getAllFriends)
{ userId: string, username: string, displayName: string, zaloName: string, avatar: string, gender: Gender, phoneNumber: string, isFr: number, lastActionTime: number, ... }

// SentFriendRequestInfo
{ userId: string, zaloName: string, displayName: string, avatar: string, globalId: string, fReqInfo: { message: string, src: number, time: number } }

// GroupInfo (from getGroupInfo)
{ groupId: string, name: string, desc: string, type: GroupType, creatorId: string, avt: string, memberIds: string[], adminIds: string[], totalMember: number, maxMember: number, setting: GroupSetting, createdTime: number, ... }

// ThreadType enum
enum ThreadType { User = 0, Group = 1 }
```

---

## Phase 1: Kết Bạn & Gửi Tin Nhắn Số Lạ

**3 actions mới**: `find-user`, `send-friend-request`, `send-to-stranger`

### Step 1.1: Update ACTIONS Array

**File**: `src/tool.ts`, line 16-30

Thêm 3 actions mới vào cuối mảng ACTIONS:
```typescript
const ACTIONS = [
  "send",
  "image",
  "link",
  "friends",
  "groups",
  "me",
  "status",
  "block-user",
  "unblock-user",
  "block-user-in-group",
  "unblock-user-in-group",
  "list-blocked",
  "list-allowed",
  // Phase 1: Friend & Stranger
  "find-user",
  "send-friend-request",
  "send-to-stranger",
] as const;
```

### Step 1.2: Update Schema & ToolParams

**File**: `src/tool.ts`

Thêm 2 params vào `ZaloPersonalToolSchema` (sau `groupId`):
```typescript
export const ZaloPersonalToolSchema = Type.Object(
  {
    action: stringEnum(ACTIONS, { description: `Action to perform: ${ACTIONS.join(", ")}` }),
    threadId: Type.Optional(Type.String({ description: "Thread ID for messaging" })),
    message: Type.Optional(Type.String({ description: "Message text" })),
    isGroup: Type.Optional(Type.Boolean({ description: "Is group chat" })),
    query: Type.Optional(Type.String({ description: "Search query for users/groups" })),
    url: Type.Optional(Type.String({ description: "URL for media/link" })),
    userId: Type.Optional(Type.String({ description: "User ID or name for operations" })),
    groupId: Type.Optional(Type.String({ description: "Group ID or name for group operations" })),
    phoneNumber: Type.Optional(Type.String({ description: "Phone number to find user (e.g. 0987654321)" })),
    requestMessage: Type.Optional(Type.String({ description: "Message to send with friend request" })),
  },
  { additionalProperties: false },
);
```

Thêm params vào `ToolParams` type:
```typescript
type ToolParams = {
  action: (typeof ACTIONS)[number];
  threadId?: string;
  message?: string;
  isGroup?: boolean;
  query?: string;
  url?: string;
  userId?: string;
  groupId?: string;
  phoneNumber?: string;
  requestMessage?: string;
};
```

### Step 1.3: Implement find-user

**File**: `src/tool.ts` - thêm case mới trong switch (trước `default:`)

```typescript
      case "find-user": {
        if (!params.phoneNumber) {
          throw new Error("phoneNumber required for find-user action");
        }
        const cleanPhone = params.phoneNumber.replace(/[\s\-]/g, "");
        if (!/^(\+84|84|0)\d{9,10}$/.test(cleanPhone)) {
          throw new Error(
            `Invalid phone number format: ${params.phoneNumber}. Expected: 0987654321 or +84987654321`
          );
        }
        const api = await getApi();
        const result = await api.findUser(cleanPhone);
        if (!result || !result.uid) {
          return json({
            found: false,
            phoneNumber: cleanPhone,
            message: "User not found or phone number not registered on Zalo",
          });
        }
        return json({
          found: true,
          phoneNumber: cleanPhone,
          user: {
            userId: result.uid,
            displayName: result.display_name || result.zalo_name,
            zaloName: result.zalo_name,
            avatar: result.avatar,
            gender: result.gender,
            status: result.status,
          },
          message: `Found user: ${result.display_name || result.zalo_name} (ID: ${result.uid})`,
        });
      }
```

**API verified**: `api.findUser(phoneNumber: string) => Promise<FindUserResponse>`
**FindUserResponse fields**: `uid`, `display_name`, `zalo_name`, `avatar`, `cover`, `status`, `gender`, `dob`, `sdob`, `globalId`, `bizPkg`

### Step 1.4: Implement send-friend-request

```typescript
      case "send-friend-request": {
        if (!params.userId) {
          throw new Error("userId required for send-friend-request action");
        }
        if (!/^\d+$/.test(params.userId)) {
          throw new Error(
            `Invalid userId: ${params.userId}. Use numeric ID from find-user action.`
          );
        }
        const requestMsg = params.requestMessage || "Xin chào! Kết bạn với mình nhé.";
        const api = await getApi();
        // API signature: sendFriendRequest(msg: string, userId: string)
        await api.sendFriendRequest(requestMsg, params.userId);
        return json({
          success: true,
          userId: params.userId,
          requestMessage: requestMsg,
          message: `Friend request sent to user ${params.userId}`,
        });
      }
```

**API verified**: `api.sendFriendRequest(msg: string, userId: string) => Promise<"">`
**Thứ tự params**: msg TRƯỚC, userId SAU

### Step 1.5: Implement send-to-stranger

```typescript
      case "send-to-stranger": {
        if (!params.userId) {
          throw new Error("userId required for send-to-stranger action");
        }
        if (!params.message) {
          throw new Error("message required for send-to-stranger action");
        }
        if (!/^\d+$/.test(params.userId)) {
          throw new Error(
            `Invalid userId: ${params.userId}. Use numeric ID from find-user action.`
          );
        }
        const api = await getApi();
        // ThreadType.User = 0 (KHÔNG phải 1)
        const result = await api.sendMessage(
          { msg: params.message },
          params.userId,
          ThreadType.User,
        );
        return json({
          success: true,
          userId: params.userId,
          messageId: result?.message?.msgId,
          message: `Message sent to user ${params.userId}`,
          note: "User may not receive if they don't accept messages from strangers.",
        });
      }
```

**API verified**: `api.sendMessage(message, threadId, type?) => Promise<SendMessageResponse>`
**ThreadType.User = 0** (đã import sẵn ở dòng 2 của tool.ts: `import { ThreadType } from "zca-js"`)

### Step 1.6: Update Plugin Description

**File**: `index.ts`, line 22-28

Thêm mô tả cho actions mới:
```typescript
      description:
        "Send messages and manage Zalo personal account (zca-js). " +
        "Messaging: send (text), image (image URL), link (send link), send-to-stranger (message non-friend). " +
        "Friend: find-user (search by phone number), send-friend-request (add friend with message). " +
        "Info: friends (list/search), groups (list), me (profile), status (auth). " +
        "Blocklist: block-user, unblock-user, block-user-in-group, unblock-user-in-group, " +
        "list-blocked, list-allowed. " +
        "Names are auto-resolved to IDs. Gateway restart required after blocklist changes.",
```

---

## Phase 2: Friends Management

**10 actions mới**: `get-friend-requests`, `accept-friend-request`, `reject-friend-request`, `get-sent-requests`, `undo-friend-request`, `unfriend`, `set-friend-nickname`, `remove-friend-nickname`, `get-online-friends`, `check-friend-status`

### Step 2.1: Update ACTIONS Array

Thêm vào ACTIONS:
```typescript
  // Phase 2: Friends Management
  "get-friend-requests",
  "accept-friend-request",
  "reject-friend-request",
  "get-sent-requests",
  "undo-friend-request",
  "unfriend",
  "set-friend-nickname",
  "remove-friend-nickname",
  "get-online-friends",
  "check-friend-status",
```

### Step 2.2: Update Schema & ToolParams

Thêm vào schema:
```typescript
    nickname: Type.Optional(Type.String({ description: "Nickname/alias for friend" })),
```

Thêm vào ToolParams:
```typescript
    nickname?: string;
```

**LƯU Ý**: KHÔNG cần `requestId` - zca-js APIs chỉ cần `friendId`.
**LƯU Ý**: KHÔNG cần `page`/`pageSize` - getAllFriends có sẵn params count/page.

### Step 2.3: Enhance friends Action (THAY THẾ code hiện tại)

Thay thế case `"friends"` hiện tại (line 199-217):
```typescript
      case "friends": {
        const api = await getApi();
        const friends = await api.getAllFriends();
        let friendList = Array.isArray(friends) ? friends : [];
        if (params.query?.trim()) {
          const q = params.query.trim().toLowerCase();
          friendList = friendList.filter(
            (f: any) =>
              (f.displayName ?? "").toLowerCase().includes(q) ||
              (f.zaloName ?? "").toLowerCase().includes(q) ||
              String(f.userId).includes(q),
          );
        }
        const mapped = friendList.map((f: any) => ({
          userId: f.userId,
          displayName: f.displayName,
          zaloName: f.zaloName,
          avatar: f.avatar,
          phoneNumber: f.phoneNumber,
          lastActionTime: f.lastActionTime,
        }));
        return json({
          friends: mapped,
          count: mapped.length,
          message: params.query
            ? `Found ${mapped.length} friend(s) matching "${params.query}"`
            : `Total ${mapped.length} friend(s)`,
        });
      }
```

### Step 2.4: Implement check-friend-status

```typescript
      case "check-friend-status": {
        if (!params.userId) {
          throw new Error("userId required for check-friend-status action");
        }
        if (!/^\d+$/.test(params.userId)) {
          throw new Error("userId must be numeric ID");
        }
        const api = await getApi();
        // API: getFriendRequestStatus(friendId: string)
        const status = await api.getFriendRequestStatus(params.userId);
        return json({
          userId: params.userId,
          isFriend: status.is_friend === 1,
          isRequested: status.is_requested === 1,    // Họ đã gửi request cho mình
          isRequesting: status.is_requesting === 1,   // Mình đã gửi request cho họ
          isSeenFriendReq: status.isSeenFriendReq,
          message: status.is_friend === 1
            ? `User ${params.userId} is already your friend`
            : status.is_requesting === 1
              ? `You already sent a friend request to ${params.userId}`
              : status.is_requested === 1
                ? `User ${params.userId} sent you a friend request`
                : `User ${params.userId} is not your friend`,
        });
      }
```

**API verified**: `api.getFriendRequestStatus(friendId) => { is_friend, is_requested, is_requesting, addFriendPrivacy, isSeenFriendReq }`

### Step 2.5: Implement accept-friend-request

```typescript
      case "accept-friend-request": {
        if (!params.userId) {
          throw new Error("userId required for accept-friend-request action");
        }
        const api = await getApi();
        // API: acceptFriendRequest(friendId: string) - CHỈ 1 PARAM
        await api.acceptFriendRequest(params.userId);
        return json({
          success: true,
          userId: params.userId,
          message: `Accepted friend request from user ${params.userId}`,
        });
      }
```

**API verified**: `api.acceptFriendRequest(friendId: string) => Promise<"">`
**CHỈ 1 PARAM** - không cần requestId!

### Step 2.6: Implement reject-friend-request

```typescript
      case "reject-friend-request": {
        if (!params.userId) {
          throw new Error("userId required for reject-friend-request action");
        }
        const api = await getApi();
        // API: rejectFriendRequest(friendId: string) - CHỈ 1 PARAM
        await api.rejectFriendRequest(params.userId);
        return json({
          success: true,
          userId: params.userId,
          message: `Rejected friend request from user ${params.userId}`,
        });
      }
```

**API verified**: `api.rejectFriendRequest(friendId: string) => Promise<"">`

### Step 2.7: Implement get-sent-requests

```typescript
      case "get-sent-requests": {
        const api = await getApi();
        const response = await api.getSentFriendRequest();
        // Response is OBJECT { [userId]: SentFriendRequestInfo }, NOT array
        const requests = Object.entries(response).map(([uid, info]: [string, any]) => ({
          userId: info.userId || uid,
          displayName: info.displayName,
          zaloName: info.zaloName,
          avatar: info.avatar,
          requestMessage: info.fReqInfo?.message,
          sentAt: info.fReqInfo?.time,
        }));
        return json({
          requests,
          count: requests.length,
          message: requests.length > 0
            ? `You have ${requests.length} pending sent request(s)`
            : "No pending sent requests",
        });
      }
```

**API verified**: `api.getSentFriendRequest() => Promise<{ [userId: string]: SentFriendRequestInfo }>`
**Response là OBJECT** (key = userId), KHÔNG phải array!
**SentFriendRequestInfo**: `{ userId, zaloName, displayName, avatar, globalId, bizPkg, fReqInfo: { message, src, time } }`

### Step 2.8: Implement get-friend-requests (Incoming)

```typescript
      case "get-friend-requests": {
        // zca-js không có API trực tiếp cho incoming friend requests
        // Nhưng có thể dùng check-friend-status để kiểm tra từng user
        return json({
          available: false,
          message: "Listing incoming friend requests is not supported by zca-js API",
          suggestion: "Use check-friend-status with a userId to check if someone sent you a request (is_requested=1)",
          alternative: "Use Zalo app to view incoming friend requests",
        });
      }
```

### Step 2.9: Implement undo-friend-request

```typescript
      case "undo-friend-request": {
        if (!params.userId) {
          throw new Error("userId required for undo-friend-request action");
        }
        const api = await getApi();
        // API: undoFriendRequest(friendId: string) - CHỈ 1 PARAM
        await api.undoFriendRequest(params.userId);
        return json({
          success: true,
          userId: params.userId,
          message: `Cancelled friend request to user ${params.userId}`,
        });
      }
```

**API verified**: `api.undoFriendRequest(friendId: string) => Promise<"">`

### Step 2.10: Implement unfriend

```typescript
      case "unfriend": {
        if (!params.userId) {
          throw new Error("userId required for unfriend action");
        }
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        // API: removeFriend(friendId: string)
        await api.removeFriend(userId);
        return json({
          success: true,
          userId,
          message: `Removed friend ${params.userId} (ID: ${userId})`,
        });
      }
```

### Step 2.11: Implement set-friend-nickname

```typescript
      case "set-friend-nickname": {
        if (!params.userId || !params.nickname) {
          throw new Error("userId and nickname required for set-friend-nickname action");
        }
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        // API: changeFriendAlias(alias: string, friendId: string) - alias TRƯỚC!
        await api.changeFriendAlias(params.nickname, userId);
        return json({
          success: true,
          userId,
          nickname: params.nickname,
          message: `Set nickname for ${params.userId} (ID: ${userId}) to "${params.nickname}"`,
        });
      }
```

**API verified**: `api.changeFriendAlias(alias: string, friendId: string) => Promise<"">`
**THỨ TỰ**: alias TRƯỚC, friendId SAU

### Step 2.12: Implement remove-friend-nickname

```typescript
      case "remove-friend-nickname": {
        if (!params.userId) {
          throw new Error("userId required for remove-friend-nickname action");
        }
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        await api.removeFriendAlias(userId);
        return json({
          success: true,
          userId,
          message: `Removed nickname for ${params.userId} (ID: ${userId})`,
        });
      }
```

### Step 2.13: Implement get-online-friends

```typescript
      case "get-online-friends": {
        const api = await getApi();
        // API returns { predefine: string[], ownerStatus: string, onlines: [{userId, status}] }
        const response = await api.getFriendOnlines();
        const onlines = response?.onlines ?? [];
        return json({
          friends: onlines.map((f: any) => ({
            userId: f.userId,
            status: f.status,
          })),
          count: onlines.length,
          message: `${onlines.length} friend(s) online`,
          note: "Only userId and status available. Use friends action with query to get display names.",
        });
      }
```

**API verified**: `api.getFriendOnlines() => Promise<{ predefine, ownerStatus, onlines: [{userId, status}] }>`
**Response chỉ có userId và status** - KHÔNG CÓ displayName hay avatar!

---

## Phase 3: Groups Management

**10 actions mới**: `list-groups`, `search-groups`, `get-group-info`, `create-group`, `add-to-group`, `remove-from-group`, `leave-group`, `rename-group`, `add-group-admin`, `remove-group-admin`

### Step 3.1: Update ACTIONS Array

Thêm vào ACTIONS:
```typescript
  // Phase 3: Groups Management
  "list-groups",
  "search-groups",
  "get-group-info",
  "create-group",
  "add-to-group",
  "remove-from-group",
  "leave-group",
  "rename-group",
  "add-group-admin",
  "remove-group-admin",
```

### Step 3.2: Update Schema & ToolParams

Thêm vào schema:
```typescript
    groupName: Type.Optional(Type.String({ description: "Group name for create/rename" })),
    memberIds: Type.Optional(Type.Array(Type.String(), { description: "Array of user IDs for group creation" })),
```

Thêm vào ToolParams:
```typescript
    groupName?: string;
    memberIds?: string[];
```

### Step 3.3: Enhance groups Action (THAY THẾ code hiện tại)

Thay thế case `"groups"` hiện tại (line 219-238):
```typescript
      case "groups":
      case "list-groups":
      case "search-groups": {
        const api = await getApi();
        const groupsResp = await api.getAllGroups();
        const groupIds = Object.keys(groupsResp?.gridVerMap ?? {});
        if (groupIds.length === 0) {
          return json({ groups: [], count: 0, message: "No groups found" });
        }
        try {
          const infoResp = await api.getGroupInfo(groupIds);
          const gridInfoMap = infoResp?.gridInfoMap ?? {};
          let groups = Object.entries(gridInfoMap).map(([id, info]: [string, any]) => ({
            groupId: id,
            name: info.name,
            desc: info.desc,         // field name is "desc" NOT "description"
            totalMember: info.totalMember,
            maxMember: info.maxMember,
            creatorId: info.creatorId,
            adminIds: info.adminIds,
            avatar: info.avt,        // field name is "avt" NOT "avatar"
          }));
          if (params.query?.trim()) {
            const q = params.query.trim().toLowerCase();
            groups = groups.filter(g =>
              (g.name ?? "").toLowerCase().includes(q) || g.groupId.includes(q),
            );
          }
          return json({
            groups,
            count: groups.length,
            message: params.query
              ? `Found ${groups.length} group(s) matching "${params.query}"`
              : `Total ${groups.length} group(s)`,
          });
        } catch {
          return json({
            groups: groupIds.map((id) => ({ groupId: id })),
            count: groupIds.length,
            message: "Group IDs only (details unavailable)",
          });
        }
      }
```

**GroupInfo verified fields**: `groupId, name, desc, type, creatorId, avt, fullAvt, memberIds, adminIds, totalMember, maxMember, setting, createdTime, ...`
**LƯU Ý**: Field là `desc` (không phải `description`), `avt` (không phải `avatar`)

### Step 3.4: Implement get-group-info

```typescript
      case "get-group-info": {
        if (!params.groupId) {
          throw new Error("groupId required for get-group-info action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const api = await getApi();
        // API: getGroupInfo(groupId: string | string[])
        const infoResp = await api.getGroupInfo(groupId);
        const info = infoResp?.gridInfoMap?.[groupId];
        if (!info) {
          return json({ found: false, groupId, message: `Group not found` });
        }
        return json({
          found: true,
          group: {
            groupId,
            name: info.name,
            desc: info.desc,
            totalMember: info.totalMember,
            maxMember: info.maxMember,
            creatorId: info.creatorId,
            adminIds: info.adminIds,
            memberIds: info.memberIds,
            avatar: info.avt,
            createdTime: info.createdTime,
          },
        });
      }
```

**API verified**: `api.getGroupInfo(groupId: string | string[])` - nhận cả string hoặc string[]

### Step 3.5: Implement create-group

```typescript
      case "create-group": {
        if (!params.memberIds || params.memberIds.length === 0) {
          throw new Error("memberIds required for create-group action (at least 1 member)");
        }
        const api = await getApi();
        // API: createGroup(options: { name?, members: string[] })
        const result = await api.createGroup({
          name: params.groupName,
          members: params.memberIds,
        });
        return json({
          success: true,
          groupId: result?.groupId,
          groupName: params.groupName,
          successMembers: result?.sucessMembers,   // typo is in zca-js API
          errorMembers: result?.errorMembers,
          message: `Created group${params.groupName ? ` "${params.groupName}"` : ""} (ID: ${result?.groupId})`,
        });
      }
```

**API verified**: `api.createGroup(options: CreateGroupOptions)` - nhận **object**, KHÔNG phải 2 params riêng!
```typescript
type CreateGroupOptions = { name?: string, members: string[], avatarSource?, avatarPath? }
```
**LƯU Ý**: Response có `sucessMembers` (typo trong zca-js, thiếu chữ 'c')

### Step 3.6: Implement add-to-group

```typescript
      case "add-to-group": {
        if (!params.groupId || !params.userId) {
          throw new Error("groupId and userId required for add-to-group action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        // API: addUserToGroup(memberId, groupId) - memberId TRƯỚC!
        const result = await api.addUserToGroup(userId, groupId);
        const hasErrors = result?.errorMembers?.length > 0;
        return json({
          success: !hasErrors,
          groupId,
          userId,
          errorMembers: result?.errorMembers,
          message: hasErrors
            ? `Failed to add some members: ${result.errorMembers.join(", ")}`
            : `Added user ${params.userId} to group ${params.groupId}`,
        });
      }
```

**API verified**: `api.addUserToGroup(memberId: string | string[], groupId: string)`
**THỨ TỰ**: memberId TRƯỚC, groupId SAU

### Step 3.7: Implement remove-from-group

```typescript
      case "remove-from-group": {
        if (!params.groupId || !params.userId) {
          throw new Error("groupId and userId required for remove-from-group action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        // API: removeUserFromGroup(memberId, groupId) - memberId TRƯỚC!
        await api.removeUserFromGroup(userId, groupId);
        return json({
          success: true,
          groupId,
          userId,
          message: `Removed user ${params.userId} from group ${params.groupId}`,
        });
      }
```

### Step 3.8: Implement leave-group

```typescript
      case "leave-group": {
        if (!params.groupId) {
          throw new Error("groupId required for leave-group action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const api = await getApi();
        // API: leaveGroup(groupId: string, silent?: boolean)
        await api.leaveGroup(groupId);
        return json({
          success: true,
          groupId,
          message: `Left group ${params.groupId}`,
        });
      }
```

### Step 3.9: Implement rename-group

```typescript
      case "rename-group": {
        if (!params.groupId || !params.groupName) {
          throw new Error("groupId and groupName required for rename-group action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const api = await getApi();
        // API: changeGroupName(name, groupId) - name TRƯỚC!
        await api.changeGroupName(params.groupName, groupId);
        return json({
          success: true,
          groupId,
          newName: params.groupName,
          message: `Renamed group to "${params.groupName}"`,
        });
      }
```

**API verified**: `api.changeGroupName(name: string, groupId: string)`
**THỨ TỰ**: name TRƯỚC, groupId SAU

### Step 3.10: Implement add-group-admin

```typescript
      case "add-group-admin": {
        if (!params.groupId || !params.userId) {
          throw new Error("groupId and userId required for add-group-admin action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        // API: addGroupDeputy(memberId, groupId) - memberId TRƯỚC!
        await api.addGroupDeputy(userId, groupId);
        return json({
          success: true,
          groupId,
          userId,
          message: `Added ${params.userId} as admin of group ${params.groupId}`,
        });
      }
```

### Step 3.11: Implement remove-group-admin

```typescript
      case "remove-group-admin": {
        if (!params.groupId || !params.userId) {
          throw new Error("groupId and userId required for remove-group-admin action");
        }
        const groupId = await resolveGroupId(params.groupId);
        const userId = await resolveUserId(params.userId);
        const api = await getApi();
        // API: removeGroupDeputy(memberId, groupId) - memberId TRƯỚC!
        await api.removeGroupDeputy(userId, groupId);
        return json({
          success: true,
          groupId,
          userId,
          message: `Removed ${params.userId} from admin of group ${params.groupId}`,
        });
      }
```

---

## Phase 4 (Future): Video & Voice

**CHỈ ĐỂ THAM KHẢO** - Implement sau khi Phase 1-3 hoàn thành.

### sendVideo API Signature
```typescript
api.sendVideo(options: SendVideoOptions, threadId: string, type?: ThreadType)

type SendVideoOptions = {
  videoUrl: string;       // BẮT BUỘC
  thumbnailUrl: string;   // BẮT BUỘC - cần thumbnail!
  msg?: string;
  duration?: number;
  width?: number;
  height?: number;
  ttl?: number;
}
```
**LƯU Ý**: Cần `thumbnailUrl` bắt buộc!

### sendVoice API Signature
```typescript
api.sendVoice(options: SendVoiceOptions, threadId: string, type?: ThreadType)

type SendVoiceOptions = {
  voiceUrl: string;       // BẮT BUỘC
  ttl?: number;
}
```

### Auto-restart Listener
**ĐÃ CÓ SẴN** trong `src/monitor.ts` (line ~862):
```typescript
api.listener.start({ retryOnClose: true })
```
KHÔNG CẦN implement thêm.

---

## Update index.ts Description (FINAL)

Sau khi hoàn thành cả 3 phases, update description trong `index.ts`:
```typescript
      description:
        "Send messages and manage Zalo personal account (zca-js). " +
        "Messaging: send (text), image (image URL), link (send link), send-to-stranger (message non-friend). " +
        "Friend: find-user (by phone), send-friend-request, accept-friend-request, reject-friend-request, " +
        "get-sent-requests, undo-friend-request, unfriend, set-friend-nickname, remove-friend-nickname, " +
        "get-online-friends, check-friend-status. " +
        "Groups: list-groups, search-groups, get-group-info, create-group, add-to-group, " +
        "remove-from-group, leave-group, rename-group, add-group-admin, remove-group-admin. " +
        "Info: friends (list/search), me (profile), status (auth). " +
        "Blocklist: block-user, unblock-user, block-user-in-group, unblock-user-in-group, " +
        "list-blocked, list-allowed. " +
        "Names are auto-resolved to IDs. Gateway restart required after blocklist changes.",
```

---

## Checklist

### Phase 1 (3 actions):
- [ ] Add `find-user`, `send-friend-request`, `send-to-stranger` to ACTIONS
- [ ] Add `phoneNumber`, `requestMessage` to schema
- [ ] Implement 3 switch cases
- [ ] Update index.ts description

### Phase 2 (10 actions):
- [ ] Add 10 actions to ACTIONS
- [ ] Add `nickname` to schema
- [ ] Enhance `friends` case
- [ ] Implement 10 switch cases
- [ ] Update index.ts description

### Phase 3 (10 actions):
- [ ] Add 10 actions to ACTIONS
- [ ] Add `groupName`, `memberIds` to schema
- [ ] Enhance `groups` case
- [ ] Implement 10 switch cases
- [ ] Update index.ts description

### Final:
- [ ] Update README.md
- [ ] Update CHANGELOG.md
- [ ] Test all actions
- [ ] Commit & push
