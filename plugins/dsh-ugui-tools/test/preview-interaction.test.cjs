const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

let definition
global.document = { querySelector() { return {} } }
global.window = {
  __ModuleLoader__: { load(value) { definition = value } },
  crypto: { randomUUID() { return 'preview-interaction-test' } },
}

const sourcePath = path.join(__dirname, '..', 'lib', 'client.js')
const source = fs.readFileSync(sourcePath, 'utf8').replace(
  'exports.apply = apply;',
  'exports.__test = { playLayoutFramesForChildren, buildPlayLayout, computeScrollData, sliderChildFrames, scrollbarChildFrames, collectToggleGroups, scrollbarValueFromNorm, scrollbarTrackPressValue, scrollbarLinkedSize, scrollWheelDeltas };\n\t\texports.apply = apply;',
)
vm.runInThisContext(source, { filename: sourcePath })
const plugin = definition.factory((name) => name === 'react' ? { createElement(...args) { return { args } } } : {})

function node(name, nodeId, rect, components, children = []) {
  return { name, nodeId, rect: rect || { anchor: 'topLeft', offset: [0, 0], size: [50, 20] }, components: components || [], children }
}

// LayoutElement preferred size drives H/V group child sizes; forceExpand splits the rest by flexible weight.
{
  const row = node('Row', 'n-row', null, [{
    type: 'HorizontalLayoutGroup', padding: [0, 0, 0, 0], spacing: 10,
    childControlWidth: true, childForceExpandWidth: true,
    childControlHeight: false, childForceExpandHeight: false,
  }], [
    node('A', 'n-a', { anchor: 'topLeft', offset: [0, 0], size: [50, 20] }, [{ type: 'LayoutElement', preferredWidth: 100 }]),
    node('B', 'n-b', { anchor: 'topLeft', offset: [0, 0], size: [50, 20] }, [{ type: 'LayoutElement', preferredWidth: 60, flexibleWidth: 1 }]),
    node('C', 'n-c', { anchor: 'topLeft', offset: [0, 0], size: [50, 20] }, [{ type: 'LayoutElement', preferredWidth: 40, flexibleWidth: 3 }]),
  ])
  const frames = plugin.__test.playLayoutFramesForChildren(row, 400, 100)
  // preferred total 200 + spacing 20 = 220; extra 180 split by flexible weights max(flexible,1) = 1:1:3
  assert.deepEqual(frames, [
    { x: 0, y: 0, width: 136, height: 20 },
    { x: 146, y: 0, width: 96, height: 20 },
    { x: 252, y: 0, width: 148, height: 20 },
  ])
}

// ignoreLayout children keep their rect frame and do not occupy layout space.
{
  const row = node('Row', 'n-row2', null, [{
    type: 'HorizontalLayoutGroup', padding: [0, 0, 0, 0], spacing: 10,
    childControlWidth: false, childForceExpandWidth: false,
    childControlHeight: false, childForceExpandHeight: false,
  }], [
    node('A', 'n-a2'),
    node('B', 'n-b2', { anchor: 'topLeft', offset: [300, 5], size: [50, 20] }, [{ type: 'LayoutElement', ignoreLayout: true }]),
    node('C', 'n-c2'),
  ])
  assert.deepEqual(plugin.__test.playLayoutFramesForChildren(row, 400, 100), [
    { x: 0, y: 0, width: 50, height: 20 },
    { x: 300, y: 5, width: 50, height: 20 },
    { x: 60, y: 0, width: 50, height: 20 },
  ])
}

// ContentSizeFitter on a VerticalLayoutGroup sizes the content node to its children.
{
  const content = node('Content', 'n-content', { anchor: 'topLeft', offset: [0, 0], size: [200, 100] }, [
    { type: 'VerticalLayoutGroup', padding: [0, 0, 10, 5], spacing: 5, childControlWidth: false, childForceExpandWidth: false, childControlHeight: true, childForceExpandHeight: false },
    { type: 'ContentSizeFitter', verticalFit: 'preferredSize' },
  ], [
    node('Item1', 'n-i1', { anchor: 'topLeft', offset: [0, 0], size: [200, 30] }, [{ type: 'LayoutElement', preferredHeight: 30 }]),
    node('Item2', 'n-i2', { anchor: 'topLeft', offset: [0, 0], size: [200, 40] }, [{ type: 'LayoutElement', preferredHeight: 40 }]),
  ])
  const layout = plugin.__test.buildPlayLayout(content, 200, 100, { x: 0, y: 0, width: 200, height: 100 }, 'root', null)
  assert.equal(layout.frame.height, 10 + 30 + 5 + 40 + 5, 'fitted height = padding + children + spacing')
}

