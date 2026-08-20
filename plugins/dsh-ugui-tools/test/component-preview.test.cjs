const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

let definition
global.document = { querySelector() { return {} } }
global.window = {
  __ModuleLoader__: { load(value) { definition = value } },
  crypto: { randomUUID() { return 'component-preview-test' } },
}

const sourcePath = path.join(__dirname, '..', 'lib', 'client.js')
const originalSource = fs.readFileSync(sourcePath, 'utf8')
const source = originalSource.replace(
  'exports.apply = apply;',
  'exports.__test = { layoutFramesForChildren, previewHiddenNodeIds, previewNodeFlags, renderNode, frameOf, rectFromFrame };\n\t\texports.apply = apply;',
)
vm.runInThisContext(source, { filename: sourcePath })
const reactCalls = []
const plugin = definition.factory((name) => name === 'react' ? { createElement(...args) { reactCalls.push(args); return { args } } } : {})

function node(name, nodeId, rect, components, children = []) {
  return { name, nodeId, rect: rect || { anchor: 'topCenter', offset: [0, 0], size: [50, 20] }, components: components || [], children }
}

reactCalls.length = 0
const nestedGrid = node('Grid', 'node-0000000000000040', null, [{ type: 'GridLayoutGroup' }], [
  node('cell - G1', 'node-0000000000000041', null, [], [node('txt - Label', 'node-0000000000000042', null, [{ type: 'TMP_Text', text: 'A' }])]),
])
plugin.__test.renderNode(nestedGrid, 300, 200, ['root', 'children', 0], '', 1, () => {}, () => {}, () => {}, false, null, { hiddenNodeIds: new Set() }, null, false)
const renderedNodes = reactCalls.filter((call) => call[0] === 'div' && call[1] && call[1].className === 'uguiSide_node')
assert.equal(renderedNodes.length, 3, 'nested Grid, cell, and label are rendered')
const labelCall = renderedNodes[0][1]
assert.equal(labelCall.style.cursor, 'default', 'label inside a Grid-driven cell is not draggable')
assert.equal(labelCall.title.includes('LayoutGroup 控制'), true, 'label explains that a LayoutGroup ancestor controls layout')
let beganGesture = false
let selectedPath = null
reactCalls.length = 0
const nestedGridForGesture = node('Grid', 'node-0000000000000040', null, [{ type: 'GridLayoutGroup' }], [
  node('cell - G1', 'node-0000000000000041', null, [], [node('txt - Label', 'node-0000000000000042', null, [{ type: 'TMP_Text', text: 'A' }])]),
])
plugin.__test.renderNode(nestedGridForGesture, 300, 200, ['root', 'children', 0], '', 1, (path) => { selectedPath = path }, () => { beganGesture = true }, () => {}, false, null, { hiddenNodeIds: new Set() }, null, false)
const gestureLabelCall = reactCalls.filter((call) => call[0] === 'div' && call[1] && call[1].className === 'uguiSide_node')[0]
gestureLabelCall[1].onPointerDown({ button: 0, stopPropagation() {}, clientX: 0, clientY: 0 })
assert.deepEqual(selectedPath, ['root', 'children', 0, 0, 0], 'label can still be selected')
assert.equal(beganGesture, false, 'label inside a Grid-driven cell cannot start a misleading drag')

const horizontal = node('Row', 'node-0000000000000001', null, [{
  type: 'HorizontalLayoutGroup', padding: [10, 10, 5, 5], spacing: 10,
  childControlWidth: false, childControlHeight: false,
  childForceExpandWidth: false, childForceExpandHeight: false,
}], [node('A', 'node-0000000000000002'), node('B', 'node-0000000000000003')])
assert.deepEqual(plugin.__test.layoutFramesForChildren(horizontal, 300, 100), [
  { x: 10, y: 5, width: 50, height: 20 },
  { x: 70, y: 5, width: 50, height: 20 },
])

const grid = node('Grid', 'node-0000000000000010', null, [{
  type: 'GridLayoutGroup', padding: [10, 10, 5, 5], cellSize: [50, 40], spacing: [5, 7],
  constraint: 'fixedColumnCount', constraintCount: 2,
}], [node('A', 'node-0000000000000011'), node('B', 'node-0000000000000012'), node('C', 'node-0000000000000013')])
assert.deepEqual(plugin.__test.layoutFramesForChildren(grid, 300, 200), [
  { x: 10, y: 5, width: 50, height: 40 },
  { x: 65, y: 5, width: 50, height: 40 },
  { x: 10, y: 52, width: 50, height: 40 },
])

