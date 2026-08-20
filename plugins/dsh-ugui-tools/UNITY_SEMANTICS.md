# Unity uGUI 交互语义（本地缓存）

预览器（`lib/client.js`）按 Unity 运行时语义模拟交互。本文档是与官方实现核对过的**规范化语义缓存**，是修改预览器交互行为时的第一事实来源，避免每次重新研读官方源码。

## 版本钉（新鲜度判定）

- **uGUI pin**: `com.unity.ugui@23e8d17bfaf9`（`Packages/manifest.json` 声明 2.0.0，Unity 6000.3.15f1）
- **判定方法**：`ls -d Library/PackageCache/com.unity.ugui@*` 的输出与本 pin 一致 → 文档新鲜，可直接依据；不一致（Unity 升级）→ 相关小节视为过期，须按下一节流程重核。
- **过期重核流程**：官方源就在本地 `Library/PackageCache/com.unity.ugui@<新hash>/Runtime/UGUI/UI/Core/<组件>.cs`，只读目标组件文件与目标函数，修正本小节并更新 pin。无需访问网络。
- `npm test` 中的 `unity-semantics.test.mjs` 会自动比对 pin 与 PackageCache，漂移即测试失败。

## 渐进披露用法

只读需要的小节：`grep -n '^## ' UNITY_SEMANTICS.md` 列出目录，跳到目标组件小节。禁止全文通读。每节含：源文件、规范化行为（公式级）、预览器落点、已知简化。

## Selectable（基类）

源：`Runtime/UGUI/UI/Core/Selectable.cs`

- 状态机：Normal / Highlighted / Pressed / Selected / Disabled；`interactable=false` → Disabled 且不再产生指针事件与 OnMove。
- transition：None / ColorTint / SpriteSwap / Animation；ColorTint 的 `fadeDuration` 被钳制 ≥ 0，过渡由 `DoStateTransition` 驱动。
- 预览器落点：按压/悬停近似（DSL 不建模 transition 字段，属契约性简化）。
- 已知简化：预览器只做亮度/透明度近似反馈，不实现 ColorTint 参数与 Animation。

## Toggle / ToggleGroup

源：`Runtime/UGUI/UI/Core/Toggle.cs`、`ToggleGroup.cs`

- `isOn` setter → `Set(value, sendCallback)`：值变化时勾选 graphic `CrossFadeAlpha` 渐显/隐并派 `onValueChanged(bool)`；`SetIsOnWithoutNotify` 只改值不发事件。
- 组内互斥：某 Toggle `Set(true)` → `group.NotifyToggleOn(this)` → 其余成员 `SetIsOnWithoutNotify(false)`（**不发事件**）。
- `allowSwitchOff=false`：仅当自己是组内唯一选中时禁止点灭（`Set(false)` 被 `!AnyTogglesOn() && !allowSwitchOff` 拦截）；**组启动时不强制补选**——若初始全不选，约束只在用户操作时生效。
- 预览器落点：`handleToggleClick`、`collectToggleGroups`、`toggleGraphics` 透明度。

## Button

源：`Runtime/UGUI/UI/Core/Button.cs`

- `OnPointerClick`（同一目标上按下并抬起）→ `onClick.Invoke()`；视觉态完全继承 Selectable。
- 预览器落点：Button 按压/点击事件与事件日志。

## Slider

源：`Runtime/UGUI/UI/Core/Slider.cs`

- `normalizedValue = clamp01((value−min)/(max−min))`；`wholeNumbers=true` 时 `Set` 对值取整；方向由 `direction` + `reverseValue` 决定。
- 指针定位（点击轨道=直接跳值，与拖动共用）：`normalizedValue = clamp01((localCursor − m_Offset)[axis] / clickRect.rect.size[axis])`，`clickRect = HandleContainer ?? FillContainer`，`reverseValue` 取反。`m_Offset` 仅按 Handle 时产生（保持抓取点）。
- 键盘步进 `stepSize = wholeNumbers ? 1 : (max−min)×0.1`。
- UpdateVisuals 只改锚点（fill 的 anchorMax=norm，handle 双锚=norm），保留子节点 RectTransform 偏移。
- 预览器落点：`sliderChildFrames`、Slider 指针处理。

