# 开发约定（DEVELOPMENT）

本文档收录 UGUI制作模式 preset 的架构与生命周期约定，供迭代开发时遵守。用户向安装/使用说明见根目录 [README.md](../README.md)。

## 目录约定

- `agent.cordis.yml`：Agent 工具、提示词与 UI 插件挂载入口。
- `plugins/`：所有 UGUI 制作插件的源代码目录；后续插件放在这里，不再加入 Web Profile 的 `cordis.patch.yml`。
- `plugins/dsh-ugui-tools/`：当前 uGUI DSL、图片暂存、Prefab 构建与截图插件。
- Web Profile 的 `package.json` 仅保留一个指向上述目录的 plain link dependency（由 `setup/install.mjs` 写入），供 Cordis 解析包名和发现浏览器 Client bundle；Web Profile Composition 不挂载该插件。
- 项目耦合集中在 preset 根目录的 `ugui.config.json`（不入库）；`vendor/unity-cli` 与 `plugins/dsh-ugui-tools/unity/BuildUiWorker.cs` 随仓库分发，路径经 `import.meta.url` 解析。

## 生命周期约定

- uGUI 模型工具仅对选择 `ugui` Preset 的 Session 可见。
- 浏览器“UGUI制作模式”入口会读取当前 Session 的 `agentPreset`，仅在值为 `ugui` 时显示。Client 插件必须声明 `inject: ['slots']`（fiber 等待服务就绪），否则冷启动时入口按钮会因时序竞争静默缺失。
- 图片与 DSL 默认只暂存；只有用户明确生成 Prefab，或明确进行构建测试时，才调用 Unity CLI 并导入 `Assets/Sprites/<UIName>/`。

## 多 Canvas Workspace

- `<scratchDir>/workspace.json` 是 Canvas 索引（默认 `.scratch/ui-dsl`），记录 `defaultCanvasId`、稳定 `canvasId`、`uiName`、文档路径与各自版本号。
- 每个 Canvas 独立保存在 `canvases/<canvasId>.dsl.json`，并独立进行乐观版本检查。
- 首次读取 Workspace 时，现有 `current.dsl.json` 会自动迁移为一个 Canvas；之后它作为默认 Canvas 的兼容镜像继续维护。
- 模型修改前必须先调用 `ugui_list_canvases`，再用明确的 `canvasId` 调用读取、修改或构建工具。省略 `canvasId` 只保留给旧流程，目标为 `defaultCanvasId`。
- 浏览器设计器会显示 Workspace 中的全部 Canvas 标签页；当前标签按 DSH Session 保存在浏览器本地，切换后读取、保存、拖图和构建都显式携带该 `canvasId`。
- 轮询只刷新当前标签，同时从响应中的 Workspace 索引更新其他标签的版本号；外部新建的 Canvas 会自动出现在标签栏。
- 设计器在 Canvas 标签栏下方显示“当前目标”：明确列出当前 Canvas 与所选节点的完整层级，并可一键重置为整个 Canvas；切换 Canvas 时节点目标自动重置。
- 聊天输入框上方显示“下一条消息目标”及同步状态；绿色表示 Host 已收到当前 Canvas/节点目标，发送时会固定。
- 直接人类消息进入 inbox 时，Host 按消息 ID 复制当时的目标，并在 `agent/pre-step` 中附加模型可见的 `<ugui-edit-target-snapshot>`；发送后再切换 Canvas 或节点不会改变旧消息目标。
- Canvas 切换开始时会先清除 Host 旧目标，加载完成后再同步新目标，避免切换期间误附加上一个 Canvas。
- 每个 Canvas 根节点和子节点都持久化稳定 `nodeId`；旧 DSL 首次读取时自动补齐，重复或非法 ID 会被纠正，并独立递增该 Canvas 版本。模型工具传入的 DSL/patch 参数即使被冻结也不会被原地修改：Host 先深拷贝普通 JSON，再为真正的新节点分配 ID。
- 浏览器在 DSL 刷新或节点重排后用 `nodeId` 恢复当前选择；拖拽、尺寸修改和图片绑定都同时发送 `nodeId`，索引路径仅作兼容诊断。
- 预览拖动以当前显式选择为准：左侧组件树选中父节点后，即使鼠标落在其子节点区域，拖动仍移动父节点；仅点击而未移动时才下钻选择命中的子节点。
- 设计器打开时可用 `Ctrl+Z`（macOS 同时支持 `⌘Z`）逐步撤销当前 Canvas 最近的节点拖动或缩放；历史仅保存在当前浏览器会话，最多 50 步，其他修改导致版本变化时会拒绝误撤销并清空该 Canvas 历史。
- 组件树中有子节点的行提供展开/折叠按钮；状态按 Canvas 和稳定 `nodeId` 持久保存在浏览器本地，刷新或切换 Canvas 后保留，外部定位到子节点时会自动展开其全部祖先。
- 点击“UGUI制作模式”直接打开同源独立浏览器窗口；设计器不再提供 DSH 内嵌模式。再次点击按钮会聚焦已有窗口。关闭按钮、`Escape` 或系统原生关闭都会直接结束独立窗口，不会返回内嵌面板；重新点击按钮可再次打开。独立窗口保留当前 Canvas、选择、保存、撤销与折叠状态，并按设计器实际作用域同步主题变量。
- 消息目标快照同时固定 `nodeId`、当时路径与层级；Host 以 `nodeId` 重新解析当前位置，因此发送后改名或重排仍指向原节点。
- `ugui_patch_node` 优先按 `nodeId` 修改，名称路径仅兼容旧调用；整体替换与 children 替换只按显式 ID 或唯一名称继承，避免新节点复用已删除节点的身份。
- “总览”页集中展示全部 Canvas 的名称、`canvasId`、版本、节点数量、默认/当前状态与当前编辑目标，并支持一键切换后打开设计器。
- 总览数据由 Host 实时遍历 Workspace 文档生成，不把派生节点数量写回索引；总览打开时每两秒刷新，当前 DSL 的普通轮询仍保持原行为。

