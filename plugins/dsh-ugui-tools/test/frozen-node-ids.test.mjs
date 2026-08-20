import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const packageRoot = new URL('..', import.meta.url)
const sourcePath = new URL('lib/host.js', packageRoot)
const project = await mkdtemp(join(tmpdir(), 'ugui-frozen-'))

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) deepFreeze(child)
  return Object.freeze(value)
}

try {
  const original = await readFile(sourcePath, 'utf8')
  // 用临时工程根目录替换 preset 配置加载（对应 host.js 的 ugui.config.json 机制）
  const source = original.replace(
    'const PRESET_CONFIG = loadPresetConfig()',
    `const PRESET_CONFIG = { config: { projectPath: ${JSON.stringify(project)}, dslDir: ${JSON.stringify(join(project, '.scratch', 'ui-dsl'))}, prefabDir: 'Assets/AddressableResources/UIPrefab', generatedScriptDir: ${JSON.stringify(join(project, 'Assets', 'Scripts', 'UserInterface', 'Generated'))}, assemblyDll: ${JSON.stringify(join(project, 'Library', 'ScriptAssemblies', 'Assembly-CSharp.dll'))} } }`,
  )
  if (source === original) throw new Error('patch anchor missing: const PRESET_CONFIG = loadPresetConfig()')
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
  const host = await import(moduleUrl)
  const tools = new Map()
  const context = {
    get(name) {
      if (name === 'webServer') return { register() { return () => {} } }
      if (name === 'sessions') return { get() { return { id: 'test-session' } } }
      if (name === 'tools') return { register(definition) { tools.set(definition.name, definition); return () => {} } }
      return undefined
    },
    on() { return () => {} },
    effect() {},
  }
  host.apply(context)

  const dsl = deepFreeze({
    dslVersion: 1,
    name: 'FrozenCanvas',
    canvas: { referenceResolution: [1080, 1920] },
    root: {
      name: 'FrozenCanvas',
      children: [{ name: 'NewChild', rect: { anchor: 'center', offset: [0, 0], size: [100, 100] }, children: [] }],
    },
  })
  const result = await tools.get('ugui_apply_dsl').execute({ dsl })
  assert.equal(result.ok, true, result.error)
  assert.equal('nodeId' in dsl.root, false, 'frozen caller input remains untouched')
  assert.equal('nodeId' in dsl.root.children[0], false, 'frozen child input remains untouched')

  let persisted = JSON.parse(await readFile(join(project, '.scratch', 'ui-dsl', 'canvases', `${result.canvasId}.dsl.json`), 'utf8'))
  assert.match(persisted.root.nodeId, /^node-[a-f0-9]{16}$/)
  assert.match(persisted.root.children[0].nodeId, /^node-[a-f0-9]{16}$/)
  assert.notEqual(persisted.root.nodeId, persisted.root.children[0].nodeId)
  const originalChildId = persisted.root.children[0].nodeId

  const patch = deepFreeze({
    children: [
      { name: 'NewChild', rect: { anchor: 'center', offset: [0, 0], size: [100, 100] }, children: [] },
      { name: 'SecondChild', rect: { anchor: 'center', offset: [20, 20], size: [80, 80] }, children: [] },
    ],
  })
  const patched = await tools.get('ugui_patch_node').execute({
    canvasId: result.canvasId,
    expectedVersion: result.version,
    nodeId: persisted.root.nodeId,
    patch,
  })
  assert.equal(patched.ok, true, patched.error)
  assert.equal('nodeId' in patch.children[0], false, 'frozen inherited child remains untouched')
  assert.equal('nodeId' in patch.children[1], false, 'frozen new child remains untouched')

  persisted = JSON.parse(await readFile(join(project, '.scratch', 'ui-dsl', 'canvases', `${result.canvasId}.dsl.json`), 'utf8'))
  assert.equal(persisted.root.children[0].nodeId, originalChildId, 'unique-name inheritance preserves the existing child identity')
  assert.match(persisted.root.children[1].nodeId, /^node-[a-f0-9]{16}$/)
  assert.notEqual(persisted.root.children[1].nodeId, originalChildId)

  const invalidRectDsl = deepFreeze({
    dslVersion: 1,
    name: 'InvalidRectCanvas',
    canvas: { referenceResolution: [1080, 1920] },
    root: {
      name: 'InvalidRectCanvas',
      rect: { anchor: 'top', offset: [0, 0], size: [100, 100] },
      children: [],
    },
  })
  const invalidRectResult = await tools.get('ugui_apply_dsl').execute({ dsl: invalidRectDsl })
  assert.equal(invalidRectResult.ok, false)
  assert.match(invalidRectResult.error, /不支持的 anchor: top/)

  const referencedInvalidId = 'custom-invalid-id'
  const remappedDsl = deepFreeze({
    dslVersion: 1,
    name: 'RemappedReferenceCanvas',
    canvas: { referenceResolution: [1080, 1920] },
    root: {
      name: 'RemappedReferenceCanvas',
      nodeId: 'node-0000000000000001',
      children: [{
        name: 'ToggleRoot',
        nodeId: referencedInvalidId,
        rect: { anchor: 'center', offset: [0, 0], size: [200, 80] },
        components: [{ type: 'ToggleGroup', allowSwitchOff: false }],
        children: [{
          name: 'ToggleChild',
          nodeId: 'node-0000000000000002',
          rect: { anchor: 'center', offset: [0, 0], size: [180, 60] },
          components: [{ type: 'Toggle', toggleGroupNodeId: referencedInvalidId }],
          children: [],
        }],
      }],
    },
  })
  const remappedResult = await tools.get('ugui_apply_dsl').execute({ dsl: remappedDsl })
  assert.equal(remappedResult.ok, true, remappedResult.error)
  persisted = JSON.parse(await readFile(join(project, '.scratch', 'ui-dsl', 'canvases', `${remappedResult.canvasId}.dsl.json`), 'utf8'))
  const remappedGroupId = persisted.root.children[0].nodeId
  assert.match(remappedGroupId, /^node-[a-f0-9]{16}$/)
  assert.notEqual(remappedGroupId, referencedInvalidId)
  assert.equal(persisted.root.children[0].children[0].components[0].toggleGroupNodeId, remappedGroupId, 'ID remapping rewrites component references')

  console.log('frozen apply and patch children receive host-owned stable nodeIds without mutating caller input')
} finally {
  await rm(project, { recursive: true, force: true })
}