## Scrollbar

源：`Runtime/UGUI/UI/Core/Scrollbar.cs`（2026-08 核对）

- **UpdateVisuals**：只写 Handle 锚点 `movement×(1−size) … movement×(1−size)+size`（沿轴），**保留 Handle 自身 RectTransform 偏移**——设计态 Handle 相对 Sliding Area 的内缩在运行时保留（标准 Scrollbar 的「空隙」来源）。**无最小像素尺寸**。
- **拖动 Handle**：`OnBeginDrag` 记录 `m_Offset`（指针−Handle 中心）；`UpdateDrag` 使指针在 Handle 内保持同一偏移，`value = clamp01(handleCorner / (track×(1−size)))`；`size≥1`（remainingSize≤0）不移动。
- **轨道按压（ClickRepeat）**：`OnPointerDown` 启动协程，按住期间**每帧** `UpdateDrag(pointer)`（`m_Offset=0`，即 Handle **中心**移到指针处），指针进入 Handle 后不再移动。等效单次计算：`value = clamp01((正向指针位置 − size/2) / (1−size))`。
- **取值**：`Set` 先 clamp01；`numberOfSteps>1` 时按 `1/(n−1)` 取整；键盘步进 `stepSize = numberOfSteps>1 ? 1/(n−1) : 0.1`。
- 预览器落点：`scrollbarChildFrames`、`scrollbarTrackPressValue`、`scrollbarValueFromNorm`、Handle 拖动处理。

## ScrollRect

源：`Runtime/UGUI/UI/Core/ScrollRect.cs`（2026-08 核对）

- **normalizedPosition**：`(0,0)` 为内容左下角；`verticalNormalizedPosition = 1` 表示滚动到顶、`=0` 到底（公式 `(view.min − content.min) / (content.size − view.size)`）。`SetNormalizedPosition` 按隐藏长度换算 anchoredPosition。
- **拖拽**：content 跟随指针；`elastic` 越界部分按 `RubberDelta(x, view) = (1 − 1/(|x|×0.55/view + 1)) × view × sign(x)` 衰减。
- **LateUpdate（松手后）**：elastic 回弹用 `SmoothDamp(pos, pos+offset, smoothTime=elasticity)`，正在滚轮滚动时 `smoothTime×3`；惯性 `velocity ×= Pow(decelerationRate, dt)`，`|v|<1` 归零；拖拽中 `velocity = Lerp(velocity, 瞬时速度, dt×10)`；`clamped` 每帧 `CalculateOffset` 立即收回；`unrestricted` 不收回。
- **滚轮 OnScroll**：`delta.y ×= −1`；**单轴启用时另一轴输入按绝对值较大者并入主轴**；`position += delta × scrollSensitivity`；`clamped` 立即收回。
- **联动 Scrollbar（UpdateScrollbars）**：`size = clamp01((view − |offset|) / content)`（**回弹越界时 Handle 同步变短**），`value = normalizedPosition`；`AutoHide` 淡出隐藏；`AutoHideAndExpandViewport` 额外改写 viewport 的 sizeDelta 扩张视口。
- 预览器落点：`computeScrollData`、拖拽/惯性/回弹动画、`applyWheel`、`scrollWheelDeltas`、`scrollbarLinkedSize`、联动显隐。
- 已知简化：`AutoHideAndExpandViewport` 只做淡出不扩展 Viewport（当前无画布使用）。

## 修改规程

1. 改预览器交互语义前，按「渐进披露用法」只读本档对应小节并校验 pin 新鲜度；新鲜则直接依据。
2. pin 过期或小节缺失 → 读本地 PackageCache 对应 `.cs` 重核，更新小节与 pin。
3. 实现必须落成纯函数，并在 `test/preview-interaction.test.cjs` 配行为测试（注释注明所编码的 Unity 公式）。
