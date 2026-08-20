#!/usr/bin/env node
/**
 * UGUI制作模式 preset 安装脚本（跨平台：macOS / Linux / Windows）：
 *   node setup/install.mjs
 * 1. 校验本仓库位于 ~/.dsh/.agent-presets/<id>/（DSH 按目录发现 preset，无需注册）
 * 2. 向 Web Profile 的 package.json 写入 client bundle 的 link 依赖并执行 pnpm install
 * 3. 打印后续配置步骤（ugui.config.json）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

const PRESET_DIR = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const PRESET_ID = PRESET_DIR.split(sep).pop()
const DSH_HOME_DIR = process.env.DSH_HOME || join(homedir(), '.dsh')
const PRESETS_DIR = join(DSH_HOME_DIR, '.agent-presets')
const PROFILE_PKG = join(DSH_HOME_DIR, 'profiles', 'web', 'package.json')
const PACKAGE_NAME = 'dsh-local-ugui-tools'

if (dirname(PRESET_DIR) !== PRESETS_DIR) {
	console.error(`⚠️  本仓库不在 ${PRESETS_DIR} 下。DSH 只发现该目录里的 preset，请先移动：`)
	console.error(`   移动到 ${join(PRESETS_DIR, 'ugui')}`)
	process.exit(1)
}

if (!existsSync(PROFILE_PKG)) {
	console.error(`❌ 未找到 Web Profile: ${PROFILE_PKG}（请先运行过一次 dsh web）`)
	process.exit(1)
}

// link 目标使用 posix 相对路径（pnpm 在 Windows 上同样接受正斜杠）
const linkTarget = `link:../../.agent-presets/${PRESET_ID}/plugins/dsh-ugui-tools`
const pkg = JSON.parse(readFileSync(PROFILE_PKG, 'utf8'))
pkg.dependencies = pkg.dependencies || {}
if (pkg.dependencies[PACKAGE_NAME] === linkTarget) {
	console.log('= Web Profile link 依赖已存在，跳过写入')
} else {
	pkg.dependencies[PACKAGE_NAME] = linkTarget
	writeFileSync(PROFILE_PKG, JSON.stringify(pkg, null, 2) + '\n')
	console.log(`+ 已写入 ${PACKAGE_NAME}: ${linkTarget}`)
}

console.log('→ 执行 pnpm install 建立 link…')
execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['install'], { cwd: dirname(PROFILE_PKG), stdio: 'inherit' })

console.log('')
console.log('✅ Preset 安装完成。剩余步骤：')
console.log('   1. 复制 setup/ugui.config.example.json 为 ugui.config.json，把 projectPath 改成你的 Unity 工程根目录')
console.log('      （asmdef 项目把 assemblyName 改成你的程序集名，默认 Assembly-CSharp）')
console.log('   2. 重启 DSH（或等 Web Profile 重新构建后刷新页面）')
console.log('   3. 新建「UGUI制作模式」会话，让 agent 执行一次 ugui_setup 创建工作台场景')
