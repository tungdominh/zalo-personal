#!/bin/bash
# Zalo Personal Extension - Update Script
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/caochitam/zalo-personal/main/script/update.sh)

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🔄 Zalo Personal Extension - Update                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

EXT_DIR="$HOME/.openclaw/extensions/zalo-personal"
CONFIG_FILE="$HOME/.openclaw/openclaw.json"
PLUGIN_ID="zalo-personal"

# Check if openclaw is installed
if ! command -v openclaw &> /dev/null; then
    echo "❌ OpenClaw chưa được cài đặt!"
    echo "📥 Vui lòng cài đặt OpenClaw trước:"
    echo "   https://openclaw.ai"
    exit 1
fi

echo "✅ OpenClaw detected"
echo ""

# Check if plugin is installed
if [ ! -d "$EXT_DIR" ]; then
    echo "❌ Plugin zalo-personal chưa được cài đặt!"
    echo ""
    echo "📥 Vui lòng cài đặt plugin trước:"
    echo "   bash <(curl -fsSL https://raw.githubusercontent.com/caochitam/zalo-personal/main/quick-install.sh)"
    exit 1
fi

echo "📦 Plugin được tìm thấy tại: $EXT_DIR"
echo ""

# Read current version
CURRENT_VERSION="unknown"
if [ -f "$EXT_DIR/package.json" ]; then
    CURRENT_VERSION=$(node -e "
    try {
      const pkg = require('$EXT_DIR/package.json');
      console.log(pkg.version);
    } catch { console.log('unknown'); }
    " 2>/dev/null)
fi

echo "📌 Phiên bản hiện tại: v$CURRENT_VERSION"
echo ""

# Check latest version from npm
echo "🔍 Đang kiểm tra phiên bản mới nhất từ npm..."
LATEST_VERSION=$(npm show "$PLUGIN_ID" version 2>/dev/null || echo "unknown")

if [ "$LATEST_VERSION" = "unknown" ]; then
    echo "❌ Không thể kiểm tra phiên bản mới nhất từ npm"
    echo "ℹ️  Vui lòng kiểm tra kết nối internet"
    exit 1
fi

echo "📦 Phiên bản mới nhất: v$LATEST_VERSION"
echo ""

# Check if already up-to-date
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ]; then
    echo "✅ Plugin đã ở phiên bản mới nhất (v$LATEST_VERSION)"
    echo ""
    read -p "🔄 Bạn có muốn cài đặt lại phiên bản hiện tại? (y/n): " REINSTALL

    if [[ ! "$REINSTALL" =~ ^[Yy]$ ]]; then
        echo "❌ Đã hủy update"
        exit 0
    fi
    echo ""
fi

# Confirm before update
echo "🔄 Cập nhật sẽ được thực hiện:"
echo "   v$CURRENT_VERSION → v$LATEST_VERSION"
echo ""
read -p "⚠️  Tiếp tục cập nhật? (y/n): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Đã hủy update"
    exit 0
fi

echo ""
echo "🚀 Bắt đầu cập nhật..."
echo ""

