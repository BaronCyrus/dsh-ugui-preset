import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const packageRoot = new URL('..', import.meta.url)
const hostSource = await readFile(new URL('lib/host.js', packageRoot), 'utf8')
const moduleUrl = `data:text/javascript;base64,${Buffer.from(hostSource).toString('base64')}`
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
const definition = tools.get('ugui_visual_acceptance_check')
assert.ok(definition, 'visual acceptance tool must be registered')

const badDsl = {
  name: 'BadInventoryUI',
  canvas: { referenceResolution: [1080, 1920] },
  root: {
    name: 'BadInventoryUI', nodeId: 'node-0000000000001000', rect: { anchor: 'stretch', offset: [0, 0, 0, 0] },
    children: [
      { name: 'Tabs', nodeId: 'node-0000000000001001', rect: { anchor: 'center', offset: [0, 760], size: [900, 80] }, components: [{ type: 'ToggleGroup' }], children: [] },
      { name: 'Detail', nodeId: 'node-0000000000001002', rect: { anchor: 'top', offset: [300, 250], size: [900, 500] }, components: [{ type: 'TMP_Text', text: '攻击力 +12\\n耐久 80/100' }] },
      // Toggle 的 Background/Checkmark/Label 是刻意的层叠结构（互相完全包含），不得误报为重叠。
      {
        name: 'Tab', nodeId: 'node-0000000000001007', rect: { anchor: 'center', offset: [-300, 760], size: [200, 80] },
        components: [{ type: 'Toggle' }],
        children: [
          { name: 'Background', nodeId: 'node-0000000000001008', rect: { anchor: 'stretch', offset: [0, 0, 0, 0] }, components: [{ type: 'Image' }], children: [] },
          { name: 'Checkmark', nodeId: 'node-0000000000001009', rect: { anchor: 'middleLeft', offset: [12, 0], size: [32, 32] }, components: [{ type: 'Image' }], children: [] },
          { name: 'Label', nodeId: 'node-0000000000001010', rect: { anchor: 'stretch', offset: [0, 0, 0, 0] }, components: [{ type: 'TMP_Text', text: '全部' }], children: [] },
        ],
      },
      {
        name: 'List', nodeId: 'node-0000000000001003', rect: { anchor: 'center', offset: [0, 150], size: [900, 700] },
        components: [{ type: 'ScrollRect', contentNodeId: 'node-0000000000001005', viewportNodeId: 'node-0000000000001004' }],
        children: [{ name: 'Viewport', nodeId: 'node-0000000000001004', rect: { anchor: 'stretch', offset: [0, 0, 0, 0] }, children: [{ name: 'Content', nodeId: 'node-0000000000001005', rect: { anchor: 'topStretch', offset: [0, 0], size: [0, 800] }, components: [{ type: 'VerticalLayoutGroup', childControlHeight: true }], children: [{ name: 'Item', nodeId: 'node-0000000000001006', rect: { anchor: 'center', offset: [0, 0], size: [800, 80] }, components: [{ type: 'Image' }] }] }] }]
      },
      // active:false 的初始隐藏子树与可见兄弟部分交叠也不参与重叠判定（选中态标记等）。
      {
        name: 'HiddenBadge', nodeId: 'node-0000000000001011', active: false, rect: { anchor: 'center', offset: [-300, 800], size: [200, 80] },
        components: [{ type: 'Image' }],
        children: [],
      },
    ],
  },
}

const result = await definition.execute({ dsl: badDsl })
assert.equal(result.ok, false)
const messages = result.issues.map((issue) => issue.message).join('\n')
assert.match(messages, /不支持的 anchor: top/)
assert.match(messages, /字面 \\n/)
assert.match(messages, /重叠/)
assert.match(messages, /LayoutElement/)
assert.equal(result.summary.scrollRects, 1)
assert.equal(result.summary.toggleGroups, 1)
const overlapMessages = result.issues.filter((issue) => issue.message.includes('重叠')).map((issue) => issue.message).join('\n')
assert.doesNotMatch(overlapMessages, /Background|Checkmark|Label/, 'Toggle layers must not be reported as overlap')
assert.doesNotMatch(overlapMessages, /HiddenBadge/, 'active:false subtree must not be reported as overlap')
assert.match(overlapMessages, /Detail 与 List/, 'partial graphic overlap must still be reported')

console.log('visual acceptance checker catches overlap, literal newline, and missing LayoutElement')
