# Zalo Personal for OpenClaw

> Biến tài khoản Zalo cá nhân thành trợ lý AI thông minh — 141 actions, hỗ trợ hình ảnh, nhóm, bạn bè, và hơn thế nữa.

[![npm version](https://img.shields.io/npm/v/zalo-personal)](https://www.npmjs.com/package/zalo-personal)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2%2B-orange)](https://openclaw.ai)
[![Ủng hộ](https://img.shields.io/badge/%E2%98%95%20%E1%BB%A6ng%20h%E1%BB%99-MoMo%20%2F%20Ng%C3%A2n%20h%C3%A0ng-ff69b4)](#-ủng-hộ-dự-án)

```
Zalo App  <-->  zalo-personal extension  <-->  OpenClaw AI  <-->  Bạn
```

**1 lệnh cài đặt. Quét QR. Xong.**

---

## Cài Đặt Nhanh

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/caochitam/zalo-personal/main/quick-install.sh)
```

Script tự động cài extension, hiện QR code để đăng nhập, và restart gateway. Không cần cấu hình thủ công.

Đã cài rồi? Chạy lại script để cập nhật hoặc cấu hình lại.

<p align="center">
  <sub>Dự án này miễn phí và được duy trì nhờ sự ủng hộ của cộng đồng</sub><br/>
  <a href="#-ủng-hộ-dự-án"><img src="https://raw.githubusercontent.com/caochitam/zalo-personal/main/momo-caochitam.jpg" alt="Ủng hộ qua MoMo / Ngân hàng" width="180" /></a>
</p>

---

## Tại Sao Chọn Zalo Personal?

### Đăng Nhập Đơn Giản
Quét QR bằng app Zalo — không cần password, không cần CLI tools, không cần token. Session tự động duy trì với cơ chế keep-alive.

### 141 Tool Actions
Extension cung cấp **141 actions** mà AI agent có thể gọi trực tiếp. Đây là bộ công cụ Zalo đầy đủ nhất trên OpenClaw.

### Hình Ảnh 2 Chiều
- **Nhận ảnh từ Zalo** — AI có thể phân tích, mô tả, hoặc xử lý ảnh người dùng gửi
- **Gửi ảnh từ AI** — Kết quả từ DALL-E, nano-banana, hoặc bất kỳ skill nào được gửi thẳng về Zalo

### Bảo Mật Nhiều Lớp
Kiểm soát ai được nhắn tin với bot qua 4 chế độ: Pairing, Allowlist, Open, Disabled. Hỗ trợ blocklist toàn cục và theo nhóm.

### Tự Động Kết Nối Lại
Mất kết nối? Extension tự động reconnect với retry logic. Keep-alive heartbeat giữ session sống, tự động refresh credentials.

> **Dự án được phát triển bằng Claude Code (AI)** và hoàn toàn miễn phí. Nếu bạn thấy hữu ích, hãy [ủng hộ tác giả](#-ủng-hộ-dự-án) để có thêm động lực duy trì và phát triển tiếp!

---

## Tổng Quan Tính Năng

### Nhắn Tin & Media

| Khả năng | Mô tả |
|----------|-------|
| **Gửi/nhận tin nhắn** | Text, hình ảnh, video, voice, sticker, link preview |
| **Reaction** | 11 loại emoji (heart, like, haha, wow, cry, angry, ...) |
| **Chuyển tiếp** | Forward tin nhắn đến nhiều người/nhóm |
| **Xóa & thu hồi** | Xóa tin nhắn hoặc recall trong thời gian cho phép |
| **Typing indicator** | Hiển thị trạng thái "đang nhập..." |
| **Contact card** | Chia sẻ thông tin liên hệ, thẻ ngân hàng |

### Quản Lý Bạn Bè (15 actions)

| Action | Mô tả |
|--------|-------|
| `friends` | Liệt kê & tìm kiếm bạn bè |
| `find-user` | Tìm user qua số điện thoại |
| `send-friend-request` | Gửi lời mời kết bạn |
| `accept-friend-request` | Chấp nhận lời mời |
| `unfriend` | Hủy kết bạn |
| `get-online-friends` | Xem ai đang online |
| `set-friend-nickname` | Đặt biệt danh cho bạn |
| ... | và nhiều action khác |

### Quản Lý Nhóm (25+ actions)

| Action | Mô tả |
|--------|-------|
| `create-group` | Tạo nhóm mới |
| `add-to-group` / `remove-from-group` | Thêm/xóa thành viên |
| `add-group-admin` | Bổ nhiệm quản trị viên |
| `update-group-settings` | Cấu hình nhóm (khóa tên, duyệt thành viên, ...) |
| `enable-group-link` | Tạo link mời nhóm |
| `get-pending-members` | Xem danh sách chờ duyệt |
| `block-group-member` | Chặn thành viên trong nhóm |
| ... | và nhiều action khác |

### Bình Chọn & Nhắc Nhở

| Action | Mô tả |
|--------|-------|
| `create-poll` | Tạo bình chọn trong nhóm |
| `vote-poll` | Bỏ phiếu |
| `lock-poll` | Khóa bình chọn |
| `create-reminder` | Tạo nhắc nhở (1 lần, hàng ngày, hàng tuần, hàng tháng) |
| `edit-reminder` | Chỉnh sửa nhắc nhở |

### Hồ Sơ & Cài Đặt

| Action | Mô tả |
|--------|-------|
| `get-user-info` | Xem thông tin user (tên, avatar, giới tính, ngày sinh) |
| `update-profile` | Thay đổi tên hiển thị, ngày sinh |
| `change-avatar` | Đặt avatar mới từ URL |
| `get-settings` / `update-setting` | Quản lý cài đặt tài khoản |
| `update-active-status` | Bật/tắt trạng thái online |

### Hội Thoại

| Action | Mô tả |
|--------|-------|
| `mute-conversation` | Tắt thông báo (1h, 4h, mãi mãi) |
| `pin-conversation` | Ghim hội thoại lên đầu |
| `hide-conversation` | Ẩn hội thoại |
| `set-auto-delete-chat` | Tự động xóa tin nhắn (1/7/14 ngày) |
| `mark-unread` | Đánh dấu chưa đọc |

### Tin Nhắn Nhanh & Tự Động Trả Lời

| Action | Mô tả |
|--------|-------|
| `add-quick-message` | Tạo mẫu tin nhắn nhanh |
| `create-auto-reply` | Cấu hình tự động trả lời với khung giờ |

### Catalog & Sản Phẩm

| Action | Mô tả |
|--------|-------|
| `create-catalog` | Tạo danh mục sản phẩm |
| `create-product` | Thêm sản phẩm (tên, giá, mô tả) |
| `get-products` | Liệt kê sản phẩm |

### Ghi Chú Nhóm & Sticker

| Action | Mô tả |
|--------|-------|
| `create-note` | Tạo ghi chú trong nhóm (có thể ghim) |
| `search-stickers` | Tìm sticker theo từ khóa |
| `send-sticker` | Gửi sticker |

<p align="center">
  <sub><em>141 actions và vẫn đang phát triển thêm — được xây dựng nhờ Claude Code AI. <a href="#-ủng-hộ-dự-án">Ủng hộ</a> để tăng tốc phát triển!</em></sub>
</p>

---

## Bảo Mật & Kiểm Soát Truy Cập

### Chế Độ DM (tin nhắn riêng)

```yaml
channels:
  zalo-personal:
    dmPolicy: pairing      # Người dùng phải được duyệt trước
```

| Chế độ | Hành vi |
|--------|---------|
| `pairing` | Người mới gửi tin → bot yêu cầu pair → bạn duyệt → họ được nhắn tin |
| `allowlist` | Chỉ người trong danh sách `allowFrom` mới được nhắn tin |
| `open` | Bất kỳ ai cũng nhắn tin được (chỉ dùng khi test) |
| `disabled` | Tắt hoàn toàn tin nhắn riêng |

### Chế Độ Nhóm

```yaml
channels:
  zalo-personal:
    groupPolicy: allowlist
    groups:
      "Team Dev":
        allow: true
      "Gia Đình":
        allow: true
```

| Chế độ | Hành vi |
|--------|---------|
| `allowlist` | Chỉ nhóm được liệt kê mới hoạt động |
| `open` | Tất cả nhóm đều nhận tin nhắn |
| `disabled` | Tắt hoàn toàn tin nhắn nhóm |

### Blocklist

```yaml
channels:
  zalo-personal:
    denyFrom:                    # Chặn toàn cục
      - "Spammer"
      - "123456789"
    groups:
      "Nhóm Công Khai":
        allow: true
        denyUsers:               # Chặn trong nhóm cụ thể
          - "Troll"
```

**Quy tắc:** Deny luôn thắng Allow. Extension tự động resolve tên → ID khi khởi động.

Bot có thể tự quản lý blocklist qua AI:
```
User: "Chặn user Bob đi"
Bot:  Đã chặn Bob (ID: 123456). Restart gateway để áp dụng.
```

### Tool Policy Theo Nhóm

```yaml
groups:
  "Nhóm Admin":
    allow: true
    tools:
      allow: ["*"]              # Nhóm này được dùng tất cả tools
  "Nhóm Khách":
    allow: true
    tools:
      deny: ["bash", "write"]   # Nhóm này bị giới hạn
```

### Mention Gating (Chỉ trả lời khi @mention)

Mặc định, bot chỉ trả lời trong group khi được @mention. Tin nhắn không mention sẽ được buffer để bot có ngữ cảnh khi được gọi.

```yaml
channels:
  zalo-personal:
    groupPolicy: open
    groups:
      "*":
        requireMention: true       # Mặc định: cần @mention (default)
      "Nhóm Hỗ Trợ":
        requireMention: false      # Nhóm này: trả lời mọi tin nhắn
      "Nhóm Chung":
        requireMention: true       # Chỉ trả lời khi @mention
```

| Cài đặt | Hành vi |
|---------|---------|
| `requireMention: true` | Bot chỉ reply khi được @mention. Tin nhắn khác được buffer cho context |
| `requireMention: false` | Bot reply mọi tin nhắn trong nhóm |
| Không cấu hình | Mặc định `true` - cần @mention |

**Admin có thể thay đổi qua chat:**
```
User: "Tắt chế độ mention cho nhóm này"
Bot:  (gọi group-mention action) → Đã tắt requireMention cho group 123456
```

**Context buffering:** Khi bot không được mention, tin nhắn vẫn được lưu tạm (tối đa 50 tin, 4 giờ). Khi được @mention, bot sẽ có đầy đủ ngữ cảnh cuộc trò chuyện để trả lời chính xác.

---

## Hệ Thống & Độ Tin Cậy

| Tính năng | Mô tả |
|-----------|-------|
| **Keep-alive** | Heartbeat tự động giữ session sống, refresh cookie |
| **Auto-reconnect** | Tự động kết nối lại khi mất kết nối (10s delay) |
| **Name resolution** | Resolve tên bạn bè & nhóm sang ID khi khởi động |
| **Multi-account** | Hỗ trợ nhiều tài khoản Zalo đồng thời |
| **Markdown** | Render markdown trong tin nhắn (hỗ trợ bảng) |
| **Message chunking** | Tự động chia tin nhắn dài (>2000 ký tự) |

---

## Cài Đặt Thủ Công

### Từ npm (khuyến nghị)

```bash
openclaw plugins install zalo-personal
```

### Từ source code (development)

```bash
git clone https://github.com/caochitam/zalo-personal.git
cd zalo-personal
npm install
openclaw plugins install --link .
```

### Đăng nhập

```bash
openclaw channels login --channel zalo-personal
# Hoặc dùng alias: openclaw channels login --channel zp
```

### Cập nhật

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/caochitam/zalo-personal/main/script/update.sh)
```

### Gỡ cài đặt

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/caochitam/zalo-personal/main/script/uninstall.sh)
```

---

## Xử Lý Sự Cố

### Đăng Nhập Thất Bại

```bash
rm ~/.openclaw/zalo-personal-credentials.json
openclaw channels login --channel zp
```

### Tin Nhắn Không Được Xử Lý

1. Kiểm tra `dmPolicy` và `groupPolicy` trong config
2. Kiểm tra `allowFrom` / `denyFrom`
3. Xem logs: `openclaw logs --follow`
4. Restart: `openclaw gateway restart`

### Session Hết Hạn

Cookie Zalo có thời hạn 1 giờ. Extension tự động refresh, nhưng nếu gateway tắt lâu:

```bash
openclaw channels login --channel zp
openclaw gateway restart
```

> Gặp vấn đề khác? [Mở issue trên GitHub](https://github.com/caochitam/zalo-personal/issues) — tác giả hỗ trợ nhanh nhờ Claude Code AI.

---

## Tech Stack

| Thư viện | Vai trò |
|----------|---------|
| **zca-js** | Zalo API (unofficial) |
| **OpenClaw** | AI messaging gateway |
| **TypeScript** | Type-safe development |
| **sharp** | Xử lý metadata hình ảnh |
| **Claude Code** | AI-assisted development |

---

## Ủng Hộ Dự Án

Dự án **zalo-personal** được phát triển và duy trì bởi một developer cá nhân, với sự hỗ trợ của **Claude Code** (AI) để tăng tốc phát triển tính năng mới và vá lỗi nhanh cho cộng đồng.

Chi phí vận hành Claude Code, server test, và thời gian phát triển đều từ túi cá nhân. Nếu extension này giúp ích cho bạn, hãy cân nhắc ủng hộ để dự án tiếp tục được phát triển:

<p align="center">
  <img src="https://raw.githubusercontent.com/caochitam/zalo-personal/main/momo-caochitam.jpg" alt="Ủng hộ qua MoMo / Ngân hàng" width="300" />
</p>

<p align="center">
  <strong>CAO CHÍ TÂM</strong><br/>
  <em>Quét mã QR bằng MoMo, app ngân hàng, hoặc ví điện tử hỗ trợ VietQR / Napas 247</em>
</p>

Mọi đóng góp dù nhỏ đều giúp:
- Duy trì chi phí **Claude Code** để phát triển và hỗ trợ nhanh hơn
- Thêm tính năng mới theo yêu cầu cộng đồng
- Vá lỗi và cập nhật kịp thời khi Zalo thay đổi API
- Viết tài liệu và hỗ trợ người dùng mới

---

## Đóng Góp Mã Nguồn

1. Fork repo
2. Tạo feature branch
3. Commit thay đổi
4. Mở Pull Request

---

## Liên Hệ

- **GitHub Issues:** https://github.com/caochitam/zalo-personal/issues
- **Email:** caochitam@gmail.com

---

## Tài Liệu Khác

- [README.en.md](README.en.md) — English documentation
- [INSTALL.md](INSTALL.md) — Hướng dẫn cài đặt
- [QUICK-REFERENCE.vi.md](QUICK-REFERENCE.vi.md) — Tham khảo lệnh nhanh
- [DEPLOY.md](DEPLOY.md) — Hướng dẫn deploy
- [CHANGELOG.md](CHANGELOG.md) — Lịch sử thay đổi

---

## License

MIT License — xem [LICENSE](LICENSE)

---

<p align="center">
  <strong>Made with care by caochitam</strong> | <em>Powered by OpenClaw + zca-js + Claude Code</em><br/><br/>
  <a href="#-ủng-hộ-dự-án"><img src="https://raw.githubusercontent.com/caochitam/zalo-personal/main/momo-caochitam.jpg" alt="Ủng hộ" width="160" /></a><br/>
  <sub>Thích dự án này? Quét mã QR để ủng hộ tác giả duy trì và phát triển tiếp!</sub>
</p>