// ScrollRect metrics: range and normalized position come from content vs viewport frames and overlay offset.
{
  const root = node('Scroll', 'n-scroll', null, [{ type: 'ScrollRect', contentNodeId: 'n-content2', viewportNodeId: 'n-viewport' }], [
    node('Viewport', 'n-viewport', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }, [], [
      node('Content', 'n-content2', { anchor: 'topLeft', offset: [0, 0], size: [200, 500] }),
    ]),
  ])
  const layout = plugin.__test.buildPlayLayout(root, 200, 200, { x: 0, y: 0, width: 200, height: 200 }, 'root', null)
  let data = plugin.__test.computeScrollData(layout, {}, root)
  let info = data.get('n-scroll')
  assert.equal(info.rangeY, 300)
  assert.equal(info.rangeX, 0)
  assert.equal(info.normY, 0)
  data = plugin.__test.computeScrollData(layout, { 'n-scroll': { offset: { x: 0, y: -150 } } }, root)
  info = data.get('n-scroll')
  assert.equal(info.normY, 0.5)
  data = plugin.__test.computeScrollData(layout, { 'n-scroll': { offset: { x: 0, y: -999 } } }, root)
  assert.equal(data.get('n-scroll').normY, 1, 'norm clamps at the bottom')
}

// Slider value 0.5 centers the handle and half-fills the fill area.
{
  const sliderNode = node('Slider', 'n-slider', { anchor: 'topLeft', offset: [0, 0], size: [200, 20] }, [{ type: 'Slider', value: 0.5 }], [
    node('Fill Area', 'n-fillarea', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }, [], [
      node('Fill', 'n-fill', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }),
    ]),
    node('Handle Slide Area', 'n-handlearea', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }, [], [
      node('Handle', 'n-handle', { anchor: 'center', offset: [0, 0], size: [20, 20] }),
    ]),
  ])
  const layout = plugin.__test.buildPlayLayout(sliderNode, 200, 20, { x: 0, y: 0, width: 200, height: 20 }, 'root', null)
  const frames = plugin.__test.sliderChildFrames(sliderNode, layout, sliderNode.components[0], 0.5)
  assert.deepEqual(frames.get('n-fill'), { x: 0, y: 0, width: 100, height: 20 })
  assert.deepEqual(frames.get('n-handle'), { x: 90, y: 0, width: 20, height: 20 })
}

// Scrollbar handle size follows size and its position follows value (bottomToTop: value 1 = top).
{
  const barNode = node('Bar', 'n-bar', { anchor: 'topLeft', offset: [0, 0], size: [20, 200] }, [{ type: 'Scrollbar', direction: 'bottomToTop', value: 0, size: 0.2 }], [
    node('Sliding Area', 'n-slide', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }, [], [
      node('Handle', 'n-h', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }),
    ]),
  ])
  const layout = plugin.__test.buildPlayLayout(barNode, 20, 200, { x: 0, y: 0, width: 20, height: 200 }, 'root', null)
  const bottom = plugin.__test.scrollbarChildFrames(barNode, layout, barNode.components[0], 0, 0.2).get('n-h')
  assert.deepEqual(bottom, { x: 0, y: 160, width: 20, height: 40 })
  const top = plugin.__test.scrollbarChildFrames(barNode, layout, barNode.components[0], 1, 0.2).get('n-h')
  assert.deepEqual(top, { x: 0, y: 0, width: 20, height: 40 })
  assert.equal(plugin.__test.scrollbarValueFromNorm('bottomToTop', false, 0), 1, 'scroll norm 0 (top) reads as value 1')
  assert.equal(plugin.__test.scrollbarValueFromNorm('leftToRight', true, 0.25), 0.25)
}

// Unity ClickRepeat：按轨道 = Handle 中心跳到指针处（绝对定位，非逐页步进）；size>=1 不移动
{
  const trackPress = plugin.__test.scrollbarTrackPressValue
  assert.equal(trackPress('bottomToTop', false, 0.5, 0.2), 0.5, '中点按下 → handle 中心到 0.5')
  assert.equal(trackPress('bottomToTop', false, 0.95, 0.2), 0, 'bottomToTop 近底部 → value 0')
  assert.equal(trackPress('leftToRight', true, 0.75, 0.5), 1, '越过可行程末端 → 钳到 1')
  assert.equal(trackPress('leftToRight', true, 0.1, 0.5), 0, '越过可行程起点 → 钳到 0')
  assert.equal(trackPress('rightToLeft', true, 0.25, 0.2), 0.8125, 'rightToLeft：视觉 0.25 → 正向 0.75 → value 0.8125')
  assert.equal(trackPress('leftToRight', true, 0.5, 1), null, 'size=1（内容不溢出）→ 不移动')
}

// Unity UpdateScrollbars：size = (view − |越界回弹量|) / content，回弹时 Handle 变短
{
  const linked = plugin.__test.scrollbarLinkedSize
  assert.equal(linked(1214, 1306, 0, 92), 1214 / 1306, '无回弹 = view/content')
  assert.equal(linked(1214, 1306, -138, 92), (1214 - 46) / 1306, '末端越界 46 → size 变小')
  assert.equal(linked(1214, 1306, 30, 92), (1214 - 30) / 1306, '起点越界 30 → size 变小')
  assert.equal(linked(1000, 800, 0, 0), 1, '内容不溢出 → clamp 到 1')
  assert.equal(linked(1000, 0, 0, 0), 1, '空内容 → 1')
}

