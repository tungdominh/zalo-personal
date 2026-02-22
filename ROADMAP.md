# 🗺️ OpenClaw Zalo Personal - Roadmap

## 🔥 URGENT - Cần Làm Ngay

### 1. Kết Bạn & Gửi Tin Nhắn Đến Số Lạ
**Priority**: P0 (Highest)
**Status**: ⏳ To Do
**APIs cần dùng**:
- `findUser(phoneNumber)` - Tìm user bằng số điện thoại
- `sendFriendRequest(msg, userId)` - Gửi lời mời kết bạn
- `sendMessage(message, threadId, type)` - Gửi tin nhắn trực tiếp (không cần là bạn bè)

**Implementation Tasks**:
- [ ] Add `findUser` action to AI tool
- [ ] Add `sendFriendRequest` action to AI tool
- [ ] Add `sendMessageToStranger` action (gửi tin nhắn đến số lạ)
- [ ] Update tool schema in `src/tool.ts`
- [ ] Test với số điện thoại thực
- [ ] Add error handling (user not found, request failed, etc.)
- [ ] Update documentation

**Estimated Time**: 2-3 hours

---

## 🎯 HIGH PRIORITY - Làm Tiếp Theo

### 2. Friends Management
**Priority**: P1
**Status**: ⏳ To Do
**APIs cần dùng**:
- `getAllFriends(count?, page?)` - List all friends
- `getFriendOnlines()` - Get online friends
- `getFriendRecommendations()` - Get friend recommendations
- `acceptFriendRequest(userId, requestId)` - Accept friend request
- `rejectFriendRequest(userId, requestId)` - Reject friend request
- `getSentFriendRequest()` - Get sent friend requests
- `undoFriendRequest(userId, requestId)` - Undo sent friend request
- `removeFriend(userId)` - Unfriend
- `changeFriendAlias(userId, alias)` - Set friend nickname
- `removeFriendAlias(userId)` - Remove nickname

**Implementation Tasks**:
- [ ] Add `list-friends` action (with pagination support)
- [ ] Add `search-friends` action (by name)
- [ ] Add `get-online-friends` action
- [ ] Add `accept-friend-request` action
- [ ] Add `reject-friend-request` action
- [ ] Add friend management to AI tool
- [ ] Update tool schema
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 4-5 hours

---

### 3. Groups Management
**Priority**: P1
**Status**: ⏳ To Do
**APIs cần dùng**:
- `getGroupInfo(groupId)` - Get group details
- `getAllGroups()` - List all groups (already implemented via `api.getAllGroups()`)
- `createGroup(name, userIds)` - Create new group
- `addUserToGroup(groupId, userId, metadata?)` - Add member
- `changeGroupName(groupId, name)` - Rename group
- `changeGroupAvatar(groupId, file, width, height)` - Change avatar
- `changeGroupOwner(groupId, ownerId)` - Transfer ownership
- `addGroupDeputy(groupId, deputyId)` - Add admin
- `removeGroupDeputy(groupId, deputyId)` - Remove admin
- `removeUserFromGroup(groupId, userId)` - Kick member
- `leaveGroup(groupId)` - Leave group

**Implementation Tasks**:
- [ ] Add `list-groups` action (enhanced with details)
- [ ] Add `search-groups` action (by name)
- [ ] Add `get-group-info` action
- [ ] Add `create-group` action
- [ ] Add `manage-group-members` actions (add/remove)
- [ ] Add group management to AI tool
- [ ] Update tool schema
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 4-5 hours

---

### 4. User Profile Info
**Priority**: P1
**Status**: ⏳ To Do
**APIs cần dùng**:
- `getAccountInfo()` - Get current account info (already exists as `getAccountInfo()`)
- `changeAccountAvatar(file, width, height)` - Change avatar
- `getProfileInfo(userId)` - Get other user's profile

**Implementation Tasks**:
- [ ] Add `get-my-profile` action (wrapper cho existing API)
- [ ] Add `get-user-profile` action
- [ ] Add `change-avatar` action
- [ ] Update AI tool
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 2 hours

---

### 5. Auth Status Check
**Priority**: P1
**Status**: ⏳ To Do
**APIs cần dùng**:
- Check if credentials exist
- Validate credentials are still valid
- Re-login if needed