const toggle = node('Toggle', 'node-0000000000000020', null, [{ type: 'Toggle', isOn: false }], [
  node('Background', 'node-0000000000000021', null, [], [node('Checkmark', 'node-0000000000000022')]),
])
assert.deepEqual([...plugin.__test.previewHiddenNodeIds(toggle)], ['node-0000000000000022'])
toggle.components[0].graphicNodeId = 'node-0000000000000021'
assert.deepEqual([...plugin.__test.previewHiddenNodeIds(toggle)], ['node-0000000000000021'])
toggle.components[0].isOn = true
assert.deepEqual([...plugin.__test.previewHiddenNodeIds(toggle)], [])

reactCalls.length = 0
const toggleGroup = node('group - Toggles', 'node-0000000000000025', null, [{ type: 'ToggleGroup', allowSwitchOff: true }], [toggle])
plugin.__test.renderNode(toggleGroup, 300, 200, ['root', 'children', 0], '', 1, () => {}, () => {}, () => {}, false, null, { hiddenNodeIds: new Set() }, null, false)
const groupCall = reactCalls.filter((call) => call[0] === 'div' && call[1] && call[1].className === 'uguiSide_node').pop()
assert.equal(groupCall[1]['data-components'], 'ToggleGroup', 'ToggleGroup appears in the rendered component badge data')

assert.deepEqual(plugin.__test.previewNodeFlags(node('Mask', 'node-0000000000000030', null, [{ type: 'Mask' }])), { clipsChildren: true })
assert.deepEqual(plugin.__test.previewNodeFlags(node('Scroll', 'node-0000000000000031', null, [{ type: 'ScrollRect' }])), { clipsChildren: true })
assert.deepEqual(plugin.__test.previewNodeFlags(node('Plain', 'node-0000000000000032')), { clipsChildren: false })

assert.deepEqual(plugin.__test.frameOf({ anchor: 'topLeft', offset: [10, 20], size: [50, 30] }, 300, 200), { x: 10, y: 20, width: 50, height: 30 })
assert.deepEqual(plugin.__test.frameOf({ anchor: 'topRight', offset: [10, 20], size: [50, 30] }, 300, 200), { x: 240, y: 20, width: 50, height: 30 })
assert.deepEqual(plugin.__test.frameOf({ anchor: 'middleLeft', offset: [10, 20], size: [50, 30] }, 300, 200), { x: 10, y: 65, width: 50, height: 30 })
assert.deepEqual(plugin.__test.frameOf({ anchor: 'middleRight', offset: [10, 20], size: [50, 30] }, 300, 200), { x: 240, y: 65, width: 50, height: 30 })
assert.deepEqual(plugin.__test.frameOf({ anchor: 'bottomLeft', offset: [10, 20], size: [50, 30] }, 300, 200), { x: 10, y: 150, width: 50, height: 30 })
assert.deepEqual(plugin.__test.frameOf({ anchor: 'bottomRight', offset: [10, 20], size: [50, 30] }, 300, 200), { x: 240, y: 150, width: 50, height: 30 })
assert.deepEqual(plugin.__test.rectFromFrame({ anchor: 'middleRight' }, { x: 240, y: 65, width: 50, height: 30 }, 300, 200), { anchor: 'middleRight', offset: [10, 20], size: [50, 30] })

assert.equal(originalSource.includes('const childFrames = layoutFramesForChildren(node, frame.width, frame.height);'), true, 'renderer consumes layout-driven child frames')
assert.equal(originalSource.includes('overflow: flags.clipsChildren ? "hidden" : "visible"'), true, 'renderer clips Mask, RectMask2D, and ScrollRect children')
assert.equal(originalSource.includes('previewContext.hiddenNodeIds.has(node.nodeId) ? 0 : 1'), true, 'renderer reflects Toggle graphic state')
assert.equal(originalSource.includes('const ownGestureTarget = root || layoutDriven ? null'), true, 'layout-driven children cannot start misleading move/resize gestures')
assert.equal(originalSource.includes('drivesChildLayout || layoutDriven'), true, 'layout-driven ancestors propagate gesture restrictions to every descendant')
assert.equal(originalSource.includes('const showOwnGraphic = !mask || mask.showMaskGraphic !== false;'), true, 'Mask showMaskGraphic controls only the mask node graphic')

console.log('extended component preview layout, clipping, and Toggle state passed')
