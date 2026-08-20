# uGUI DSL 组件契约 v1

模型在首次新增或修改组件前必须调用 `ugui_component_contract`，以运行时返回值为准。本文件用于人类阅读。

## 引用规则

`Toggle`、`Slider`、`Scrollbar`、`ScrollRect` 的对象引用统一采用以下规则：

1. 引用字段存在时，严格按稳定 `nodeId` 解析；不存在或类型不匹配立即报错，不静默改绑。
2. 引用字段省略时，才在组件节点的后代中按 Unity 标准名称递归查找。
3. DSL 节点构建完成后统一执行第二阶段绑定，因此可以引用后创建的兄弟或后代节点。

标准名称回退：

- `Toggle.graphicNodeId` → `Checkmark`
- `Toggle.targetGraphicNodeId` → `Background`
- `Toggle.toggleGroupNodeId` 无名称回退，必须显式提供稳定 `nodeId`
- `Slider.fillRectNodeId` → `Fill`
- `Slider.handleRectNodeId` / `targetGraphicNodeId` → `Handle`
- `Scrollbar.handleRectNodeId` / `targetGraphicNodeId` → `Handle`
- `ScrollRect.contentNodeId` → `Content`（必需）
- `ScrollRect.viewportNodeId` → `Viewport`
- `ScrollRect.horizontalScrollbarNodeId` → `Scrollbar Horizontal`、`Horizontal Scrollbar`
- `ScrollRect.verticalScrollbarNodeId` → `Scrollbar Vertical`、`Vertical Scrollbar`

## 节点 rect

- `anchor`：`center`（默认）、`topLeft`、`topCenter`、`topRight`、`middleLeft`、`middleRight`、`bottomLeft`、`bottomCenter`、`bottomRight`、`topStretch`、`bottomStretch`、`leftStretch`、`rightStretch`、`stretch`、`custom`。必须使用这些完整名称；未识别的 anchor 会被 Unity 构建器静默按 `center` 处理，`ugui_apply_dsl` / `ugui_patch_node` 会在写入时直接拒绝。
- `offset`：`center`/四角/边中点/`custom` 为 `[x,y]`；`topCenter` 的 +y 表示从顶部向下，`bottomCenter` 的 +y 表示从底部向上。`stretch` 必须为四值 `[left,top,right,bottom]`，表示四条边的内缩距离。
- `size`：`[width,height]`；`stretch` 时由 offset 四值推导，`topStretch`/`bottomStretch` 只取 height，`leftStretch`/`rightStretch` 只取 width。
- `custom`：必须同时提供 `anchorMin`/`anchorMax`/`pivot`/`position`/`size`。

## 支持组件

### Toggle

- 字段：`isOn=false`、`interactable=true`
- 引用：`graphicNodeId`、`targetGraphicNodeId`、`toggleGroupNodeId`
- `graphic`（Checkmark）的 Image 颜色必须保持不透明：选中/未选中显隐由 Toggle 的 Fade transition 通过 `CrossFadeAlpha` 控制，构建器也会按 `isOn` 初始化透明度。`CrossFadeAlpha` 是乘在颜色 alpha 上的系数，用颜色 alpha=0 表示未选中会导致切换选中后永远不可见。

### ToggleGroup

- 字段：`allowSwitchOff=false`
- 通常与若干 Toggle 子节点放在同一组；Toggle 通过 `toggleGroupNodeId` 绑定该组。
- `allowSwitchOff=false` 保持组内单选，`true` 允许取消当前选中项。

### Slider

- 字段：`minValue=0`、`maxValue=1`、`wholeNumbers=false`、`value=0`、`interactable=true`
- `direction`：`leftToRight`（默认）、`rightToLeft`、`bottomToTop`、`topToBottom`
- 引用：`fillRectNodeId`、`handleRectNodeId`、`targetGraphicNodeId`

### Scrollbar

- 字段：`value=0`、`size=0.2`、`numberOfSteps=0`、`interactable=true`
- `direction` 与 Slider 相同
- 引用：`handleRectNodeId`、`targetGraphicNodeId`

### ScrollRect

