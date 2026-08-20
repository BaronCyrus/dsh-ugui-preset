import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workerPath = new URL('../unity/BuildUiWorker.cs', import.meta.url)
const worker = await readFile(workerPath, 'utf8')

const requiredSnippets = [
  'go.AddComponent<Mask>()',
  'mask.showMaskGraphic',
  'go.AddComponent<RectMask2D>()',
  'rectMask.softness',
  'go.AddComponent<HorizontalLayoutGroup>()',
  'go.AddComponent<VerticalLayoutGroup>()',
  'go.AddComponent<GridLayoutGroup>()',
  'go.AddComponent<ContentSizeFitter>()',
  'go.AddComponent<LayoutElement>()',
  'layoutElement.ignoreLayout',
  'layoutElement.minWidth',
  'layoutElement.minHeight',
  'layoutElement.preferredWidth',
  'layoutElement.preferredHeight',
  'layoutElement.flexibleWidth',
  'layoutElement.flexibleHeight',
  'ApplyHorizontalOrVerticalLayout',
  'ApplyLayoutGroup',
  'MapTextAnchor',
  'MapGridCorner',
  'MapGridAxis',
  'MapGridConstraint',
  'MapFitMode',
  'PendingBinding',
  'NodeById',
  'ResolvePendingBindings',
  'ResolveNodeReference',
  'FindDescendantByNames',
  'go.AddComponent<Toggle>()',
  'toggle.SetIsOnWithoutNotify',
  'graphicNodeId',
  'targetGraphicNodeId',
  'toggleGroupNodeId',
  'go.AddComponent<ToggleGroup>()',
  'toggleGroup.allowSwitchOff',
  'toggle.group',
  'go.AddComponent<Slider>()',
  'slider.SetValueWithoutNotify',
  'fillRectNodeId',
  'handleRectNodeId',
  'go.AddComponent<Scrollbar>()',
  'scrollbar.SetValueWithoutNotify',
  'MapSliderDirection',
  'MapScrollbarDirection',
  'go.AddComponent<ScrollRect>()',
  'contentNodeId',
  'viewportNodeId',
  'horizontalScrollbarNodeId',
  'verticalScrollbarNodeId',
  'MapScrollRectMovementType',
  'MapScrollRectVisibility',
  'scrollRect.horizontalScrollbarSpacing',
  'scrollRect.verticalScrollbarSpacing',
  '不支持的组件类型',
]
for (const snippet of requiredSnippets) {
  assert.equal(worker.includes(snippet), true, `BuildUiWorker must contain ${snippet}`)
}
for (const anchor of ['topLeft', 'topRight', 'middleLeft', 'middleRight', 'bottomLeft', 'bottomRight']) {
  assert.equal(worker.includes(`case "${anchor}":`), true, `BuildUiWorker must map ${anchor}`)
}
assert.equal(worker.includes('引用字段必须是非空 nodeId'), true, 'present reference fields reject non-string and empty values instead of falling back')
assert.equal(worker.includes(': binding.Owner.GetComponent<Graphic>()'), false, 'targetGraphic does not invent a same-node fallback outside the contract')
assert.equal(worker.includes('go.GetComponent<Mask>() && !go.GetComponent<Image>()'), true, 'Mask requires an Image specifically, not any Graphic')
assert.equal(worker.includes('ValidateLayoutElements(rootGo)'), true, 'build validates LayoutElement requirements before saving a prefab')
assert.equal(worker.includes('LayoutGroup 控制的子节点需要 LayoutElement'), true, 'missing controlled-size LayoutElement data fails loudly')

console.log('BuildUiWorker supports all extended uGUI component types and reference bindings')
