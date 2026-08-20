#!/usr/bin/env bash
# UGUI制作模式 preset 安装脚本：
# 1. 校验本仓库位于 ~/.dsh/.agent-presets/<id>/（DSH 按目录发现 preset，无需注册）
# 2. 向 Web Profile 的 package.json 写入 client bundle 的 link 依赖并执行 pnpm install
# 3. 提示后续配置步骤（ugui.config.json）
set -euo pipefail

PRESET_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRESET_ID="$(basename "$PRESET_DIR")"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PRESETS_DIR="$DSH_HOME_DIR/.agent-presets"
PROFILE_PKG="$DSH_HOME_DIR/profiles/web/package.json"
PACKAGE_NAME="dsh-local-ugui-tools"

case "$PRESET_DIR" in
  "$PRESETS_DIR"/*) ;;
  *) echo "⚠️  本仓库不在 $PRESETS_DIR 下。DSH 只发现该目录里的 preset，请先移动："
     echo "   mv \"$PRESET_DIR\" \"$PRESETS_DIR/ugui\""
     exit 1 ;;
esac

if [ ! -f "$PROFILE_PKG" ]; then
  echo "❌ 未找到 Web Profile: $PROFILE_PKG（请先运行过一次 dsh web）"
  exit 1
fi

LINK_TARGET="../../.agent-presets/$PRESET_ID/plugins/dsh-ugui-tools"
node - "$PROFILE_PKG" "$PACKAGE_NAME" "$LINK_TARGET" <<'EOF'
const fs = require('fs')
const [pkgPath, name, target] = process.argv.slice(2)
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.dependencies = pkg.dependencies || {}
if (pkg.dependencies[name] === `link:${target}`) {
  console.log('= Web Profile link 依赖已存在，跳过写入')
} else {
  pkg.dependencies[name] = `link:${target}`
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`+ 已写入 ${name}: link:${target}`)
}
EOF

echo "→ 执行 pnpm install 建立 link…"
(cd "$(dirname "$PROFILE_PKG")" && pnpm install)

echo ""
echo "✅ Preset 安装完成。剩余步骤："
echo "   1. cp setup/ugui.config.example.json ugui.config.json，把 projectPath 改成你的 Unity 工程根目录"
echo "      （asmdef 项目把 assemblyName 改成你的程序集名，默认 Assembly-CSharp）"
echo "   2. 重启 DSH（或等 Web Profile 重新构建后刷新页面）"
echo "   3. 新建「UGUI制作模式」会话，让 agent 执行一次 ugui_setup 创建工作台场景"
