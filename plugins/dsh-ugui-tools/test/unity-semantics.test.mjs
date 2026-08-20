import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// UNITY_SEMANTICS.md 是预览器交互语义的本地缓存；本测试保证它不过期：
// 1. 文档 pin 的 uGUI PackageCache 版本必须与目标 Unity 工程实际运行版本一致（Unity 升级即漂移）
// 2. 每个组件小节声明的源文件必须真实存在于 PackageCache 中
// 目标工程来自 preset 根目录的 ugui.config.json；未配置（仓库刚 clone）时跳过并提示。
const presetRoot = fileURLToPath(new URL('../../', import.meta.url))
const doc = await readFile(new URL('../UNITY_SEMANTICS.md', import.meta.url), 'utf8')

const pinMatch = doc.match(/uGUI pin\*\*:\s*`(com\.unity\.ugui@[0-9a-f]+)`/)
assert.ok(pinMatch, 'UNITY_SEMANTICS.md 缺少 uGUI pin（格式：**uGUI pin**: `com.unity.ugui@<hash>`）')
const pinned = pinMatch[1]

let projectPath = null
try {
  const config = JSON.parse(await readFile(join(presetRoot, 'ugui.config.json'), 'utf8'))
  projectPath = typeof config.projectPath === 'string' && config.projectPath !== '' ? config.projectPath : null
} catch {}

if (projectPath === null) {
  console.warn('unity-semantics.test.mjs: 跳过（未配置 ugui.config.json 的 projectPath；接入目标 Unity 工程后会自动启用新鲜度校验）')
  process.exit(0)
}

const entries = await readdir(join(projectPath, 'Library', 'PackageCache'))
const uguiDirs = entries.filter((entry) => entry.startsWith('com.unity.ugui@'))
assert.equal(uguiDirs.length, 1, `PackageCache 中应恰好有一个 com.unity.ugui@*，实际: ${uguiDirs.join(', ') || '(无)'}`)
assert.equal(
  uguiDirs[0], pinned,
  `UNITY_SEMANTICS.md 已过期：文档 pin ${pinned} != 实际运行版本 ${uguiDirs[0]}。`
  + '请按文档「过期重核流程」重核受影响小节并更新 pin。'
)

// 每个组件小节必须声明源文件，且源文件必须存在于当前 PackageCache
const sections = doc.split(/^## /m).slice(1).filter((section) => !section.startsWith('版本钉') && !section.startsWith('渐进披露') && !section.startsWith('修改规程'))
assert.ok(sections.length >= 5, `语义文档应至少覆盖 5 个组件小节，实际 ${sections.length}`)
for (const section of sections) {
  const title = section.split('\n', 1)[0].trim()
  const sourceMatch = section.match(/源：`([^`]+\.cs)`/)
  assert.ok(sourceMatch, `小节「${title}」缺少源文件声明（格式：源：\`路径.cs\`）`)
  const files = sourceMatch[1].split('、').map((part) => part.replace(/[`\s]/g, ''))
  for (const file of files) {
    const rel = file.replace(/^Runtime\//, '')
    const full = join(projectPath, 'Library', 'PackageCache', pinned, 'Runtime', rel)
    assert.ok(existsSync(full), `小节「${title}」声明的源文件不存在: ${file}`)
  }
}

console.log('unity-semantics.test.mjs: ok')