// Unity OnScroll：单轴启用时另一轴滚轮输入按绝对值较大者并入主轴
{
  const wheel = plugin.__test.scrollWheelDeltas
  assert.deepEqual(wheel(true, true, 5, -30), { dx: 5, dy: -30 }, '双轴保持')
  assert.deepEqual(wheel(false, true, 40, 10), { dx: 0, dy: 40 }, '仅纵向：横向大滚轮并入纵向')
  assert.deepEqual(wheel(false, true, 10, 40), { dx: 0, dy: 40 }, '仅纵向：保持纵向')
  assert.deepEqual(wheel(true, false, 10, 40), { dx: 40, dy: 0 }, '仅横向：纵向大滚轮并入横向')
}

// Unity UpdateVisuals 保留 Handle 设计态内缩（标准 Scrollbar 的 Handle 空隙），且无最小像素尺寸
{
  const barNode = node('Bar', 'n-bar2', { anchor: 'topLeft', offset: [0, 0], size: [20, 200] }, [{ type: 'Scrollbar', direction: 'bottomToTop', value: 0, size: 0.02 }], [
    node('Sliding Area', 'n-slide2', { anchor: 'stretch', offset: [0, 0, 0, 0], size: [0, 0] }, [], [
      node('Handle', 'n-h2', { anchor: 'stretch', offset: [2, 4, 2, 4] }),
    ]),
  ])
  const layout = plugin.__test.buildPlayLayout(barNode, 20, 200, { x: 0, y: 0, width: 20, height: 200 }, 'root', null)
  const frame = plugin.__test.scrollbarChildFrames(barNode, layout, barNode.components[0], 0, 0.02).get('n-h2')
  // spanY=196（travel=196, fraction=1）+ insetT=4 → y=200；宽度=20-2-2=16；长度=4-4-4 钳到 0；无 12px 下限
  assert.deepEqual(frame, { x: 2, y: 200, width: 16, height: 0 })
}

// ToggleGroup collection groups toggles by their group nodeId.
{
  const root = node('Root', 'n-root', null, [], [
    node('Group', 'n-group', null, [{ type: 'ToggleGroup' }], [
      node('T1', 'n-t1', null, [{ type: 'Toggle', isOn: true, toggleGroupNodeId: 'n-group' }]),
      node('T2', 'n-t2', null, [{ type: 'Toggle', isOn: false, toggleGroupNodeId: 'n-group' }]),
    ]),
    node('Free', 'n-free', null, [{ type: 'Toggle', isOn: false }]),
  ])
  const groups = plugin.__test.collectToggleGroups(root)
  assert.equal(groups.size, 1)
  assert.deepEqual(groups.get('n-group').map((item) => item.nodeId), ['n-t1', 'n-t2'])
}

// Logic-driven visibility uses SetActive semantics: hidden children leave layout and shrink fitted content.
{
  const row = node('Row', 'n-row3', null, [{
    type: 'HorizontalLayoutGroup', padding: [0, 0, 0, 0], spacing: 10,
    childControlWidth: false, childForceExpandWidth: false,
    childControlHeight: false, childForceExpandHeight: false,
  }], [node('A', 'n-a3'), node('B', 'n-b3'), node('C', 'n-c3')])
  assert.deepEqual(plugin.__test.playLayoutFramesForChildren(row, 400, 100, new Set(['n-b3'])), [
    { x: 0, y: 0, width: 50, height: 20 },
    { x: 60, y: 0, width: 50, height: 20 },
  ], 'hidden child leaves no gap in the layout flow')

  const content = node('Content', 'n-content3', { anchor: 'topLeft', offset: [0, 0], size: [200, 100] }, [
    { type: 'VerticalLayoutGroup', padding: [0, 0, 0, 0], spacing: 5, childControlWidth: false, childForceExpandWidth: false, childControlHeight: true, childForceExpandHeight: false },
    { type: 'ContentSizeFitter', verticalFit: 'preferredSize' },
  ], [
    node('Item1', 'n-i31', { anchor: 'topLeft', offset: [0, 0], size: [200, 30] }, [{ type: 'LayoutElement', preferredHeight: 30 }]),
    node('Item2', 'n-i32', { anchor: 'topLeft', offset: [0, 0], size: [200, 40] }, [{ type: 'LayoutElement', preferredHeight: 40 }]),
  ])
  const layout = plugin.__test.buildPlayLayout(content, 200, 100, { x: 0, y: 0, width: 200, height: 100 }, 'root', null, new Set(['n-i31']))
  assert.equal(layout.children.length, 1, 'hidden child is absent from the layout tree')
  assert.equal(layout.children[0].node.nodeId, 'n-i32')
  assert.equal(layout.frame.height, 40, 'fitted height only counts visible children')
}

console.log('preview interaction layout, scrolling, slider, scrollbar, and toggle groups passed')