**Implementation Tasks**:
- [ ] Add `check-auth-status` action
- [ ] Add auto re-login on auth failure
- [ ] Add credential validation
- [ ] Update AI tool
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 2 hours

---

## 🚀 MEDIUM PRIORITY - Nice to Have

### 6. Video Upload Support
**Priority**: P2
**Status**: ⏳ To Do
**Why Later**: Need to research zca-js video support first

**Research Needed**:
- [ ] Check if zca-js supports video upload
- [ ] Check attachment types in `sendMessage` API
- [ ] Test with sample video files
- [ ] Determine max file size

**Implementation Tasks**:
- [ ] Add video file detection (.mp4, .mov, .avi, .webm)
- [ ] Add video upload to `send.ts`
- [ ] Update attachment handling
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 3-4 hours

---

### 7. Voice Upload Support
**Priority**: P2
**Status**: ⏳ To Do
**Why Later**: Need to research zca-js voice support first

**Research Needed**:
- [ ] Check if zca-js supports voice/audio upload
- [ ] Check attachment types in `sendMessage` API
- [ ] Test with sample audio files
- [ ] Determine max file size

**Implementation Tasks**:
- [ ] Add audio file detection (.mp3, .wav, .ogg, .m4a)
- [ ] Add voice upload to `send.ts`
- [ ] Update attachment handling
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 3-4 hours

---

### 8. Auto-Restart Listener
**Priority**: P2
**Status**: ⏳ To Do
**Why Later**: Current implementation may already be stable enough

**Implementation Tasks**:
- [ ] Add error detection in `monitor.ts`
- [ ] Add exponential backoff retry logic
- [ ] Add max retry limit
- [ ] Add listener health check
- [ ] Log restart events
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 3 hours

---

### 9. Streaming Buffer Processing
**Priority**: P2
**Status**: ⏳ To Do
**Why Later**: Current implementation may already handle messages well

**Research Needed**:
- [ ] Check current message handling in `monitor.ts`
- [ ] Benchmark message processing speed
- [ ] Identify potential bottlenecks

**Implementation Tasks**:
- [ ] Add line-by-line JSON parsing
- [ ] Add buffer management
- [ ] Optimize message queue
- [ ] Add tests
- [ ] Update documentation

**Estimated Time**: 3-4 hours

---

## 📝 Additional Features (Future)

### 10. Message Reactions
**APIs**: `addReaction`, `removeReaction`

### 11. Group Polls
**APIs**: `createPoll`, `votePoll`, `lockPoll`, `addPollOptions`

### 12. Reminders
**APIs**: `createReminder`, `removeReminder`

### 13. Stickers
**APIs**: `getStickersDetail`, `getRecentStickers`, `getFavouriteStickers`

### 14. Notes
**APIs**: `createNote`, `updateNote`, `deleteNote`, `getNotes`

### 15. Quick Messages
**APIs**: `addQuickMessage`, `getQuickMessages`, `removeQuickMessage`

---

## 📊 Progress Tracker

| Feature | Priority | Status | Estimated Time |
|---------|----------|--------|----------------|
| **Kết bạn & Gửi tin số lạ** | P0 | ⏳ To Do | 2-3h |
| Friends Management | P1 | ⏳ To Do | 4-5h |
| Groups Management | P1 | ⏳ To Do | 4-5h |
| User Profile | P1 | ⏳ To Do | 2h |
| Auth Status | P1 | ⏳ To Do | 2h |
| Video Upload | P2 | ⏳ To Do | 3-4h |
| Voice Upload | P2 | ⏳ To Do | 3-4h |
| Auto-Restart | P2 | ⏳ To Do | 3h |
| Streaming Buffer | P2 | ⏳ To Do | 3-4h |

**Total P0+P1 Estimated Time**: 14-17 hours
**Total P2 Estimated Time**: 12-15 hours

---

## 🎯 Next Steps

1. **Start with P0**: Implement kết bạn & gửi tin nhắn số lạ
2. **Move to P1**: Complete high-priority features (friends, groups, profile, auth)
3. **Evaluate P2**: Decide which medium-priority features are worth implementing
4. **Plan Future**: Consider additional features based on user feedback

---

**Last Updated**: 2026-02-15
**Version**: 1.3.1
**Maintainer**: caochitam
