const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')

let definition
const h = (type, props, ...children) => ({ type, props: props || {}, children })
global.window = {
  __ModuleLoader__: { load(value) { definition = value } },
  crypto: { randomUUID() { return 'gesture-undo-test' } },
}

const sourcePath = require('node:path').join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(sourcePath, 'utf8').replace(
  'exports.apply = apply;',
  'exports.__test = { createGestureUndoHistory, shouldHandleGestureUndo };\n\t\texports.apply = apply;',
)
vm.runInThisContext(source, { filename: sourcePath })
const plugin = definition.factory((name) => name === 'react' ? { createElement: h } : {})

const history = plugin.__test.createGestureUndoHistory(50)
history.record({
  canvasId: 'main-lobby-ui',
  nodeId: 'node-1111111111111111',
  beforeRect: { anchor: 'center', offset: [0, 0], size: [100, 100] },
  afterVersion: 11,
}, 10)

const available = history.peek('main-lobby-ui', 11)
assert.equal(available.ok, true)
assert.equal(available.action.nodeId, 'node-1111111111111111')
assert.deepEqual(available.action.beforeRect.offset, [0, 0])
assert.equal(history.depth('main-lobby-ui'), 1)

history.commit('main-lobby-ui', 12)
assert.equal(history.depth('main-lobby-ui'), 0)
assert.deepEqual(history.peek('main-lobby-ui', 12), { ok: false, reason: 'empty' })

const chain = plugin.__test.createGestureUndoHistory(50)
chain.record({ canvasId: 'main', nodeId: 'node-aaaaaaaaaaaaaaaa', beforeRect: { offset: [0, 0] }, afterVersion: 11 }, 10)
chain.record({ canvasId: 'main', nodeId: 'node-bbbbbbbbbbbbbbbb', beforeRect: { offset: [5, 5] }, afterVersion: 12 }, 11)
assert.equal(chain.peek('main', 12).action.nodeId, 'node-bbbbbbbbbbbbbbbb')
chain.commit('main', 13)
assert.equal(chain.peek('main', 13).action.nodeId, 'node-aaaaaaaaaaaaaaaa')
assert.deepEqual(chain.peek('main', 99), { ok: false, reason: 'version-conflict' })

chain.record({ canvasId: 'main', nodeId: 'node-cccccccccccccccc', beforeRect: { offset: [9, 9] }, afterVersion: 101 }, 100)
assert.equal(chain.depth('main'), 1)
assert.equal(chain.peek('main', 101).action.nodeId, 'node-cccccccccccccccc')
chain.record({ canvasId: 'other', nodeId: 'node-dddddddddddddddd', beforeRect: { offset: [1, 1] }, afterVersion: 4 }, 3)
assert.equal(chain.depth('main'), 1)
assert.equal(chain.depth('other'), 1)

const plainTarget = { closest() { return null } }
const textTarget = { closest() { return {} } }
assert.equal(plugin.__test.shouldHandleGestureUndo({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, repeat: false, defaultPrevented: false, target: plainTarget }), true)
assert.equal(plugin.__test.shouldHandleGestureUndo({ key: 'Z', ctrlKey: false, metaKey: true, shiftKey: false, repeat: false, defaultPrevented: false, target: plainTarget }), true)
assert.equal(plugin.__test.shouldHandleGestureUndo({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, repeat: false, defaultPrevented: false, target: plainTarget }), false)
assert.equal(plugin.__test.shouldHandleGestureUndo({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: true, repeat: false, defaultPrevented: false, target: plainTarget }), false)
assert.equal(plugin.__test.shouldHandleGestureUndo({ key: 'z', ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, repeat: false, defaultPrevented: false, target: textTarget }), false)

const limited = plugin.__test.createGestureUndoHistory(2)
limited.record({ canvasId: 'main', nodeId: 'node-1111111111111111', beforeRect: {}, afterVersion: 2 }, 1)
limited.record({ canvasId: 'main', nodeId: 'node-2222222222222222', beforeRect: {}, afterVersion: 3 }, 2)
limited.record({ canvasId: 'main', nodeId: 'node-3333333333333333', beforeRect: {}, afterVersion: 4 }, 3)
assert.equal(limited.depth('main'), 2)
assert.equal(limited.peek('main', 4).action.nodeId, 'node-3333333333333333')
limited.commit('main', 5)
assert.equal(limited.peek('main', 5).action.nodeId, 'node-2222222222222222')

console.log('gesture undo history and shortcut routing passed')