## Unity 组件支持

- 完整字段、枚举、默认值和引用规则见 [`plugins/dsh-ugui-tools/COMPONENTS.md`](../plugins/dsh-ugui-tools/COMPONENTS.md)；模型首次新增或修改组件前必须调用 `ugui_component_contract`。
- 除 `Image`、`TMP_Text`、`Button` 外，现支持 `Toggle`、`ToggleGroup`、`Slider`、`Scrollbar`、`ScrollRect`、`Mask`、`RectMask2D`、`HorizontalLayoutGroup`、`VerticalLayoutGroup`、`GridLayoutGroup`、`ContentSizeFitter`、`LayoutElement`。
- 引用型组件优先使用稳定 `nodeId`；只有省略引用字段时才按 Unity 标准子节点名称回退。显式引用无效时构建必须报错，不能静默改绑。
- 设计器会近似预览布局、矩形裁剪和 Toggle 显隐；Selectable 与 ScrollRect 的真实运行时行为以 Unity Prefab 为准。

## 预览器（交互模拟）

- 「预览器」标签位于「设计器」与「DSL」之间，拥有独立的渲染管线、交互状态 store 与事件总线，与设计器的编辑手势完全隔离。
- 预览器按 Unity 运行时语义模拟交互：Toggle 点击开关与 ToggleGroup 互斥（含 `allowSwitchOff`）、Button 按压/悬停/禁用态与 `onClick` 事件、Slider 拖动与轨道点击（含 `wholeNumbers`）、Scrollbar 手柄拖动与轨道按压（uGUI ClickRepeat 语义：Handle 中心直接移到指针处，非逐页步进；含 `numberOfSteps`）、ScrollRect 拖拽（含惯性、`decelerationRate`、`elastic`/`clamped`/`unrestricted` 回弹、`scrollSensitivity` 滚轮与单轴并入）并联动 Scrollbar 显隐与取值。联动时 Handle 尺寸遵循 `UpdateScrollbars` 公式 `(view − |越界回弹量|) / content`（回弹时同步变短），Handle 无最小像素尺寸，且保留设计态相对 Sliding Area 的内缩空隙。已知差距：`autoHideAndExpandViewport` 只做淡出不扩展 Viewport。
- 预览器布局独立计算 `HorizontalLayoutGroup`/`VerticalLayoutGroup`/`GridLayoutGroup`/`ContentSizeFitter`/`LayoutElement`，ScrollRect 内容尺寸以该布局结果为准。
- 交互状态（isOn、value、滚动偏移）只保存在浏览器内存并按 `nodeId` 键控，不写回 DSL、不参与版本与撤销；切换 Canvas 或点「重置状态」还原初始值。DSL 轮询不会覆盖交互状态。
- DSL 不建模 Selectable transition，悬停/按下反馈为内置近似（亮度/透明度变化）；Toggle 勾选图形按契约的 Fade 语义做透明度过渡。一切交互行为最终以 Unity 运行时为准。
- 底部事件日志面板显示模拟产生的事件流（`onValueChanged`、`onClick`、拖动开始/结束等），可折叠、可清空。
- 交互语义以 `plugins/dsh-ugui-tools/UNITY_SEMANTICS.md` 为本地缓存事实来源（按组件分节、渐进披露；模型经 `ugui_interaction_semantics` 工具只读目标小节并自动校验新鲜度）；文档钉住项目 PackageCache 的 uGUI 版本，`unity-semantics.test.mjs` 在 Unity 升级漂移时测试失败强制重核，重核只读本地 PackageCache 源码对应文件。

## 画布级逻辑模块

