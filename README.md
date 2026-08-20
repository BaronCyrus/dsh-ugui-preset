# UGUI制作模式（DSH Agent Preset）

让 AI agent 在浏览器里设计 uGUI 界面、实时预览真实 Unity 交互，并一键构建为**工程内可交互、自带测试数据**的 uGUI prefab 的 DSH agent preset。

## 功能

- **多画布设计器**：浏览器内可视化编辑 uGUI DSL（多 Canvas Workspace、稳定 nodeId、结构化验收）。
- **预览器（交互模拟）**：按 Unity 运行时语义模拟 Toggle/ToggleGroup 互斥、Slider、Scrollbar、ScrollRect 惯性/回弹/滚轮等；语义经本地缓存文档 `UNITY_SEMANTICS.md` 与 PackageCache 源码核对，版本漂移自动检测。
- **画布级逻辑**：预览器行为（`logic.js`）与 Unity 侧视图脚本（`view.cs`/`testdata.cs`/`bindings.json`）双端一致，由模型维护。
- **一键构建 prefab**：DSL → Unity prefab，自动暂存导入图片、编译并挂载 MonoBehaviour 到根节点、按 bindings 绑定序列化引用；交付物开箱可交互，接入正式数据层后删除 `*.TestData.cs` 一个文件即可移除全部测试数据。
- **逻辑同步闸门**：logic.js 领先 view.cs 时构建自动拦截并引导子代理同步，界面徽章可见进度。

## 环境要求

- DSH（DeepSeek Harness）Web 部署
- 一个运行中的 Unity 工程（已用 Unity Editor 打开；当前语义缓存钉住 uGUI 2.0.0 / Unity 6000.3，其他版本按文档过期流程重核即可）
- macOS/Linux（unity-cli 脚本为 bash + python3）

## 安装

```bash
# 1. 克隆到 DSH preset 目录（DSH 按目录发现 preset）
git clone <repo-url> ~/.dsh/.agent-presets/ugui

# 2. 注册浏览器端插件包（幂等）
bash ~/.dsh/.agent-presets/ugui/setup/install.sh

# 3. 配置目标 Unity 工程
cd ~/.dsh/.agent-presets/ugui
cp setup/ugui.config.example.json ugui.config.json
#    编辑 ugui.config.json：projectPath 必填；asmdef 工程需把 assemblyName 改成对应程序集名
```

重启 DSH（或等 Web Profile 重建）后，新建「UGUI制作模式」会话，先让 agent 执行一次 `ugui_setup` 创建工作台场景（UIDslWorkbench），即可开始使用。

## 使用

1. 会话中描述界面需求 → agent 产出 DSL 并在浏览器设计器/预览器中呈现。
2. 交互需求先说人话 → agent 写预览器逻辑并实时可玩。
3. 点击面板上的「生成 Prefab」（或让 agent 调用 `ugui_build`）→ Unity 工程内得到可交互 prefab + 测试数据脚本。
4. 移交项目：真实数据层调用视图脚本的 `Bind…(IReadOnlyList<…>)` 方法，删除 `*.TestData.cs`。

## 目录结构

```
├── preset.yml / agent.cordis.yml   # preset 元数据与组合（persona、工具行）
├── ugui.config.json                # 你的工程配置（不入库；参考 setup/ugui.config.example.json）
├── plugins/dsh-ugui-tools/         # 主插件：host 工具/路由 + 浏览器设计器/预览器
│   ├── lib/                        # host.js（工具与构建管线）/ client.js（设计器与预览器）
│   ├── unity/BuildUiWorker.cs      # Unity 侧构建 worker（经 unity-cli 任务在工程内执行）
│   ├── test/                       # 行为测试（npm test）
│   ├── COMPONENTS.md               # DSL 组件契约
│   └── UNITY_SEMANTICS.md          # uGUI 交互语义本地缓存（按组件分节，含版本钉）
├── vendor/unity-cli/               # 内嵌的 Unity Editor 控制通道（bash + python3）
├── setup/install.sh                # Web Profile link 依赖注册
├── setup/ugui.config.example.json  # 工程配置样例
└── fixtures/canvases/              # 示例画布（测试背包：DSL + 逻辑 + 视图脚本三件套）
```

## 开发

```bash
cd plugins/dsh-ugui-tools && npm test
```

注意：`ugui.config.json` 存在且指向真实工程时，语义缓存新鲜度测试会对该工程生效。修改 host.js 后需递增 `agent.cordis.yml` 中 host 行的 `?v=` 查询参数。

## 商业支持

本 preset 以 MIT 协议免费开放全部功能（含商用）。如果你的团队需要以下服务，欢迎联系洽谈：

- **接入支持**：在你的 DSH + Unity 工程里完成部署、调通首块画布
- **定制开发**：新 DSL 组件、私有交互语义、内部管线对接
- **培训咨询**：uGUI 生产流程与 agent 协作模式落地

联系方式：378905096@qq.com / 微信 codiee_zhang（或 GitHub [@BaronCyrus](https://github.com/BaronCyrus) 私信/Issue）。

社区支持通过 GitHub Issues 进行（尽力而为，不保证时效）。

## 许可

[MIT](LICENSE) © 2026 BaronCyrus。本仓库全部内容（含 `vendor/unity-cli`）均为原创并以同一协议发布。
