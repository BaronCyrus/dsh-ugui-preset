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
const LINK_PACKAGES = [
	['dsh-local-ugui-tools', 'dsh-ugui-tools'],
	['dsh-local-ugui-entry-guard', 'dsh-ugui-entry-guard'],
]
const pkg = JSON.parse(readFileSync(PROFILE_PKG, 'utf8'))
pkg.dependencies = pkg.dependencies || {}
let changed = false
for (const [name, dir] of LINK_PACKAGES) {
	const linkTarget = `link:../../.agent-presets/${PRESET_ID}/plugins/${dir}`
	if (pkg.dependencies[name] !== linkTarget) {
		pkg.dependencies[name] = linkTarget
		changed = true
		console.log(`+ 已写入 ${name}: ${linkTarget}`)
	} else {
		console.log(`= ${name} link 依赖已存在，跳过`)
	}
}
if (changed) writeFileSync(PROFILE_PKG, JSON.stringify(pkg, null, 2) + '\n')

// cordis.patch.yml 中确保 ugui-entry-guard 常驻行存在（入口守卫：首屏清单缺 ugui 时自动刷新一次）
const PATCH_PATH = join(DSH_HOME_DIR, 'profiles', 'web', 'cordis.patch.yml')
const GUARD_INSERT = [
	'    # UGUI 入口守卫（常驻）：当前会话是 ugui preset 但入口按钮缺失时主动刷新一次页面，',
	'    # 覆盖重启后首屏启动清单尚未包含 ugui client 行的冷启动缺口。',
	'    - id: ugui-entry-guard',
	'      name: dsh-local-ugui-entry-guard',
].join('\n')
if (existsSync(PATCH_PATH)) {
	const patchText = readFileSync(PATCH_PATH, 'utf8')
	if (!patchText.includes('dsh-local-ugui-entry-guard')) {
		const anchor = /^(\s*name: dsh-local-session-delete\s*)$/m
		if (anchor.test(patchText)) {
			writeFileSync(PATCH_PATH, patchText.replace(anchor, (match) => match + '\n' + GUARD_INSERT))
			console.log('+ cordis.patch.yml 已插入 ugui-entry-guard 常驻行')
		} else {
			console.warn('⚠️  未能在 cordis.patch.yml 自动插入常驻行（未找到锚点），请手动在 patch insert 列表添加：')
			console.warn(GUARD_INSERT)
		}
	} else {
		console.log('= cordis.patch.yml 已含 ugui-entry-guard 行，跳过')
	}
} else {
	console.warn(`⚠️  未找到 ${PATCH_PATH}，请手动在 patch insert 列表添加：`)
	console.warn(GUARD_INSERT)
}

console.log('→ 执行 pnpm install 建立 link…')
execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['install'], { cwd: dirname(PROFILE_PKG), stdio: 'inherit' })

console.log('')
console.log('✅ Preset 安装完成。剩余步骤：')
console.log('   1. 复制 setup/ugui.config.example.json 为 ugui.config.json，把 projectPath 改成你的 Unity 工程根目录')
console.log('      （asmdef 项目把 assemblyName 改成你的程序集名，默认 Assembly-CSharp）')
console.log('   2. 重启 DSH（或等 Web Profile 重新构建后刷新页面）')
console.log('   3. 新建「UGUI制作模式」会话，让 agent 执行一次 ugui_setup 创建工作台场景')