- 每个 Canvas 可有一个 sibling 逻辑文件 `canvases/<canvasId>.logic.js`，预览器激活时通过 `/local/ugui-logic` 拉取并在浏览器执行；1.5s 轮询发现内容变化自动重载，「重置状态」同时重置逻辑实例。
- 文件约定为 CommonJS：`module.exports = ({ events, api }) => { ... }`。事件：`toggle`/`button`/`slider`/`scrollbar`/`scroll`，负载含 `nodeId`、`nodeName` 与最新值（scroll 另含 `phase` 与归一化位置）。API：`setVisible(idOrName, visible)`（Unity `SetActive` 语义：隐藏节点从布局计算中剔除，LayoutGroup/ContentSizeFitter/滚动范围随之重排）、`setText(idOrName, text)`、`getToggle(nodeId)`、`getSliderValue(nodeId)`、`getScrollNorm(nodeId)`、`log(text)`（输出到事件日志）；`idOrName` 先按 nodeId 解析，再按节点名递归查找。
- 逻辑模块由模型按用户需求编写和维护（用户只描述需求）；加载或处理错误会进入事件日志，不会打断预览。
- 逻辑只驱动预览器内存状态：不修改 DSL、不参与版本/撤销、绝不影响 Unity 构建链路。

## 视图脚本（prefab 内可交互 + 测试数据）

- 每个 Canvas 可选地带三个 sibling 文件，把预览器的交互逻辑搬进 Unity 交付物：
  - `<canvasId>.view.cs`：partial MonoBehaviour，类名必须等于 `dsl.name`；只声明 `[SerializeField]` 序列化引用（禁止 Find/层级名查找），事件在 `Awake` 接线；公开 `Bind…(IReadOnlyList<…>)` 方法作为正式数据层 seam；测试数据钩子用无参 void partial 方法声明。
  - `<canvasId>.testdata.cs`：partial class 实现测试数据钩子，硬编码测试数据；移交后团队**删除这一个文件**即移除全部测试数据，主文件照常编译。
  - `<canvasId>.bindings.json`：`{ 序列化字段名: nodeId 或 [nodeId…] }`，把脚本字段显式映射到 DSL 节点。
- `ugui_build` 检测到 view.cs 时：先把它和 testdata.cs **整体覆盖**导入 `<scriptDir>/<dsl.name>.cs` / `<dsl.name>.TestData.cs`（.scratch 副本是唯一事实源），等待 Unity 编译完成（新增 Console 错误会作为 `stage: 'compile'` 失败返回），然后 worker 把组件挂到 prefab 根节点，并按 bindings.json 用 SerializedObject 写入引用——缺字段、缺 nodeId、目标节点无对应组件都会让构建直接报错。
- 一致性约定：logic.js 是交互行为基准。`ugui_build` 有**逻辑同步闸门**：logic.js 比 view.cs 新（或有 logic.js 无 view.cs）时返回 `stage: 'logic-sync'` 拒绝构建；此时先在会话里把 `<canvasId>.sync.json` 写为 `{"state":"reviewing","startedAt":…}`，派发子代理以 logic.js 为基准核对/修正 C# 三件套，完成后写 `{"state":"synced","finishedAt":…,"summary":…}`，再以 `logicReviewed: true` 重新构建。
- 构建按钮旁有**逻辑同步徽章**（1.5s 纯显示轮询 + 点击生成后立即刷新，只读 `/local/ugui-sync`，不派子代理、不碰 Unity）：黄色「逻辑待同步」/ 蓝色脉冲「子代理核对中…」/ 绿色「逻辑已同步」（悬停显示最近同步摘要）。
- 示例见 `fixtures/canvases/test-inventory-ui.*`（页签筛选 + 物品详情联动）。

## 后续新增 UI 插件

1. 将插件放到本仓库的 `plugins/<plugin-id>/`。
2. 在 `agent.cordis.yml` 的 `uGUI production` 段增加对应行。
3. 若插件带浏览器 Client bundle，使用可解析的包名行，并在 Web Profile 的 `package.json` 增加指向 Preset `plugins/` 源码的 plain link dependency（`setup/install.mjs` 已处理本插件）；不要在 Web Profile Composition 增加插件行。
4. 修改 Host 文件后递增其 Composition 行中的 `?v=`。
5. 用 Agent Preset roster 的 `standingKeyFor('ugui')` 在新进程中挂载验证，并新建一个 `UGUI制作模式` Session 核对工具与页面入口。

## 日常迭代流程（使用环境即仓库 checkout）

1. 直接在 `~/.dsh/.agent-presets/ugui/`（即本仓库的 clone）里改代码。
2. `cd plugins/dsh-ugui-tools && npm test` 全绿。
3. host.js 变更递增 `?v=`；client.js 变更只需刷新页面。
4. `git commit && git push` 即完成与 GitHub 的同步；`ugui.config.json` 等本机配置已 gitignore，不会入库。