# Step 1: Save current channel config before uninstall
echo "💾 [1/4] Lưu cấu hình channel hiện tại..."
SAVED_CHANNEL_CONFIG=""
if [ -f "$CONFIG_FILE" ]; then
    SAVED_CHANNEL_CONFIG=$(node -e "
    const fs = require('fs');
    try {
      const c = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
      if (c.channels && c.channels['zalo-personal']) {
        console.log(JSON.stringify(c.channels['zalo-personal']));
      }
    } catch {}
    " 2>/dev/null)
fi
if [ -n "$SAVED_CHANNEL_CONFIG" ]; then
    echo "   ✅ Đã lưu channel config"
else
    echo "   ℹ️  Không tìm thấy channel config (sẽ tạo mới sau)"
fi
echo ""

# Step 2: Clean config and remove old extension
echo "🧹 [2/4] Dọn dẹp plugin cũ..."

# Clean config to avoid validation errors during reinstall
if [ -f "$CONFIG_FILE" ]; then
    node -e "
    const fs = require('fs');
    const path = '$CONFIG_FILE';
    try {
      const config = JSON.parse(fs.readFileSync(path, 'utf8'));
      let changed = false;

      // Remove channel config temporarily (will restore after install)
      if (config.channels && config.channels['zalo-personal']) {
        delete config.channels['zalo-personal'];
        changed = true;
      }

      // Remove plugin entries
      if (config.plugins) {
        if (config.plugins.entries && config.plugins.entries['zalo-personal']) {
          delete config.plugins.entries['zalo-personal'];
          changed = true;
        }
        if (config.plugins.installs && config.plugins.installs['zalo-personal']) {
          delete config.plugins.installs['zalo-personal'];
          changed = true;
        }
        if (Array.isArray(config.plugins.allow)) {
          const idx = config.plugins.allow.indexOf('zalo-personal');
          if (idx !== -1) {
            config.plugins.allow.splice(idx, 1);
            changed = true;
          }
        }
      }

      if (changed) {
        fs.writeFileSync(path, JSON.stringify(config, null, 2));
        console.log('   ✅ Đã dọn config cũ');
      }
    } catch (e) {
      console.error('   ⚠️  Warning:', e.message);
    }
    " 2>/dev/null || echo "   ⚠️  Không thể dọn config"
fi

# Remove old extension directory
rm -rf "$EXT_DIR"
echo "   ✅ Đã xóa plugin cũ"
echo ""

# Step 3: Install fresh from npm via openclaw
echo "📥 [3/4] Cài đặt phiên bản mới..."
echo "⚠️  Có thể xuất hiện warning về 'dangerous code patterns' - điều này bình thường"
echo ""

openclaw plugins install "$PLUGIN_ID" 2>&1

INSTALL_EXIT_CODE=$?
echo ""

if [ $INSTALL_EXIT_CODE -ne 0 ]; then
    echo "❌ Cài đặt thất bại!"
    echo ""
    echo "🔍 Có thể thử:"
    echo "  1. Kiểm tra internet connection"
    echo "  2. Chạy: openclaw doctor --fix"
    echo "  3. Báo lỗi: https://github.com/caochitam/zalo-personal/issues"
    exit 1
fi

# Step 4: Restore channel config and set plugins.allow
echo "🔧 [4/4] Khôi phục cấu hình..."

node -e "
const fs = require('fs');
const path = '$CONFIG_FILE';
const savedConfig = '$SAVED_CHANNEL_CONFIG';

try {
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));

  // Restore channel config
  if (!config.channels) config.channels = {};
  if (savedConfig) {
    config.channels['zalo-personal'] = JSON.parse(savedConfig);
    console.log('   ✅ Đã khôi phục channel config');
  } else {
    // Default open mode
    config.channels['zalo-personal'] = { dmPolicy: 'open', allowFrom: ['*'] };
    console.log('   ✅ Đã tạo channel config mặc định (open mode)');
  }

  // Ensure plugins.allow
  if (!config.plugins) config.plugins = {};
  if (!Array.isArray(config.plugins.allow)) config.plugins.allow = [];
  if (!config.plugins.allow.includes('zalo-personal')) {
    config.plugins.allow.push('zalo-personal');
  }
  console.log('   ✅ Đã set plugins.allow');

  fs.writeFileSync(path, JSON.stringify(config, null, 2));
} catch (e) {
  console.error('   ⚠️  Warning:', e.message);
}
" 2>/dev/null || echo "   ⚠️  Không thể khôi phục config"

echo ""

# Read new version
NEW_VERSION="unknown"
if [ -f "$EXT_DIR/package.json" ]; then
    NEW_VERSION=$(node -e "
    try {
      const pkg = require('$EXT_DIR/package.json');
      console.log(pkg.version);
    } catch { console.log('unknown'); }
    " 2>/dev/null)
fi

echo "─────────────────────────────────────────────────────────────"
echo "✅ Cập nhật thành công! v$CURRENT_VERSION → v$NEW_VERSION"
echo ""
read -p "🔄 Restart OpenClaw gateway để áp dụng? (y/n): " RESTART

if [[ "$RESTART" =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔄 Đang restart gateway..."
    openclaw gateway restart
    echo ""
    echo "✅ Gateway đã được restart!"
else
    echo ""
    echo "⚠️  QUAN TRỌNG: Restart gateway để áp dụng cập nhật:"
    echo "   openclaw gateway restart"
fi

echo ""
echo "─────────────────────────────────────────────────────────────"
echo "🎉 Hoàn tất! Zalo Personal đã được cập nhật."
echo ""
echo "📚 Xem changelog tại:"
echo "   https://github.com/caochitam/zalo-personal/releases"
echo ""
echo "💬 Góp ý hoặc báo lỗi:"
echo "   https://github.com/caochitam/zalo-personal/issues"
echo ""
