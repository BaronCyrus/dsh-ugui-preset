const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

let definition
global.document = { querySelector() { return {} } }
global.window = {
  __ModuleLoader__: { load(value) { definition = value } },
  crypto: { randomUUID() { return 'popout-test' } },
}

const sourcePath = path.join(__dirname, '..', 'lib', 'client.js')
const originalSource = fs.readFileSync(sourcePath, 'utf8')
const source = originalSource.replace(
  'exports.apply = apply;',
  'exports.__test = { pointerOwnerWindow, popoutPanelStyle, preparePopoutDocument, synchronizePopoutTheme };\n\t\texports.apply = apply;',
)
vm.runInThisContext(source, { filename: sourcePath })
const plugin = definition.factory((name) => name === 'react' ? { createElement() {} } : {})

const childWindow = { marker: 'child' }
assert.equal(plugin.__test.pointerOwnerWindow({ currentTarget: { ownerDocument: { defaultView: childWindow } } }), childWindow)
assert.deepEqual(plugin.__test.popoutPanelStyle(), {
  inset: 0,
  width: '100vw',
  height: '100vh',
  minWidth: 0,
  minHeight: 0,
  maxWidth: 'none',
  maxHeight: 'none',
  borderRadius: 0,
  resize: 'none',
})

function styleObject() {
  return { values: {}, setProperty(name, value) { this.values[name] = value } }
}
function element(tagName) {
  return { tagName, dataset: {}, style: styleObject(), children: [], appendChild(child) { this.children.push(child); return child } }
}
const popupDocument = {
  title: '',
  documentElement: element('html'),
  head: element('head'),
  body: element('body'),
  createElement: element,
}
const sourceThemeElement = {}
const computedRoot = { 0: '--dsw-test-color', length: 1, getPropertyValue() { return '#123456' } }
const computedPanel = { 0: '--dsw-test-color', length: 1, getPropertyValue() { return '#abcdef' }, fontFamily: 'Inter', color: 'rgb(230,231,232)', backgroundColor: 'rgb(32,33,36)' }
const computedBody = { fontFamily: 'System', color: 'rgb(1,2,3)', backgroundColor: 'rgb(4,5,6)' }
const sourceDocument = {
  documentElement: {},
  body: {},
  defaultView: { getComputedStyle(target) { return target === sourceThemeElement ? computedPanel : target === sourceDocument.documentElement ? computedRoot : computedBody } },
}
const mount = plugin.__test.preparePopoutDocument({ document: popupDocument }, 'uGUI 独立设计器', sourceDocument, sourceThemeElement)
assert.equal(popupDocument.title, 'uGUI 独立设计器')
assert.equal(mount.id, 'ugui-popout-root')
assert.equal(popupDocument.body.children.includes(mount), true)
assert.equal(popupDocument.head.children.some((node) => String(node.textContent).includes('.uguiSide_panel')), true)
assert.equal(popupDocument.documentElement.style.values['--dsw-test-color'], '#abcdef')
assert.equal(popupDocument.body.style.fontFamily, 'Inter')
assert.equal(popupDocument.body.style.backgroundColor, 'rgb(32,33,36)')
const popupStyle = popupDocument.head.children.find((node) => node.dataset.plugin === 'dsh-local-ugui-tools')
popupDocument.querySelector = () => popupStyle
sourceDocument.querySelector = () => ({ textContent: '.uguiSide_panel{outline:0}' })
plugin.__test.synchronizePopoutTheme(popupDocument, sourceDocument)
assert.equal(popupStyle.textContent, '.uguiSide_panel{outline:0}')

assert.equal(originalSource.includes('document.addEventListener("pointerdown", outside)'), false, 'outside clicks must not close the designer')
assert.equal(originalSource.includes('dockPopout'), false, 'standalone-only mode has no return-to-DSH action')
assert.equal(originalSource.includes('返回 DSH'), false, 'standalone-only mode has no embedded-window copy')
assert.equal(originalSource.includes('beginPanelDrag'), false, 'standalone-only mode removes embedded panel dragging')
assert.equal(originalSource.includes('const renderedPanel = panel && popoutActive ? reactDom.createPortal(panel, popout.mount) : null;'), true, 'panel only renders through the standalone portal')
assert.equal(originalSource.includes('const resolution = meta.root ? canvasSize(dsl) : null;'), true, 'canvas size fields only render for the root node')
assert.equal(originalSource.includes('meta.root ? h("section", { className: "uguiSide_section" },\n\t\t\t\t\th("h4", { className: "uguiSide_sectionTitle" }, "画布尺寸")'), true, 'non-root nodes omit the redundant canvas-size section')

console.log('standalone-only popout document, lifecycle, and trigger behavior passed')
