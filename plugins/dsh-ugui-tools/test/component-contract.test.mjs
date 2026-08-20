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

const definition = tools.get('ugui_component_contract')
assert.ok(definition, 'component contract tool must be registered')
const result = await definition.execute({})
assert.equal(result.ok, true)
assert.equal(result.contract.version, 1)
assert.equal(result.contract.referenceStrategy.explicit, 'nodeId')
assert.equal(result.contract.referenceStrategy.fallback, 'standard-child-name')
assert.ok(result.contract.rect, 'component contract exposes the rect anchor contract')
for (const anchor of ['center', 'topLeft', 'topCenter', 'topRight', 'middleLeft', 'middleRight', 'bottomLeft', 'bottomCenter', 'bottomRight', 'topStretch', 'bottomStretch', 'leftStretch', 'rightStretch', 'stretch', 'custom']) {
  assert.match(result.contract.rect.anchor, new RegExp(`\\b${anchor}\\b`), `contract exposes ${anchor}`)
}
assert.doesNotMatch(result.contract.rect.anchor, /没有 top\/bottom\/left\/right 等简写/)
assert.match(result.contract.rect.offset, /\[left,top,right,bottom\]/)
assert.match(result.contract.components.Toggle.notes, /CrossFadeAlpha 是乘在颜色 alpha 上的系数/)

const expected = [
  'Image', 'TMP_Text', 'Button',
  'Toggle', 'ToggleGroup', 'Slider', 'Scrollbar', 'ScrollRect',
  'Mask', 'RectMask2D',
  'HorizontalLayoutGroup', 'VerticalLayoutGroup', 'GridLayoutGroup', 'ContentSizeFitter', 'LayoutElement',
]
assert.deepEqual(Object.keys(result.contract.components), expected)
assert.deepEqual(result.contract.components.Toggle.references.graphicNodeId.fallbackNames, ['Checkmark'])
assert.deepEqual(result.contract.components.Toggle.references.toggleGroupNodeId, {
  unityProperty: 'group',
  required: false,
  fallbackNames: []
})
assert.equal(result.contract.components.ToggleGroup.fields.allowSwitchOff, 'boolean，默认 false')
assert.deepEqual(result.contract.components.Slider.references.fillRectNodeId.fallbackNames, ['Fill'])
assert.deepEqual(result.contract.components.Slider.references.handleRectNodeId.fallbackNames, ['Handle'])
assert.deepEqual(result.contract.components.Scrollbar.references.handleRectNodeId.fallbackNames, ['Handle'])
assert.deepEqual(result.contract.components.ScrollRect.references.contentNodeId.fallbackNames, ['Content'])
assert.deepEqual(result.contract.components.ScrollRect.references.viewportNodeId.fallbackNames, ['Viewport'])
assert.deepEqual(result.contract.components.ScrollRect.references.horizontalScrollbarNodeId.fallbackNames, ['Scrollbar Horizontal', 'Horizontal Scrollbar'])
assert.deepEqual(result.contract.components.ScrollRect.references.verticalScrollbarNodeId.fallbackNames, ['Scrollbar Vertical', 'Vertical Scrollbar'])

for (const type of expected) {
  assert.equal(typeof result.contract.components[type].unityType, 'string', `${type} exposes a Unity type`)
  assert.equal(typeof result.contract.components[type].fields, 'object', `${type} exposes fields`)
}

console.log('uGUI component contract exposes all supported fields and reference fallbacks')