- 字段：`horizontal=true`、`vertical=true`、`elasticity=0.1`、`inertia=true`、`decelerationRate=0.135`、`scrollSensitivity=1`
- `movementType`：`unrestricted`、`elastic`（默认）、`clamped`
- 滚动条可见性：`permanent`（默认）、`autoHide`、`autoHideAndExpandViewport`
- 间距：`horizontalScrollbarSpacing=0`、`verticalScrollbarSpacing=0`
- 引用：`contentNodeId`（必需）、`viewportNodeId`、`horizontalScrollbarNodeId`、`verticalScrollbarNodeId`
- 使用 `autoHideAndExpandViewport` 时必须能解析 `Viewport`。

### Mask / RectMask2D

- `Mask.showMaskGraphic=true`；同一节点必须同时配置 `Image`。
- `RectMask2D.softness=[0,0]`，负数会归零。

### HorizontalLayoutGroup / VerticalLayoutGroup

- `padding=[left,right,top,bottom]`
- `childAlignment`：`upperLeft`、`upperCenter`、`upperRight`、`middleLeft`、`middleCenter`、`middleRight`、`lowerLeft`、`lowerCenter`、`lowerRight`
- `spacing`
- `childControlWidth`、`childControlHeight`
- `childForceExpandWidth`、`childForceExpandHeight`
- `childScaleWidth`、`childScaleHeight`
- `reverseArrangement`

默认值：`padding=[0,0,0,0]`、`childAlignment=upperLeft`、`spacing=0`、两个 `childControl*=true`、两个 `childForceExpand*=true`、两个 `childScale*=false`、`reverseArrangement=false`。

### GridLayoutGroup

- `padding`、`childAlignment`
- `startCorner`：`upperLeft`（默认）、`upperRight`、`lowerLeft`、`lowerRight`
- `startAxis`：`horizontal`（默认）、`vertical`
- `cellSize=[100,100]`、`spacing=[0,0]`
- `constraint`：`flexible`（默认）、`fixedColumnCount`、`fixedRowCount`
- `constraintCount=2`，最小为 1

### ContentSizeFitter

`horizontalFit`、`verticalFit` 可取：`unconstrained`（默认）、`minSize`、`preferredSize`。

### LayoutElement

- 字段：`ignoreLayout=false`
- 尺寸字段：`minWidth`、`minHeight`、`preferredWidth`、`preferredHeight`、`flexibleWidth`、`flexibleHeight`，默认 `-1`
- `layoutPriority=1`，最小为 1
- 在 LayoutGroup 控制尺寸时，普通节点需要 `LayoutElement` 提供 min/preferred/flexible 尺寸；ScrollRect Content 的子项通常应显式设置 `preferredHeight` 或 `preferredWidth`。

## 既有组件

仍支持 `Image`、`TMP_Text`、`Button`。未知组件类型在构建阶段会明确报错，不再静默忽略。

## 视觉验收门槛

- 新建画布前先声明简明视觉规格：方向、主要区域尺寸、页签/ToggleGroup、ScrollRect Viewport/Content、cell 尺寸、互不重叠和真实换行规则。
- 交付前必须调用 `ugui_visual_acceptance_check`；它检查字面 `\\n`、兄弟图形的部分交叠（完全包含的层叠——如 Toggle 的 Background/Checkmark/Label、光效垫底、底图+文字——以及被 Mask/RectMask2D/ScrollRect 裁掉的区域都视为正常结构）、ScrollRect 引用与层级、ToggleGroup 绑定，以及 LayoutGroup 子节点尺寸来源。
- `ok=false` 时必须修复后重新验收，不能交付；结构化检查通过后仍需人工确认视觉效果。

## 浏览器预览边界

设计器会近似预览 LayoutGroup 排列、Mask/RectMask2D/ScrollRect 矩形裁剪与 Toggle 勾选图形显隐。位于 LayoutGroup 子树中的节点不能在画布中拖动或缩放，应修改布局组件或节点尺寸字段。Slider、Scrollbar 和 ScrollRect 的真实交互、惯性、弹性及运行时布局以 Unity Prefab 为准。
