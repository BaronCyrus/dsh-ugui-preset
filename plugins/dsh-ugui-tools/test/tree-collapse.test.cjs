const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const storage = new Map()
global.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null },
  setItem(key, value) { storage.set(key, String(value)) },
}

global.window = {
  __ModuleLoader__: { load(value) { global.__treeDefinition = value } },
  crypto: { randomUUID() { return 'tree-collapse-test' } },
}

const h = (type, props, ...children) => ({ type, props: props || {}, children })
function createHooks() {
  const slots = []
  let cursor = 0
  let pending = []
  return {
    react: {
      createElement: h,
      useState(initial) {
        const index = cursor++
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
        return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next }]
      },
      useEffect(effect, dependencies) {
        const index = cursor++
        const previous = slots[index]
        const changed = !previous || dependencies.some((value, offset) => value !== previous[offset])
        slots[index] = dependencies
        if (changed) pending.push(effect)
      },
    },
    begin() { cursor = 0 },
    flushEffects() { const effects = pending; pending = []; for (const effect of effects) effect() },
  }
}

const sourcePath = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(sourcePath, 'utf8').replace(
  'exports.apply = apply;',
  'exports.__test = { Tree };\n\t\texports.apply = apply;',
)
vm.runInThisContext(source, { filename: sourcePath })

const root = {
  nodeId: 'node-aaaaaaaaaaaaaaaa',
  name: 'Root',
  components: [],
  children: [{ nodeId: 'node-bbbbbbbbbbbbbbbb', name: 'Child', components: [], children: [] }],
}

function flatten(value, output = []) {
  if (Array.isArray(value)) for (const item of value) flatten(item, output)
  else if (value && typeof value === 'object') {
    output.push(value)
    flatten(value.children || [], output)
  }
  return output
}

const hooks = createHooks()
const plugin = global.__treeDefinition.factory((name) => name === 'react' ? hooks.react : {})
function render(selectedPath = []) {
  hooks.begin()
  return plugin.__test.Tree({ root, selectedPath, canvasId: 'main', onSelect() {} })
}

let tree = render()
assert.equal(flatten(tree).filter((node) => node.props.className === 'uguiSide_treeRow').length, 2)
const toggle = flatten(tree).find((node) => node.props.className === 'uguiSide_treeToggle')
assert.ok(toggle, 'parent row exposes a collapse toggle')
assert.equal(toggle.props['aria-expanded'], true)
toggle.props.onClick({ stopPropagation() {} })

tree = render()
hooks.flushEffects()
assert.equal(flatten(tree).filter((node) => node.props.className === 'uguiSide_treeRow').length, 1)
assert.equal(flatten(tree).find((node) => node.props.className === 'uguiSide_treeToggle').props['aria-expanded'], false)
assert.deepEqual(JSON.parse(storage.get('dsh.ugui.treeCollapsed.main')), ['node-aaaaaaaaaaaaaaaa'])

const remountedHooks = createHooks()
const remountedPlugin = global.__treeDefinition.factory((name) => name === 'react' ? remountedHooks.react : {})
remountedHooks.begin()
let remounted = remountedPlugin.__test.Tree({ root, selectedPath: [], canvasId: 'main', onSelect() {} })
assert.equal(flatten(remounted).filter((node) => node.props.className === 'uguiSide_treeRow').length, 1)

remountedHooks.flushEffects()
remountedHooks.begin()
remounted = remountedPlugin.__test.Tree({ root, selectedPath: [0], canvasId: 'main', onSelect() {} })
remountedHooks.flushEffects()
remountedHooks.begin()
remounted = remountedPlugin.__test.Tree({ root, selectedPath: [0], canvasId: 'main', onSelect() {} })
remountedHooks.flushEffects()
assert.equal(flatten(remounted).filter((node) => node.props.className === 'uguiSide_treeRow').length, 2)
assert.deepEqual(JSON.parse(storage.get('dsh.ugui.treeCollapsed.main')), [])

storage.set('dsh.ugui.treeCollapsed.main', JSON.stringify(['node-aaaaaaaaaaaaaaaa']))
const otherHooks = createHooks()
const otherPlugin = global.__treeDefinition.factory((name) => name === 'react' ? otherHooks.react : {})
otherHooks.begin()
const otherTree = otherPlugin.__test.Tree({ root, selectedPath: [], canvasId: 'other', onSelect() {} })
assert.equal(flatten(otherTree).filter((node) => node.props.className === 'uguiSide_treeRow').length, 2)
assert.equal(flatten(otherTree).filter((node) => node.props.className === 'uguiSide_treeToggle').length, 1)
assert.equal(flatten(otherTree).filter((node) => node.props.className === 'uguiSide_treeMark').length, 1)

const legacyRoot = { name: 'LegacyRoot', components: [], children: [{ name: 'LegacyChild', components: [], children: [] }] }
const legacyHooks = createHooks()
const legacyPlugin = global.__treeDefinition.factory((name) => name === 'react' ? legacyHooks.react : {})
legacyHooks.begin()
let legacyTree = legacyPlugin.__test.Tree({ root: legacyRoot, selectedPath: [], canvasId: 'legacy', onSelect() {} })
flatten(legacyTree).find((node) => node.props.className === 'uguiSide_treeToggle').props.onClick({ stopPropagation() {} })
legacyHooks.begin()
legacyTree = legacyPlugin.__test.Tree({ root: legacyRoot, selectedPath: [], canvasId: 'legacy', onSelect() {} })
legacyHooks.flushEffects()
assert.equal(flatten(legacyTree).filter((node) => node.props.className === 'uguiSide_treeRow').length, 1)
assert.deepEqual(JSON.parse(storage.get('dsh.ugui.treeCollapsed.legacy')), [])

console.log('component tree collapse persistence, Canvas isolation, accessibility, and target reveal passed')
