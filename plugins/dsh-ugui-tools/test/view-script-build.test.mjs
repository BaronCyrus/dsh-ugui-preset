import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const packageRoot = new URL('..', import.meta.url)
const hostSource = await readFile(new URL('lib/host.js', packageRoot), 'utf8')
const host = await import(`data:text/javascript;base64,${Buffer.from(hostSource).toString('base64')}`)

// viewScriptClassError：脚本必须声明与 dsl.name 同名的类
assert.equal(host.viewScriptClassError('public partial class TestInventoryUI : MonoBehaviour {}', 'TestInventoryUI'), null)
assert.equal(host.viewScriptClassError('public partial class TestInventoryUI\n{}\n', 'TestInventoryUI'), null)
assert.match(host.viewScriptClassError('class Foo {}', 'TestInventoryUI'), /class TestInventoryUI/)
assert.match(host.viewScriptClassError('', 'TestInventoryUI'), /为空/)
assert.match(host.viewScriptClassError('  \n', 'TestInventoryUI'), /为空/)
// 类名中的正则元字符不得误匹配（防御性）
assert.match(host.viewScriptClassError('class TestInventoryUIX {}', 'TestInventoryUI'), /class TestInventoryUI/)

// validateViewBindings：{ 字段名: nodeId | [nodeId...] }
assert.equal(host.validateViewBindings({}), null)
assert.equal(host.validateViewBindings({ detailNameText: 'node-0123456789abcdef' }), null)
assert.equal(host.validateViewBindings({ tabToggles: ['node-0123456789abcdef', 'node-abcdef0123456789'] }), null)
assert.match(host.validateViewBindings([]), /对象/)
assert.match(host.validateViewBindings(null), /对象/)
assert.match(host.validateViewBindings('x'), /对象/)
assert.match(host.validateViewBindings({ 'bad-name': 'node-0123456789abcdef' }), /标识符/)
assert.match(host.validateViewBindings({ cells: [] }), /不能为空/)
assert.match(host.validateViewBindings({ cells: ['nope'] }), /nodeId/)
assert.match(host.validateViewBindings({ cells: 'node-UPPERCASE00abcde' }), /nodeId/)

// needsLogicSyncReview：logic.js 是行为基准，比 view.cs 新或缺失 view.cs 时必须拦截
assert.equal(host.needsLogicSyncReview({ logicMtimeMs: null, viewMtimeMs: null }), false)
assert.equal(host.needsLogicSyncReview({ logicMtimeMs: null, viewMtimeMs: 100 }), false)
assert.equal(host.needsLogicSyncReview({ logicMtimeMs: 100, viewMtimeMs: null }), true)
assert.equal(host.needsLogicSyncReview({ logicMtimeMs: 200, viewMtimeMs: 100 }), true)
assert.equal(host.needsLogicSyncReview({ logicMtimeMs: 100, viewMtimeMs: 200 }), false)
assert.equal(host.needsLogicSyncReview({ logicMtimeMs: 100, viewMtimeMs: 100 }), false)

// host 构建管线片段：配置化（ugui.config.json）→ 暂存 → 编译等待 → worker 入参（jobcfg 落盘传入）
for (const snippet of [
  'stageLogicScriptsForBuild',
  'awaitEditorScriptCompile',
  'runUnityJob',
  "runUnityJob('refresh_scripts', [])",
  'GENERATED_SCRIPT_DIR',
  'ugui.config.json',
  'loadPresetConfig',
  'configUnavailable',
  'ugui_setup',
  'ugui_interaction_semantics',
  'unityCliArgv',
  'unity-cli.py',
  'IS_WINDOWS',
  'vendor',
  '.view.cs',
  '.testdata.cs',
  '.bindings.json',
  'jobcfg=${jobConfigPath}',
  'jobConfig.view = { type: uiName, bindings: logic.bindings }',
  "errors', '--diff",
  'active:false 子树初始不可见',
  "stage: 'logic-sync'",
  'logicReviewed',
  '/local/ugui-sync',
  'handleSync',
  'needsLogicSyncReview',
  'sync.json 写为',
])
  assert.ok(hostSource.includes(snippet), `host.js 缺少片段: ${snippet}`)

// client 预览器片段：DSL active:false 并入初始隐藏集合；构建按钮旁的逻辑同步徽章（1.5s 纯显示轮询 + 点击生成后立即刷新）
const clientSource = await readFile(new URL('lib/client.js', packageRoot), 'utf8')
for (const snippet of ['collectInactive', 'node.active === false', 'LogicSyncBadge', '/local/ugui-sync?canvasId=', 'uguiSide_syncBadge', '子代理核对中', 'refreshToken', 'syncRefreshToken'])
  assert.ok(clientSource.includes(snippet), `client.js 缺少片段: ${snippet}`)

// worker 源码片段：挂载与绑定
const workerPath = new URL('../unity/BuildUiWorker.cs', import.meta.url)
const worker = await readFile(workerPath, 'utf8')
for (const snippet of [
  'AttachViewComponent',
  'FindTypeByName',
  'BindSerializedField',
  'ResolveBindingTarget',
  'Get(jobcfg, "view")',
  'Get(view, "bindings")',
  'refresh_scripts',
  'setup_workbench',
  'SetupWorkbench',
  'prefabDir',
  'Bool(Get(node, "active"), true)',
  'go.SetActive(false)',
  'SerializedObject',
  'ApplyModifiedPropertiesWithoutUndo',
  'boundFields',
  'typeof(MonoBehaviour).IsAssignableFrom',
])
  assert.ok(worker.includes(snippet), `BuildUiWorker.cs 缺少片段: ${snippet}`)

// 试点三件套与 DSL 的一致性
const canvases = new URL('../../../fixtures/canvases/', import.meta.url)
const dsl = JSON.parse(await readFile(new URL('test-inventory-ui.dsl.json', canvases), 'utf8'))
const bindings = JSON.parse(await readFile(new URL('test-inventory-ui.bindings.json', canvases), 'utf8'))
assert.equal(host.validateViewBindings(bindings), null)

const nodeIds = new Set()
;(function walk(node) {
  if (node.nodeId) nodeIds.add(node.nodeId)
  for (const child of node.children ?? []) walk(child)
})(dsl.root)
for (const [field, target] of Object.entries(bindings)) {
  for (const id of Array.isArray(target) ? target : [target])
    assert.ok(nodeIds.has(id), `bindings.${field} 引用了 DSL 中不存在的 nodeId: ${id}`)
}

const viewSource = await readFile(new URL('test-inventory-ui.view.cs', canvases), 'utf8')
const testDataSource = await readFile(new URL('test-inventory-ui.testdata.cs', canvases), 'utf8')
assert.equal(host.viewScriptClassError(viewSource, dsl.name), null)
assert.equal(host.viewScriptClassError(testDataSource, dsl.name), null)
for (const field of Object.keys(bindings))
  assert.ok(viewSource.includes(field), `view.cs 缺少 bindings 引用的字段 ${field}`)

// 测试数据条目数必须与格子数一致（顺序即映射）
const cellCount = bindings.itemCellButtons.length
const entryCount = (testDataSource.match(/new ItemEntry/g) || []).length
assert.equal(entryCount, cellCount, 'TestData 条目数必须与 itemCellButtons 数量一致')

console.log('view-script-build.test.mjs: ok')
