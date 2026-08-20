/**
 * dsh-local-ugui-tools — uGUI Agent Preset host half (open-source edition).
 *
 * Provides a Workspace-indexed, multi-Canvas uGUI DSL toolset and snapshots the
 * browser's selected Canvas/node when each human message enters the inbox. The
 * build tool uses one durable unity-cli job whose C# worker builds one explicitly
 * selected Canvas atomically.
 *
 * 项目耦合全部集中在 ugui.config.json（preset 根目录，缺省见 DEFAULT_CONFIG）；
 * unity-cli 与本模块使用的 C# worker 随仓库分发（vendor/ 与 unity/），路径经
 * import.meta.url 解析，preset 可被克隆到任意位置。
 */
import { readFile, writeFile, mkdir, copyFile, rename, unlink, stat, readdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

// 测试会以 data: URL 导入本模块：fileURLToPath 抛错时路径族降级为 null，由配置守卫兜底
const MODULE_DIR = (() => {
	try { return dirname(fileURLToPath(import.meta.url)) } catch { return null }
})()
const PLUGIN_DIR = MODULE_DIR === null ? null : join(MODULE_DIR, '..')
const PRESET_ROOT = PLUGIN_DIR === null ? null : join(PLUGIN_DIR, '..', '..')
const CONFIG_PATH = PRESET_ROOT === null ? null : join(PRESET_ROOT, 'ugui.config.json')
const SEMANTICS_DOC_PATH = PLUGIN_DIR === null ? null : join(PLUGIN_DIR, 'UNITY_SEMANTICS.md')
const WORKER_PATH = PLUGIN_DIR === null ? null : join(PLUGIN_DIR, 'unity', 'BuildUiWorker.cs')
const UNITY_JOB = PRESET_ROOT === null ? null : join(PRESET_ROOT, 'vendor', 'unity-cli', 'scripts', 'unity-job')
const UNITY_CLI = PRESET_ROOT === null ? null : join(PRESET_ROOT, 'vendor', 'unity-cli', 'scripts', 'unity-cli')

const DEFAULT_CONFIG = {
	scratchDir: '.scratch/ui-dsl',
	prefabDir: 'Assets/AddressableResources/UIPrefab',
	scriptDir: 'Assets/Scripts/UserInterface/Generated',
	assemblyName: 'Assembly-CSharp'
}

function loadPresetConfig() {
	if (CONFIG_PATH === null) return { error: 'host 模块以非 file 方式加载（仅测试场景出现），preset 目录不可用' }
	let raw = null
	try {
		raw = JSON.parse(readFileSyncSafe(CONFIG_PATH))
	} catch (error) {
		return { error: `无法解析 ${CONFIG_PATH}: ${String(error?.message ?? error)}` }
	}
	if (raw === null) {
		return { error: `缺少 ugui.config.json：请复制 setup/ugui.config.example.json 为 ${CONFIG_PATH} 并填写 projectPath（目标 Unity 工程根目录）` }
	}
	if (typeof raw.projectPath !== 'string' || raw.projectPath === '') {
		return { error: 'ugui.config.json 缺少 projectPath（目标 Unity 工程根目录绝对路径）' }
	}
	const merged = { ...DEFAULT_CONFIG, ...raw }
	const projectPath = merged.projectPath
	return {
		config: {
			projectPath,
			dslDir: join(projectPath, merged.scratchDir),
			prefabDir: merged.prefabDir,
			generatedScriptDir: join(projectPath, merged.scriptDir),
			assemblyDll: join(projectPath, 'Library', 'ScriptAssemblies', `${merged.assemblyName}.dll`)
		}
	}
}

function readFileSyncSafe(path) {
	try {
		return readFileSync(path, 'utf8')
	} catch (error) {
		if (error?.code === 'ENOENT') return null
		throw error
	}
}

const PRESET_CONFIG = loadPresetConfig()
const CONFIG_ERROR = PRESET_CONFIG.error ?? null
const PROJECT = PRESET_CONFIG.config?.projectPath ?? ''
const DSL_DIR = PRESET_CONFIG.config?.dslDir ?? ''
const PREFAB_DIR = PRESET_CONFIG.config?.prefabDir ?? DEFAULT_CONFIG.prefabDir
const GENERATED_SCRIPT_DIR = PRESET_CONFIG.config?.generatedScriptDir ?? ''
const ASSEMBLY_DLL = PRESET_CONFIG.config?.assemblyDll ?? ''

function configUnavailable() {
	if (CONFIG_ERROR === null) return null
	return { ok: false, stage: 'config', error: CONFIG_ERROR, impl: IMPL }
}

const LEGACY_DSL_PATH = join(DSL_DIR, 'current.dsl.json')
const LEGACY_STATE_PATH = join(DSL_DIR, 'state.json')
const WORKSPACE_PATH = join(DSL_DIR, 'workspace.json')
const CANVASES_DIR = join(DSL_DIR, 'canvases')
const ASSET_STAGE_DIR = join(DSL_DIR, 'assets')
const IMPL = 'ugui-preset-oss-1.0.0'
const WORKSPACE_VERSION = 1
const TARGET_SNAPSHOT_TAG = 'ugui-edit-target-snapshot'
const BUILD_POLICY = '图片与 DSL 修改默认只暂存；仅当用户明确要求生成/更新 Prefab，或当前操作明确属于构建测试时，才允许调用 Unity CLI 导入 Assets 并生成 Prefab。'
const COMPONENT_CONTRACT = {
	version: 1,
	referenceStrategy: {
		explicit: 'nodeId',
		fallback: 'standard-child-name',
		onInvalidExplicitReference: 'error',
		description: '引用字段存在时严格按 nodeId 解析；省略时才按 Unity 标准子节点名称递归回退。'
	},
	rect: {
		anchor: 'center|topLeft|topCenter|topRight|middleLeft|middleRight|bottomLeft|bottomCenter|bottomRight|topStretch|bottomStretch|leftStretch|rightStretch|stretch|custom，默认 center。必须使用这些完整名称；未识别的 anchor 会被 Unity 构建器静默按 center 处理，属于布局事故高发点。',
		offset: 'center/四角/边中点/custom 为 [x,y]；topCenter 的 +y 表示从顶部向下，bottomCenter 的 +y 表示从底部向上。stretch 必须为四值 [left,top,right,bottom]，表示四条边的内缩距离。',
		size: '[width,height]；stretch 时由 offset 四值推导，topStretch/bottomStretch 只取 height，leftStretch/rightStretch 只取 width。',
		custom: 'anchor=custom 时必须同时提供 anchorMin/anchorMax/pivot/position/size。'
	},
	node: {
		active: '可选布尔，默认 true。active:false 表示节点初始隐藏（Unity 构建为 SetActive(false)，预览器初始不渲染）；运行时显隐由逻辑模块（预览器 api.setVisible）或视图脚本（SetActive）驱动。典型用途：选中态标记、初始折叠的面板。'
	},
	components: {
		Image: {
			unityType: 'UnityEngine.UI.Image',
			fields: { color: 'hex RGBA，默认 #FFFFFFFF', spritePath: 'Assets/Sprites/ 下的图片路径', preserveAspect: 'boolean，默认 false' },
			references: {}
		},
		TMP_Text: {
			unityType: 'TMPro.TextMeshProUGUI',
			fields: { text: 'string', fontSize: 'number，默认 24', align: 'left|center|right', vAlign: 'top|middle|bottom', color: 'hex RGBA，默认 #FFFFFFFF' },
			references: {}
		},
		Button: {
			unityType: 'UnityEngine.UI.Button',
			fields: {},
			references: {}
		},
		Toggle: {
			unityType: 'UnityEngine.UI.Toggle',
			notes: 'graphic(Checkmark)的 Image 颜色必须保持不透明；选中/未选中显隐由 Toggle 的 Fade transition 通过 CrossFadeAlpha 控制，构建器也会按 isOn 初始化透明度。禁止用颜色 alpha=0 表示未选中——CrossFadeAlpha 是乘在颜色 alpha 上的系数，alpha=0 会导致切换选中后永远不可见。',
			fields: { isOn: 'boolean，默认 false', interactable: 'boolean，默认 true' },
			references: {
				graphicNodeId: { unityProperty: 'graphic', required: false, fallbackNames: ['Checkmark'] },
				targetGraphicNodeId: { unityProperty: 'targetGraphic', required: false, fallbackNames: ['Background'] },
				toggleGroupNodeId: { unityProperty: 'group', required: false, fallbackNames: [] }
			}
		},
		ToggleGroup: {
			unityType: 'UnityEngine.UI.ToggleGroup',
			fields: { allowSwitchOff: 'boolean，默认 false' },
			references: {}
		},
		Slider: {
			unityType: 'UnityEngine.UI.Slider',
			fields: { minValue: 'number，默认 0', maxValue: 'number，默认 1', wholeNumbers: 'boolean，默认 false', value: 'number，默认 0', direction: 'leftToRight|rightToLeft|bottomToTop|topToBottom，默认 leftToRight', interactable: 'boolean，默认 true' },
			references: {
				fillRectNodeId: { unityProperty: 'fillRect', required: false, fallbackNames: ['Fill'] },
				handleRectNodeId: { unityProperty: 'handleRect', required: false, fallbackNames: ['Handle'] },
				targetGraphicNodeId: { unityProperty: 'targetGraphic', required: false, fallbackNames: ['Handle'] }
			}
		},
		Scrollbar: {
			unityType: 'UnityEngine.UI.Scrollbar',
			fields: { value: '0..1，默认 0', size: '0..1，默认 0.2', numberOfSteps: 'integer，默认 0', direction: 'leftToRight|rightToLeft|bottomToTop|topToBottom，默认 leftToRight', interactable: 'boolean，默认 true' },
			references: {
				handleRectNodeId: { unityProperty: 'handleRect', required: false, fallbackNames: ['Handle'] },
				targetGraphicNodeId: { unityProperty: 'targetGraphic', required: false, fallbackNames: ['Handle'] }
			}
		},
		ScrollRect: {
			unityType: 'UnityEngine.UI.ScrollRect',
			fields: { horizontal: 'boolean，默认 true', vertical: 'boolean，默认 true', movementType: 'unrestricted|elastic|clamped，默认 elastic', elasticity: 'number，默认 0.1', inertia: 'boolean，默认 true', decelerationRate: 'number，默认 0.135', scrollSensitivity: 'number，默认 1', horizontalScrollbarVisibility: 'permanent|autoHide|autoHideAndExpandViewport，默认 permanent', verticalScrollbarVisibility: 'permanent|autoHide|autoHideAndExpandViewport，默认 permanent', horizontalScrollbarSpacing: 'number，默认 0', verticalScrollbarSpacing: 'number，默认 0' },
			references: {
				contentNodeId: { unityProperty: 'content', required: true, fallbackNames: ['Content'] },
				viewportNodeId: { unityProperty: 'viewport', required: false, fallbackNames: ['Viewport'] },
				horizontalScrollbarNodeId: { unityProperty: 'horizontalScrollbar', required: false, fallbackNames: ['Scrollbar Horizontal', 'Horizontal Scrollbar'] },
				verticalScrollbarNodeId: { unityProperty: 'verticalScrollbar', required: false, fallbackNames: ['Scrollbar Vertical', 'Vertical Scrollbar'] }
			}
		},
		Mask: {
			unityType: 'UnityEngine.UI.Mask',
			fields: { showMaskGraphic: 'boolean，默认 true；同节点必须有 Image' },
			references: {}
		},
		RectMask2D: {
			unityType: 'UnityEngine.UI.RectMask2D',
			fields: { softness: '[x,y] 非负整数，默认 [0,0]' },
			references: {}
		},
		HorizontalLayoutGroup: {
			unityType: 'UnityEngine.UI.HorizontalLayoutGroup',
			fields: { padding: '[left,right,top,bottom]，默认 [0,0,0,0]', childAlignment: 'upperLeft|upperCenter|upperRight|middleLeft|middleCenter|middleRight|lowerLeft|lowerCenter|lowerRight，默认 upperLeft', spacing: 'number，默认 0', childControlWidth: 'boolean，默认 true', childControlHeight: 'boolean，默认 true', childForceExpandWidth: 'boolean，默认 true', childForceExpandHeight: 'boolean，默认 true', childScaleWidth: 'boolean，默认 false', childScaleHeight: 'boolean，默认 false', reverseArrangement: 'boolean，默认 false' },
			references: {}
		},
		VerticalLayoutGroup: {
			unityType: 'UnityEngine.UI.VerticalLayoutGroup',
			fields: { padding: '[left,right,top,bottom]，默认 [0,0,0,0]', childAlignment: 'upperLeft|upperCenter|upperRight|middleLeft|middleCenter|middleRight|lowerLeft|lowerCenter|lowerRight，默认 upperLeft', spacing: 'number，默认 0', childControlWidth: 'boolean，默认 true', childControlHeight: 'boolean，默认 true', childForceExpandWidth: 'boolean，默认 true', childForceExpandHeight: 'boolean，默认 true', childScaleWidth: 'boolean，默认 false', childScaleHeight: 'boolean，默认 false', reverseArrangement: 'boolean，默认 false' },
			references: {}
		},
		GridLayoutGroup: {
			unityType: 'UnityEngine.UI.GridLayoutGroup',
			fields: { padding: '[left,right,top,bottom]，默认 [0,0,0,0]', childAlignment: 'upperLeft|upperCenter|upperRight|middleLeft|middleCenter|middleRight|lowerLeft|lowerCenter|lowerRight，默认 upperLeft', startCorner: 'upperLeft|upperRight|lowerLeft|lowerRight，默认 upperLeft', startAxis: 'horizontal|vertical，默认 horizontal', cellSize: '[width,height]，默认 [100,100]', spacing: '[x,y]，默认 [0,0]', constraint: 'flexible|fixedColumnCount|fixedRowCount，默认 flexible', constraintCount: 'positive integer，默认 2' },
			references: {}
		},
		ContentSizeFitter: {
			unityType: 'UnityEngine.UI.ContentSizeFitter',
			fields: { horizontalFit: 'unconstrained|minSize|preferredSize，默认 unconstrained', verticalFit: 'unconstrained|minSize|preferredSize，默认 unconstrained' },
			references: {}
		},
		LayoutElement: {
			unityType: 'UnityEngine.UI.LayoutElement',
			fields: { ignoreLayout: 'boolean，默认 false', minWidth: 'number，默认 -1', minHeight: 'number，默认 -1', preferredWidth: 'number，默认 -1', preferredHeight: 'number，默认 -1', flexibleWidth: 'number，默认 -1', flexibleHeight: 'number，默认 -1', layoutPriority: 'positive integer，默认 1' },
			references: {}
		}
	}
}

/** Write one JSON response and close it. */
function sendJson(res, status, body) {
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store'
	})
	res.end(JSON.stringify(body))
}

function sendBuffer(res, status, body, contentType) {
	res.writeHead(status, {
		'content-type': contentType,
		'content-length': body.length,
		'cache-control': 'no-store'
	})
	res.end(body)
}

/** Run a command; never rejects on exit code — caller inspects .code. */
function run(argv, timeoutMs) {
	return new Promise((resolve) => {
		execFile(
			argv[0],
			argv.slice(1),
			{ timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 },
			(error, stdout, stderr) => {
				resolve({
					code: error ? (typeof error.code === 'number' ? error.code : 1) : 0,
					stdout: String(stdout ?? ''),
					stderr: String(stderr ?? ''),
					timedOut: Boolean(error && error.code === 'ETIMEDOUT')
				})
			}
		)
	})
}

function parseJson(text, label) {
	try {
		return JSON.parse(text)
	} catch (error) {
		throw new Error(`${label} 返回了非法 JSON: ${String(error.message)}; head=${text.slice(0, 200)}`)
	}
}

function cloneJsonInput(value, label) {
	try {
		return JSON.parse(JSON.stringify(value))
	} catch (error) {
		throw new Error(`${label} 必须是可复制的普通 JSON: ${String(error.message)}`)
	}
}

async function readRequestBuffer(req, maxBytes) {
	const chunks = []
	let total = 0
	for await (const chunk of req) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
		total += buffer.length
		if (total > maxBytes) throw new Error('请求体过大')
		chunks.push(buffer)
	}
	return Buffer.concat(chunks)
}

async function readRequestJson(req, maxBytes = 256 * 1024) {
	const body = await readRequestBuffer(req, maxBytes)
	if (body.length === 0) return {}
	return parseJson(body.toString('utf8'), 'uGUI 编辑请求')
}

function finiteNumber(value) {
	return typeof value === 'number' && Number.isFinite(value)
}

const UI_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/

function requireUiName(dsl) {
	const name = dsl?.name
	if (typeof name !== 'string' || !UI_NAME_PATTERN.test(name)) {
		throw new Error('dsl.name 必须以英文字母开头，且仅包含英文字母、数字、下划线（最多 64 字符）')
	}
	return name
}

async function readJsonFile(path) {
	return parseJson(await readFile(path, 'utf8'), path)
}

let writeSequence = 0

async function writeJsonFile(path, value) {
	await mkdir(dirname(path), { recursive: true })
	const temporaryPath = `${path}.dsh-${process.pid}-${Date.now()}-${++writeSequence}.tmp`
	await writeFile(temporaryPath, JSON.stringify(value, null, 2) + '\n', 'utf8')
	await rename(temporaryPath, path)
}

const CANVAS_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/

function requireCanvasId(value) {
	if (typeof value !== 'string' || !CANVAS_ID_PATTERN.test(value)) {
		throw new Error('canvasId 必须以小写英文字母开头，且仅包含小写字母、数字、连字符（最多 64 字符）')
	}
	return value
}

function canvasIdFromUiName(uiName) {
	const slug = String(uiName)
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()
		.slice(0, 64)
	return requireCanvasId(slug || 'canvas')
}

function canvasFilePath(canvasId) {
	return join(CANVASES_DIR, `${requireCanvasId(canvasId)}.dsl.json`)
}

function canvasDslPath(canvasId) {
	return `canvases/${requireCanvasId(canvasId)}.dsl.json`
}

function canvasLogicPath(canvasId) {
	return join(CANVASES_DIR, `${requireCanvasId(canvasId)}.logic.js`)
}

function canvasViewScriptPath(canvasId) {
	return join(CANVASES_DIR, `${requireCanvasId(canvasId)}.view.cs`)
}

function canvasTestDataScriptPath(canvasId) {
	return join(CANVASES_DIR, `${requireCanvasId(canvasId)}.testdata.cs`)
}

function canvasBindingsPath(canvasId) {
	return join(CANVASES_DIR, `${requireCanvasId(canvasId)}.bindings.json`)
}

function canvasSyncPath(canvasId) {
	return join(CANVASES_DIR, `${requireCanvasId(canvasId)}.sync.json`)
}

// 视图脚本必须声明与 dsl.name 同名的类，否则 Unity 侧无法按类名挂载组件
export function viewScriptClassError(source, uiName) {
	if (typeof source !== 'string' || source.trim() === '') return '脚本内容为空'
	const escaped = String(uiName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	if (!new RegExp(`class\\s+${escaped}\\b`).test(source)) return `脚本必须声明与 DSL name 同名的类: class ${uiName}`
	return null
}

// <canvasId>.bindings.json：{ 序列化字段名: nodeId 或 [nodeId...] }，字段名必须是合法 C# 标识符
export function validateViewBindings(value) {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'bindings.json 必须是 { 字段名: nodeId 或 [nodeId...] } 对象'
	for (const [field, target] of Object.entries(value)) {
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) return `bindings 字段名必须是合法 C# 标识符: ${field}`
		const ids = Array.isArray(target) ? target : [target]
		if (ids.length === 0) return `bindings.${field} 数组不能为空`
		for (const id of ids) {
			if (!validNodeId(id)) return `bindings.${field} 含非法 nodeId: ${String(id)}`
		}
	}
	return null
}

const NODE_ID_PATTERN = /^node-[a-f0-9]{16}$/

function validNodeId(value) {
	return typeof value === 'string' && NODE_ID_PATTERN.test(value)
}

function requireNodeId(value) {
	if (!validNodeId(value)) throw new Error('nodeId 必须是 node- 加 16 位小写十六进制字符')
	return value
}

function allocatedNodeId(node, used) {
	const name = typeof node?.name === 'string' ? node.name : 'Node'
	for (let attempt = 0; attempt < 10000; attempt += 1) {
		const candidate = `node-${randomUUID().replace(/-/g, '').slice(0, 16)}`
		if (!used.has(candidate)) return candidate
	}
	throw new Error(`无法为节点 ${name} 分配 nodeId`)
}

function ensureNodeIds(_canvasId, root) {
	const used = new Set()
	const remapped = new Map()
	let changed = false
	let count = 0
	function visit(node, nodePath) {
		if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error(`节点格式无效: [${nodePath.join(',')}]`)
		if (!validNodeId(node.nodeId) || used.has(node.nodeId)) {
			const previous = typeof node.nodeId === 'string' && node.nodeId !== '' ? node.nodeId : null
			node.nodeId = allocatedNodeId(node, used)
			if (previous && !remapped.has(previous)) remapped.set(previous, node.nodeId)
			changed = true
		}
		used.add(node.nodeId)
		count += 1
		if (node.children !== undefined && !Array.isArray(node.children)) throw new Error(`children 必须是数组: ${node.nodeId}`)
		if (Array.isArray(node.children)) {
			for (let index = 0; index < node.children.length; index += 1) visit(node.children[index], nodePath.concat(index))
		}
	}
	visit(root, [])
	if (remapped.size > 0) {
		// ID 被重分配后同步重写组件内的 *NodeId 引用，避免引用悬空到构建期才报错
		function rewriteReferences(node) {
			for (const component of Array.isArray(node.components) ? node.components : []) {
				if (!component || typeof component !== 'object') continue
				for (const key of Object.keys(component)) {
					if (key.endsWith('NodeId') && typeof component[key] === 'string' && remapped.has(component[key])) {
						component[key] = remapped.get(component[key])
					}
				}
			}
			for (const child of Array.isArray(node.children) ? node.children : []) rewriteReferences(child)
		}
		rewriteReferences(root)
	}
	return { changed, count }
}

function inheritNodeIds(existing, incoming) {
	if (!existing || typeof existing !== 'object' || !incoming || typeof incoming !== 'object') return
	if (!validNodeId(incoming.nodeId) && validNodeId(existing.nodeId)) incoming.nodeId = existing.nodeId
	const existingChildren = Array.isArray(existing.children) ? existing.children : []
	const incomingChildren = Array.isArray(incoming.children) ? incoming.children : []
	const claimed = new Set()
	for (let index = 0; index < incomingChildren.length; index += 1) {
		const child = incomingChildren[index]
		let matchIndex = -1
		if (validNodeId(child?.nodeId)) {
			matchIndex = existingChildren.findIndex((candidate, candidateIndex) => !claimed.has(candidateIndex) && candidate?.nodeId === child.nodeId)
		}
		if (matchIndex < 0 && typeof child?.name === 'string') {
			const nameMatches = existingChildren
				.map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
				.filter(({ candidate, candidateIndex }) => !claimed.has(candidateIndex) && candidate?.name === child.name)
			if (nameMatches.length === 1) matchIndex = nameMatches[0].candidateIndex
		}
		if (matchIndex < 0) continue
		claimed.add(matchIndex)
		inheritNodeIds(existingChildren[matchIndex], child)
	}
}

function findNodeById(root, nodeId) {
	if (!validNodeId(nodeId)) return undefined
	let found
	function visit(node, nodePath, breadcrumb) {
		if (found || !node || typeof node !== 'object') return
		const names = breadcrumb.concat(String(node.name ?? '未命名节点'))
		if (node.nodeId === nodeId) {
			found = { node, nodePath: [...nodePath], breadcrumb: names }
			return
		}
		if (Array.isArray(node.children)) {
			for (let index = 0; index < node.children.length; index += 1) visit(node.children[index], nodePath.concat(index), names)
		}
	}
	visit(root, [], [])
	return found
}

function validateWorkspace(value) {
	if (!value || typeof value !== 'object' || value.workspaceVersion !== WORKSPACE_VERSION || !Array.isArray(value.canvases)) {
		throw new Error(`workspace.json 格式无效或版本不受支持（需要 ${WORKSPACE_VERSION}）`)
	}
	const seen = new Set()
	for (const entry of value.canvases) {
		requireCanvasId(entry?.id)
		if (seen.has(entry.id)) throw new Error(`workspace.json 中 canvasId 重复: ${entry.id}`)
		seen.add(entry.id)
		if (typeof entry.uiName !== 'string' || !UI_NAME_PATTERN.test(entry.uiName)) {
			throw new Error(`workspace.json 中 uiName 无效: ${String(entry.uiName)}`)
		}
		if (!Number.isSafeInteger(entry.version) || entry.version < 0) entry.version = 0
		entry.dslPath = canvasDslPath(entry.id)
	}
	if (value.defaultCanvasId !== null && value.defaultCanvasId !== undefined && !seen.has(value.defaultCanvasId)) {
		throw new Error(`workspace.json 的 defaultCanvasId 不存在: ${String(value.defaultCanvasId)}`)
	}
	value.defaultCanvasId = value.defaultCanvasId ?? (value.canvases[0]?.id ?? null)
	return value
}

async function readLegacyVersion() {
	try {
		const state = await readJsonFile(LEGACY_STATE_PATH)
		return Number.isSafeInteger(state.version) && state.version >= 0 ? state.version : 0
	} catch {
		return 0
	}
}

async function readWorkspace() {
	if (CONFIG_ERROR !== null) throw new Error(CONFIG_ERROR)
	try {
		return validateWorkspace(await readJsonFile(WORKSPACE_PATH))
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error
	}

	const workspace = {
		workspaceVersion: WORKSPACE_VERSION,
		defaultCanvasId: null,
		canvases: []
	}
	try {
		const legacyDsl = await readJsonFile(LEGACY_DSL_PATH)
		const uiName = requireUiName(legacyDsl)
		if (!legacyDsl.root || typeof legacyDsl.root !== 'object') throw new Error('旧 current.dsl.json 缺少 root')
		const canvasId = canvasIdFromUiName(uiName)
		const entry = {
			id: canvasId,
			uiName,
			dslPath: canvasDslPath(canvasId),
			version: await readLegacyVersion()
		}
		await writeJsonFile(canvasFilePath(canvasId), legacyDsl)
		workspace.canvases.push(entry)
		workspace.defaultCanvasId = canvasId
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error
	}
	await writeJsonFile(WORKSPACE_PATH, workspace)
	return workspace
}

function publicWorkspace(workspace, canvasDetails) {
	return {
		workspaceVersion: workspace.workspaceVersion,
		defaultCanvasId: workspace.defaultCanvasId,
		canvases: workspace.canvases.map((entry) => {
			const details = canvasDetails instanceof Map ? canvasDetails.get(entry.id) : undefined
			return {
				id: entry.id,
				uiName: entry.uiName,
				dslPath: canvasDslPath(entry.id),
				version: entry.version,
				...(Number.isSafeInteger(details?.nodeCount) ? { nodeCount: details.nodeCount } : {})
			}
		})
	}
}

function requestedCanvasId(args) {
	const value = args?.canvasId
	return value === undefined || value === null || value === '' ? null : requireCanvasId(value)
}

function nextCanvasId(workspace, uiName) {
	const base = canvasIdFromUiName(uiName)
	const ids = new Set(workspace.canvases.map((entry) => entry.id))
	if (!ids.has(base)) return base
	for (let suffix = 2; suffix < 10000; suffix += 1) {
		const tail = `-${suffix}`
		const candidate = `${base.slice(0, 64 - tail.length).replace(/-+$/g, '')}${tail}`
		if (!ids.has(candidate)) return candidate
	}
	throw new Error(`无法为 ${uiName} 分配 canvasId`)
}

async function readCanvasRecordUnlocked(canvasId) {
	const workspace = await readWorkspace()
	const resolvedId = canvasId ?? workspace.defaultCanvasId
	if (resolvedId === null) throw new Error('Workspace 中还没有 Canvas')
	requireCanvasId(resolvedId)
	const entry = workspace.canvases.find((candidate) => candidate.id === resolvedId)
	if (!entry) throw new Error(`未找到 Canvas: ${resolvedId}`)
	const dsl = await readJsonFile(canvasFilePath(entry.id))
	const uiName = requireUiName(dsl)
	if (uiName !== entry.uiName) throw new Error(`Canvas 索引与 DSL 名称不一致: ${entry.uiName} != ${uiName}`)
	const nodeIds = ensureNodeIds(entry.id, dsl.root)
	if (nodeIds.changed) await persistCanvas(workspace, entry, dsl)
	return { workspace, entry, dsl, nodeCount: nodeIds.count, nodeIdsMigrated: nodeIds.changed }
}

let workspaceOperationQueue = Promise.resolve()

function enqueueWorkspaceOperation(task) {
	const pending = workspaceOperationQueue.then(task, task)
	workspaceOperationQueue = pending.catch(() => {})
	return pending
}

function readCanvasRecord(canvasId) {
	return enqueueWorkspaceOperation(() => readCanvasRecordUnlocked(canvasId))
}

function readWorkspaceOverview() {
	return enqueueWorkspaceOperation(async () => {
		let workspace = await readWorkspace()
		const entries = [...workspace.canvases]
		const canvasDetails = new Map()
		for (const entry of entries) {
			const record = await readCanvasRecordUnlocked(entry.id)
			workspace = record.workspace
			canvasDetails.set(entry.id, { nodeCount: record.nodeCount })
		}
		return { workspace, canvasDetails }
	})
}

async function persistCanvas(workspace, entry, dsl) {
	const uiName = requireUiName(dsl)
	if (!dsl.root || typeof dsl.root !== 'object') throw new Error('dsl.root 缺失')
	ensureNodeIds(entry.id, dsl.root)
	if (dsl.root.name !== uiName) throw new Error(`dsl.root.name 必须与 dsl.name 一致: ${String(dsl.root.name)} != ${uiName}`)
	if (entry.uiName !== uiName) throw new Error(`不能在现有 Canvas 中把 dsl.name 从 ${entry.uiName} 改为 ${uiName}；请新建 Canvas`)
	entry.version = (Number.isSafeInteger(entry.version) ? entry.version : 0) + 1
	entry.dslPath = canvasDslPath(entry.id)
	await writeJsonFile(canvasFilePath(entry.id), dsl)
	await writeJsonFile(WORKSPACE_PATH, workspace)
	if (workspace.defaultCanvasId === entry.id) {
		await writeJsonFile(LEGACY_DSL_PATH, dsl)
		await writeJsonFile(LEGACY_STATE_PATH, { version: entry.version, canvasId: entry.id })
	}
	return entry.version
}

function enqueueMutation(task) {
	return enqueueWorkspaceOperation(task)
}

function text(value) {
	let text
	try {
		text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
	} catch {
		text = String(value)
	}
	return [{ type: 'text', text: (text ?? '').slice(0, 6000) }]
}

async function executeGetWorkspace() {
	try {
		const overview = await readWorkspaceOverview()
		return { ok: true, workspace: publicWorkspace(overview.workspace, overview.canvasDetails), stableNodeIds: true, overview: true, impl: IMPL }
	} catch (error) {
		return { ok: false, error: String(error.message ?? error), impl: IMPL }
	}
}

async function executeGetDsl(args) {
	try {
		const record = await readCanvasRecord(requestedCanvasId(args))
		return {
			ok: true,
			canvasId: record.entry.id,
			uiName: record.entry.uiName,
			dsl: record.dsl,
			version: record.entry.version,
			workspace: publicWorkspace(record.workspace, new Map([[record.entry.id, { nodeCount: record.nodeCount }]])),
			impl: IMPL
		}
	} catch (error) {
		return { ok: false, error: String(error.message ?? error), impl: IMPL }
	}
}

function frameOfRect(rect, parentWidth, parentHeight) {
	// 与浏览器设计器/预览器的 frameOf 全量对齐：任何一边算错，重叠验收都会误报。
	const source = rect && typeof rect === 'object' ? rect : {}
	const anchor = typeof source.anchor === 'string' ? source.anchor : 'center'
	const size = Array.isArray(source.size) ? source.size : [100, 100]
	const offset = Array.isArray(source.offset) ? source.offset : [0, 0, 0, 0]
	const width = Number.isFinite(size[0]) ? size[0] : 100
	const height = Number.isFinite(size[1]) ? size[1] : 100
	const ox = Number.isFinite(offset[0]) ? offset[0] : 0
	const oy = Number.isFinite(offset[1]) ? offset[1] : 0
	const numberAt = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
	const vec = (value, fallback) => (Array.isArray(value) ? value : fallback)
	if (anchor === 'stretch') {
		const right = Number.isFinite(offset[2]) ? offset[2] : 0
		const bottom = Number.isFinite(offset[3]) ? offset[3] : 0
		return { x: ox, y: oy, width: Math.max(0, parentWidth - ox - right), height: Math.max(0, parentHeight - oy - bottom) }
	}
	if (anchor === 'topLeft') return { x: ox, y: oy, width, height }
	if (anchor === 'topCenter') return { x: (parentWidth - width) / 2 + ox, y: oy, width, height }
	if (anchor === 'topRight') return { x: parentWidth - width - ox, y: oy, width, height }
	if (anchor === 'middleLeft') return { x: ox, y: (parentHeight - height) / 2 - oy, width, height }
	if (anchor === 'middleRight') return { x: parentWidth - width - ox, y: (parentHeight - height) / 2 - oy, width, height }
	if (anchor === 'bottomLeft') return { x: ox, y: parentHeight - height - oy, width, height }
	if (anchor === 'bottomCenter') return { x: (parentWidth - width) / 2 + ox, y: parentHeight - height - oy, width, height }
	if (anchor === 'bottomRight') return { x: parentWidth - width - ox, y: parentHeight - height - oy, width, height }
	if (anchor === 'topStretch') return { x: ox, y: oy, width: parentWidth, height }
	if (anchor === 'bottomStretch') return { x: ox, y: parentHeight - height - oy, width: parentWidth, height }
	if (anchor === 'leftStretch') return { x: ox, y: -oy, width, height: parentHeight }
	if (anchor === 'rightStretch') return { x: parentWidth - width - ox, y: -oy, width, height: parentHeight }
	if (anchor === 'custom') {
		const anchorMin = vec(source.anchorMin, [0.5, 0.5])
		const anchorMax = vec(source.anchorMax, anchorMin)
		const pivot = vec(source.pivot, [0.5, 0.5])
		const position = vec(source.position, [0, 0])
		const px = numberAt(pivot[0], 0.5)
		const py = numberAt(pivot[1], 0.5)
		const minX = numberAt(anchorMin[0], 0.5)
		const minY = numberAt(anchorMin[1], 0.5)
		const maxX = numberAt(anchorMax[0], minX)
		const maxY = numberAt(anchorMax[1], minY)
		const actualWidth = Math.max(0, parentWidth * (maxX - minX) + width)
		const actualHeight = Math.max(0, parentHeight * (maxY - minY) + height)
		const anchorX = parentWidth * (minX + (maxX - minX) * px)
		const anchorY = parentHeight * (minY + (maxY - minY) * py)
		const x = anchorX + numberAt(position[0], 0) - actualWidth * px
		const y = parentHeight - (anchorY + numberAt(position[1], 0)) - actualHeight * (1 - py)
		return { x, y, width: actualWidth, height: actualHeight }
	}
	return { x: (parentWidth - width) / 2 + ox, y: (parentHeight - height) / 2 - oy, width, height }
}

function componentOf(node, type) {
	return Array.isArray(node && node.components) ? node.components.find((component) => component && component.type === type) : undefined
}

function collectVisualIssues(dsl) {
	const resolution = dsl && dsl.canvas && Array.isArray(dsl.canvas.referenceResolution) ? dsl.canvas.referenceResolution : [1080, 1920]
	const canvasWidth = Number.isFinite(resolution[0]) ? resolution[0] : 1080
	const canvasHeight = Number.isFinite(resolution[1]) ? resolution[1] : 1920
	const issues = []
	const nodes = []
	const byId = new Map()
	function intersectFrames(first, second) {
		const x = Math.max(first.x, second.x)
		const y = Math.max(first.y, second.y)
		return { x, y, width: Math.max(0, Math.min(first.x + first.width, second.x + second.width) - x), height: Math.max(0, Math.min(first.y + first.height, second.y + second.height) - y) }
	}
	const canvasClip = { x: 0, y: 0, width: canvasWidth, height: canvasHeight }
	function visit(node, parent, parentFrame, depth, clipFrame, parentInactive) {
		if (!node || typeof node !== 'object') return null
		// active:false 子树初始不可见：结构与引用校验照常，但不参与兄弟重叠判定
		const inactive = parentInactive === true || node.active === false
		const frame = parent ? frameOfRect(node.rect, parentFrame.width, parentFrame.height) : { x: 0, y: 0, width: canvasWidth, height: canvasHeight }
		const absolute = { x: (parent ? parent.frame.x : 0) + frame.x, y: (parent ? parent.frame.y : 0) + frame.y, width: frame.width, height: frame.height }
		const record = { node, parent, frame: absolute, clip: clipFrame, depth, inactive }
		nodes.push(record)
		if (typeof node.nodeId === 'string' && node.nodeId !== '') byId.set(node.nodeId, record)
		if (node.rect !== undefined) {
			const rectError = validateRect(node.rect)
			if (rectError) issues.push({ severity: 'error', nodeId: node.nodeId, nodeName: node.name, message: 'rect 无效: ' + rectError })
		}
		for (const component of Array.isArray(node.components) ? node.components : []) {
			if (component && component.type === 'TMP_Text' && String(component.text || '').includes('\\n')) {
				issues.push({ severity: 'error', nodeId: node.nodeId, nodeName: node.name, message: `TMP_Text 显示字面 \\n，必须改为真实换行: ${node.name}` })
			}
		}
		// Mask/RectMask2D/ScrollRect 裁剪后代图形：被裁掉的区域不参与重叠判定
		const clips = Boolean(componentOf(node, 'Mask') || componentOf(node, 'RectMask2D') || componentOf(node, 'ScrollRect'))
		const childClip = clips ? intersectFrames(clipFrame, absolute) : clipFrame
		for (const child of Array.isArray(node.children) ? node.children : []) visit(child, record, frame, depth + 1, childClip, inactive)
		return record
	}
	const root = visit(dsl && dsl.root, null, null, 0, canvasClip)
	if (!root) issues.push({ severity: 'error', message: 'dsl.root 缺失' })
	for (const record of nodes) {
		const scrollRect = componentOf(record.node, 'ScrollRect')
		if (scrollRect) {
			const content = typeof scrollRect.contentNodeId === 'string' ? byId.get(scrollRect.contentNodeId) : undefined
			const viewport = typeof scrollRect.viewportNodeId === 'string' ? byId.get(scrollRect.viewportNodeId) : undefined
			if (!content) issues.push({ severity: 'error', nodeId: record.node.nodeId, nodeName: record.node.name, message: `ScrollRect 缺少可解析 Content: ${record.node.name}` })
			if (!viewport) issues.push({ severity: 'error', nodeId: record.node.nodeId, nodeName: record.node.name, message: `ScrollRect 缺少可解析 Viewport: ${record.node.name}` })
			if (content && viewport) {
				let cursor = content.parent
				let insideViewport = false
				while (cursor) {
					if (cursor === viewport) { insideViewport = true; break }
					cursor = cursor.parent
				}
				if (!insideViewport) issues.push({ severity: 'error', nodeId: content.node.nodeId, nodeName: content.node.name, message: `ScrollRect Content 必须位于 Viewport 子树中: ${content.node.name}` })
			}
		}
		const horizontal = componentOf(record.node, 'HorizontalLayoutGroup')
		const vertical = componentOf(record.node, 'VerticalLayoutGroup')
		if (horizontal || vertical) {
			for (const childRecord of nodes.filter((candidate) => candidate.parent === record)) {
				const element = componentOf(childRecord.node, 'LayoutElement')
				if (element && element.ignoreLayout === true) continue
				if (horizontal && horizontal.childControlWidth !== false && !hasLayoutDimension(childRecord.node, 0)) issues.push({ severity: 'error', nodeId: childRecord.node.nodeId, nodeName: childRecord.node.name, message: `LayoutGroup 控制的子节点需要 LayoutElement 宽度: ${childRecord.node.name}` })
				if (vertical && vertical.childControlHeight !== false && !hasLayoutDimension(childRecord.node, 1)) issues.push({ severity: 'error', nodeId: childRecord.node.nodeId, nodeName: childRecord.node.name, message: `LayoutGroup 控制的子节点需要 LayoutElement 高度: ${childRecord.node.name}` })
			}
		}
		const toggle = componentOf(record.node, 'Toggle')
		if (toggle && typeof toggle.toggleGroupNodeId === 'string' && toggle.toggleGroupNodeId !== '' && !byId.has(toggle.toggleGroupNodeId)) {
			issues.push({ severity: 'error', nodeId: record.node.nodeId, nodeName: record.node.name, message: `Toggle.toggleGroupNodeId 指向不存在的节点: ${record.node.name}` })
		}
	}
	function frameContains(outer, inner, tolerance = 2) {
		return outer.x <= inner.x + tolerance && outer.y <= inner.y + tolerance
			&& outer.x + outer.width >= inner.x + inner.width - tolerance && outer.y + outer.height >= inner.y + inner.height - tolerance
	}
	const hasGraphic = (node) => Boolean(componentOf(node, 'Image') || componentOf(node, 'TMP_Text'))
	const graphicsCache = new Map()
	function graphicsOf(record) {
		const cached = graphicsCache.get(record)
		if (cached) return cached
		const graphics = []
		for (const candidate of nodes) {
			if (candidate.inactive) continue
			if (!hasGraphic(candidate.node)) continue
			let cursor = candidate
			let inside = false
			while (cursor) {
				if (cursor === record) { inside = true; break }
				cursor = cursor.parent
			}
			if (!inside) continue
			const visible = intersectFrames(candidate.frame, candidate.clip)
			if (visible.width <= 0 || visible.height <= 0) continue
			graphics.push({ node: candidate.node, frame: visible })
		}
		graphicsCache.set(record, graphics)
		return graphics
	}
	// 兄弟重叠只统计「图形级部分交叠」：完全包含视为有意层叠（Toggle 的
	// Background/Checkmark/Label、光效垫底、底图+文字都是标准结构），无图形子树的
	// 透明容器之间不参与判定，LayoutGroup 的子节点由布局组件排布也不参与。
	for (const parent of nodes) {
		if (componentOf(parent.node, 'HorizontalLayoutGroup') || componentOf(parent.node, 'VerticalLayoutGroup') || componentOf(parent.node, 'GridLayoutGroup')) continue
		const children = nodes.filter((candidate) => candidate.parent === parent && !candidate.inactive)
		for (let index = 0; index < children.length; index += 1) {
			for (let other = index + 1; other < children.length; other += 1) {
				const first = children[index]
				const second = children[other]
				const firstGraphics = graphicsOf(first)
				const secondGraphics = graphicsOf(second)
				if (firstGraphics.length === 0 || secondGraphics.length === 0) continue
				let reported = false
				for (const firstGraphic of firstGraphics) {
					for (const secondGraphic of secondGraphics) {
						const overlapX = Math.min(firstGraphic.frame.x + firstGraphic.frame.width, secondGraphic.frame.x + secondGraphic.frame.width) - Math.max(firstGraphic.frame.x, secondGraphic.frame.x)
						const overlapY = Math.min(firstGraphic.frame.y + firstGraphic.frame.height, secondGraphic.frame.y + secondGraphic.frame.height) - Math.max(firstGraphic.frame.y, secondGraphic.frame.y)
						if (overlapX <= 24 || overlapY <= 24) continue
						if (frameContains(firstGraphic.frame, secondGraphic.frame) || frameContains(secondGraphic.frame, firstGraphic.frame)) continue
						issues.push({ severity: 'error', nodeId: second.node.nodeId, nodeName: second.node.name, message: `兄弟区域发生重叠: ${first.node.name} 与 ${second.node.name}（${firstGraphic.node.name} 与 ${secondGraphic.node.name} 部分交叠）` })
						reported = true
						break
					}
					if (reported) break
				}
			}
		}
	}
	return {
		ok: issues.length === 0,
		issues,
		summary: {
			nodes: nodes.length,
			scrollRects: nodes.filter((record) => componentOf(record.node, 'ScrollRect')).length,
			toggleGroups: nodes.filter((record) => componentOf(record.node, 'ToggleGroup')).length,
			layoutGroups: nodes.filter((record) => componentOf(record.node, 'HorizontalLayoutGroup') || componentOf(record.node, 'VerticalLayoutGroup') || componentOf(record.node, 'GridLayoutGroup')).length
		}
	}
}

function hasLayoutDimension(node, axis) {
	const element = componentOf(node, 'LayoutElement')
	if (!element) return false
	if (axis === 0) return Number(element.minWidth) >= 0 || Number(element.preferredWidth) >= 0
	return Number(element.minHeight) >= 0 || Number(element.preferredHeight) >= 0
}

async function executeVisualAcceptance(args) {
	try {
		if (args && typeof args.dsl === 'object' && args.dsl !== null) {
			return { ...collectVisualIssues(cloneJsonInput(args.dsl, 'dsl')), source: 'inline-dsl', impl: IMPL }
		}
		const record = await readCanvasRecord(requestedCanvasId(args))
		return { ...collectVisualIssues(record.dsl), source: 'canvas', canvasId: record.entry.id, version: record.entry.version, impl: IMPL }
	} catch (error) {
		return { ok: false, issues: [{ severity: 'error', message: String(error.message ?? error) }], impl: IMPL }
	}
}

async function executeApplyDsl(args) {
	return enqueueMutation(async () => {
		try {
			const inputDsl = args && args.dsl
			if (typeof inputDsl !== 'object' || inputDsl === null) return { ok: false, error: 'dsl 必须是对象', impl: IMPL }
			const dsl = cloneJsonInput(inputDsl, 'dsl')
			const uiName = requireUiName(dsl)
			if (typeof dsl.root !== 'object' || dsl.root === null) return { ok: false, error: 'dsl.root 缺失', impl: IMPL }
			const rectErrors = validateNodeTreeRects(dsl.root)
			if (rectErrors.length > 0) return { ok: false, error: `rect 校验失败: ${rectErrors.join('; ')}`, impl: IMPL }
			let workspace = await readWorkspace()
			const explicitId = requestedCanvasId(args)
			let entry = explicitId
				? workspace.canvases.find((candidate) => candidate.id === explicitId)
				: workspace.canvases.find((candidate) => candidate.uiName === uiName)
			let existingDsl = null
			if (entry) {
				const record = await readCanvasRecordUnlocked(entry.id)
				workspace = record.workspace
				entry = record.entry
				existingDsl = record.dsl
			} else {
				const sameName = workspace.canvases.find((candidate) => candidate.uiName === uiName)
				if (sameName) return { ok: false, error: `uiName 已由 Canvas ${sameName.id} 使用`, impl: IMPL }
				const canvasId = explicitId ?? nextCanvasId(workspace, uiName)
				entry = { id: canvasId, uiName, dslPath: canvasDslPath(canvasId), version: 0 }
				workspace.canvases.push(entry)
			}
			const expectedVersion = args?.expectedVersion
			if (Number.isSafeInteger(expectedVersion) && expectedVersion !== entry.version) {
				return { ok: false, error: 'version-conflict', canvasId: entry.id, currentVersion: entry.version, impl: IMPL }
			}
			if (existingDsl) inheritNodeIds(existingDsl.root, dsl.root)
			workspace.defaultCanvasId = entry.id
			const version = await persistCanvas(workspace, entry, dsl)
			const nodeCount = ensureNodeIds(entry.id, dsl.root).count
			return {
				ok: true,
				canvasId: entry.id,
				uiName: entry.uiName,
				version,
				workspace: publicWorkspace(workspace, new Map([[entry.id, { nodeCount }]])),
				impl: IMPL
			}
		} catch (error) {
			return { ok: false, error: String(error.message ?? error), impl: IMPL }
		}
	})
}

async function executePatchNode(args) {
	return enqueueMutation(async () => {
		try {
			const path = String(args?.path ?? '')
			const requestedNodeId = args?.nodeId === undefined ? null : requireNodeId(args.nodeId)
			const inputPatch = args?.patch
			if ((requestedNodeId === null && path === '') || typeof inputPatch !== 'object' || inputPatch === null) {
				return { ok: false, error: 'nodeId/path/patch 参数无效', impl: IMPL }
			}
			const patch = cloneJsonInput(inputPatch, 'patch')
			const record = await readCanvasRecordUnlocked(requestedCanvasId(args))
			const expectedVersion = args?.expectedVersion
			if (Number.isSafeInteger(expectedVersion) && expectedVersion !== record.entry.version) {
				return { ok: false, error: 'version-conflict', canvasId: record.entry.id, currentVersion: record.entry.version, impl: IMPL }
			}
			let node
			if (requestedNodeId !== null) {
				const located = findNodeById(record.dsl.root, requestedNodeId)
				if (!located) return { ok: false, error: `未找到 nodeId: ${requestedNodeId}`, impl: IMPL }
				node = located.node
			} else {
				const parts = path.split('/')
				if (!record.dsl.root || parts[0] !== record.dsl.root.name) {
					return { ok: false, error: `path 根节点不匹配: ${parts[0]} != ${record.dsl.root?.name}`, impl: IMPL }
				}
				node = record.dsl.root
				for (const segment of parts.slice(1)) {
					const matches = Array.isArray(node.children) ? node.children.filter((child) => child?.name === segment) : []
					if (matches.length === 0) return { ok: false, error: `未找到节点: ${segment}`, impl: IMPL }
					if (matches.length > 1) return { ok: false, error: `名称路径存在歧义，请改用 nodeId: ${segment}`, impl: IMPL }
					node = matches[0]
				}
			}
			for (const key of ['name', 'rect', 'components']) {
				if (key in patch) node[key] = patch[key]
			}
			if ('children' in patch) {
				if (!Array.isArray(patch.children)) return { ok: false, error: 'patch.children 必须是数组', impl: IMPL }
				const incoming = { children: patch.children }
				inheritNodeIds({ children: node.children }, incoming)
				node.children = incoming.children
			}
			const rectErrors = validateNodeTreeRects(record.dsl.root)
			if (rectErrors.length > 0) return { ok: false, error: `rect 校验失败: ${rectErrors.join('; ')}`, impl: IMPL }
			record.workspace.defaultCanvasId = record.entry.id
			const version = await persistCanvas(record.workspace, record.entry, record.dsl)
			return { ok: true, canvasId: record.entry.id, uiName: record.entry.uiName, nodeId: node.nodeId, version, impl: IMPL }
		} catch (error) {
			return { ok: false, error: String(error.message ?? error), impl: IMPL }
		}
	})
}

const RECT_ANCHORS = new Set([
	'center',
	'topLeft',
	'topCenter',
	'topRight',
	'middleLeft',
	'middleRight',
	'bottomLeft',
	'bottomCenter',
	'bottomRight',
	'topStretch',
	'bottomStretch',
	'leftStretch',
	'rightStretch',
	'stretch',
	'custom'
])

function validVector(value, minLength) {
	return Array.isArray(value) && value.length >= minLength && value.slice(0, minLength).every(finiteNumber)
}

function validateRect(rect) {
	if (typeof rect !== 'object' || rect === null || Array.isArray(rect)) return 'rect 必须是对象'
	const anchor = typeof rect.anchor === 'string' ? rect.anchor : 'center'
	if (!RECT_ANCHORS.has(anchor)) return `不支持的 anchor: ${anchor}`
	if (rect.size !== undefined && !validVector(rect.size, 2)) return 'rect.size 必须包含两个有限数字'
	if (rect.offset !== undefined && !validVector(rect.offset, anchor === 'stretch' ? 4 : 2)) return 'rect.offset 格式无效'
	for (const key of ['anchorMin', 'anchorMax', 'pivot', 'position']) {
		if (rect[key] !== undefined && !validVector(rect[key], 2)) return `rect.${key} 必须包含两个有限数字`
	}
	if (anchor === 'custom') {
		for (const key of ['anchorMin', 'anchorMax', 'pivot', 'position', 'size']) {
			if (!validVector(rect[key], 2)) return `custom rect 缺少有效的 ${key}`
		}
	}
	return null
}

function validateNodeTreeRects(root) {
	const errors = []
	function visit(node, nodePath) {
		if (!node || typeof node !== 'object') return
		if (node.rect !== undefined) {
			const rectError = validateRect(node.rect)
			if (rectError) errors.push((node.name ?? node.nodeId ?? nodePath.join('/')) + ': ' + rectError)
		}
		const children = Array.isArray(node.children) ? node.children : []
		for (let index = 0; index < children.length; index += 1) visit(children[index], nodePath.concat(index))
	}
	visit(root, [])
	return errors
}

function nodeAtIndexPath(root, nodePath) {
	let node = root
	for (const index of nodePath) {
		if (!Number.isSafeInteger(index) || index < 0 || !Array.isArray(node?.children) || index >= node.children.length) return undefined
		node = node.children[index]
	}
	return node
}

function nodeBreadcrumb(root, nodePath) {
	const names = [String(root?.name ?? 'Root')]
	let node = root
	for (const index of nodePath) {
		if (!Number.isSafeInteger(index) || index < 0 || !Array.isArray(node?.children) || index >= node.children.length) return undefined
		node = node.children[index]
		names.push(String(node?.name ?? '未命名节点'))
	}
	return names
}

function resolveNodeReference(root, nodeId, nodePath) {
	if (nodeId !== undefined && nodeId !== null && nodeId !== '') {
		const requiredId = requireNodeId(nodeId)
		const located = findNodeById(root, requiredId)
		if (!located) throw new Error(`未找到 nodeId: ${requiredId}`)
		return { ...located, nodeId: requiredId }
	}
	if (!Array.isArray(nodePath) || nodePath.length > 128 || !nodePath.every((index) => Number.isSafeInteger(index) && index >= 0)) {
		throw new Error('nodePath 参数无效')
	}
	const node = nodeAtIndexPath(root, nodePath)
	const breadcrumb = nodeBreadcrumb(root, nodePath)
	if (!node || !breadcrumb) throw new Error('目标节点路径已失效')
	return { node, nodeId: requireNodeId(node.nodeId), nodePath: [...nodePath], breadcrumb }
}

function renderTargetSnapshot(target, capturedAt) {
	const snapshot = {
		canvasId: target.canvasId,
		uiName: target.uiName,
		canvasVersion: target.canvasVersion,
		targetScope: target.targetScope,
		nodeId: target.nodeId,
		nodePath: [...target.nodePath],
		breadcrumb: [...target.breadcrumb],
		targetRevision: target.clientRevision,
		capturedAt
	}
	return `\n\n<${TARGET_SNAPSHOT_TAG}>\n${JSON.stringify(snapshot)}\n</${TARGET_SNAPSHOT_TAG}>`
}

function safePathSegment(value, fallback) {
	const safe = String(value ?? '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 96)
	return safe || fallback
}

function imageInfo(buffer) {
	if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
		return { extension: '.png', contentType: 'image/png' }
	}
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return { extension: '.jpg', contentType: 'image/jpeg' }
	}
	return null
}

function spriteFolderName(dsl) {
	return requireUiName(dsl)
}

function validateSpritePath(spritePath, dsl) {
	if (typeof spritePath !== 'string') return false
	const prefix = `Assets/Sprites/${spriteFolderName(dsl)}/`
	if (!spritePath.startsWith(prefix)) return false
	const fileName = spritePath.slice(prefix.length)
	return fileName !== '' && basename(fileName) === fileName && /^[A-Za-z0-9._-]+\.(png|jpg)$/i.test(fileName)
}

function collectSpritePaths(node, output) {
	if (!node || typeof node !== 'object') return
	if (Array.isArray(node.components)) {
		for (const component of node.components) {
			if (component?.type === 'Image' && typeof component.spritePath === 'string') output.add(component.spritePath)
		}
	}
	if (Array.isArray(node.children)) {
		for (const child of node.children) collectSpritePaths(child, output)
	}
}

// Unity Assets import boundary: call only from executeBuild after an explicit user build action or a declared build test.
async function stageImagesForBuild(canvasId) {
	const record = await readCanvasRecord(canvasId)
	const folderName = spriteFolderName(record.dsl)
	const spritePaths = new Set()
	collectSpritePaths(record.dsl.root, spritePaths)
	let copied = 0
	for (const spritePath of spritePaths) {
		if (!validateSpritePath(spritePath, record.dsl)) throw new Error(`非法 spritePath: ${spritePath}`)
		const fileName = basename(spritePath)
		const sourcePath = join(ASSET_STAGE_DIR, folderName, fileName)
		const destinationPath = join(PROJECT, 'Assets', 'Sprites', folderName, fileName)
		await mkdir(dirname(destinationPath), { recursive: true })
		try {
			await readFile(destinationPath)
			continue
		} catch (error) {
			if (error?.code !== 'ENOENT') throw error
		}
		const temporaryPath = `${destinationPath}.dsh-${process.pid}-${Date.now()}.tmp`
		try {
			await copyFile(sourcePath, temporaryPath)
			await rename(temporaryPath, destinationPath)
			copied += 1
		} catch (error) {
			if (error?.code === 'ENOENT') throw new Error(`找不到图片暂存文件: ${fileName}`)
			throw error
		}
	}
	return { record, copied, spriteCount: spritePaths.size }
}

async function writeFileAtomic(destinationPath, content) {
	const temporaryPath = `${destinationPath}.dsh-${process.pid}-${Date.now()}.tmp`
	await writeFile(temporaryPath, content, 'utf8')
	await rename(temporaryPath, destinationPath)
}

// 若 Canvas 存在 <canvasId>.view.cs，则把它（及可选的 testdata.cs / bindings.json）导入
// Assets/Scripts/UserInterface/Generated/。view.cs 是生成物的唯一事实源，每次都整体覆盖；
// 是否保持 C# 与预览器 logic.js 行为一致由模型在会话内核对。
async function stageLogicScriptsForBuild(canvasId, uiName) {
	let viewSource = null
	try {
		viewSource = await readFile(canvasViewScriptPath(canvasId), 'utf8')
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error
	}
	if (viewSource === null) return { staged: false, files: [] }
	const classError = viewScriptClassError(viewSource, uiName)
	if (classError !== null) throw new Error(`view.cs 无效: ${classError}`)

	let bindings = {}
	try {
		bindings = JSON.parse(await readFile(canvasBindingsPath(canvasId), 'utf8'))
	} catch (error) {
		if (error?.code !== 'ENOENT') throw new Error(`bindings.json 解析失败: ${String(error.message ?? error)}`)
	}
	const bindingsError = validateViewBindings(bindings)
	if (bindingsError !== null) throw new Error(bindingsError)

	await mkdir(GENERATED_SCRIPT_DIR, { recursive: true })
	const files = []
	let changed = false
	const viewDestination = join(GENERATED_SCRIPT_DIR, `${uiName}.cs`)
	if (await fileContentDiffers(viewDestination, viewSource)) {
		await writeFileAtomic(viewDestination, viewSource)
		changed = true
	}
	files.push(`Assets/Scripts/UserInterface/Generated/${uiName}.cs`)

	let testDataSource = null
	try {
		testDataSource = await readFile(canvasTestDataScriptPath(canvasId), 'utf8')
	} catch (error) {
		if (error?.code !== 'ENOENT') throw error
	}
	if (testDataSource !== null) {
		const testDataError = viewScriptClassError(testDataSource, uiName)
		if (testDataError !== null) throw new Error(`testdata.cs 无效: ${testDataError}`)
		const testDataDestination = join(GENERATED_SCRIPT_DIR, `${uiName}.TestData.cs`)
		if (await fileContentDiffers(testDataDestination, testDataSource)) {
			await writeFileAtomic(testDataDestination, testDataSource)
			changed = true
		}
		files.push(`Assets/Scripts/UserInterface/Generated/${uiName}.TestData.cs`)
	}
	return { staged: true, files, changed, bindingsPath: canvasBindingsPath(canvasId), bindings }
}

async function fileContentDiffers(path, content) {
	try {
		return (await readFile(path, 'utf8')) !== content
	} catch (error) {
		if (error?.code === 'ENOENT') return true
		throw error
	}
}

async function fileMtimeMs(path) {
	try {
		return (await stat(path)).mtimeMs
	} catch (error) {
		if (error?.code === 'ENOENT') return null
		throw error
	}
}

// 构建前的逻辑同步闸门：预览器 logic.js 是交互行为基准，它若比 view.cs 新（或画布有
// 预览逻辑却根本没有 view.cs），说明交互需求可能还没同步进 Unity 侧脚本，必须先由
// 模型语义核对/修正，再以 logicReviewed:true 确认构建。纯机械 mtime 触发，判断在模型。
export function needsLogicSyncReview({ logicMtimeMs: logic, viewMtimeMs: view }) {
	if (logic === null) return false
	if (view === null) return true
	return logic > view
}

// 脚本导入后等待 Unity 真正完成编译：轮询 editor status 与目标程序集 dll 的重建时间，
// 避免“目录监控尚未触发编译、wait-ready 提前放行”的竞态；新增 Console 错误作为失败返回。
async function awaitEditorScriptCompile(baselinePath, stagedAt) {
	const assemblyPath = ASSEMBLY_DLL
	const deadline = Date.now() + 180000
	for (;;) {
		const status = await run([UNITY_CLI, '--project', PROJECT, 'status'], 30000)
		let state = null
		try { state = JSON.parse(status.stdout) } catch {}
		const settled = state !== null && state.status === 'ready' && state.compiling === false && state.domainReloadInProgress === false
		let rebuilt = false
		try {
			rebuilt = (await stat(assemblyPath)).mtimeMs >= stagedAt - 1000
		} catch {}
		if (settled && rebuilt) break
		if (Date.now() > deadline) {
			return { ok: false, stage: 'compile', error: '等待 Unity 编译超时（180s）：脚本可能未被编辑器检测到', impl: IMPL }
		}
		await new Promise((resolve) => setTimeout(resolve, 1500))
	}
	const diff = await run([UNITY_CLI, '--project', PROJECT, 'errors', '--diff', baselinePath, '--limit', '50'], 30000)
	if (diff.code === 0) {
		try {
			const value = JSON.parse(diff.stdout)
			const entries = Array.isArray(value) ? value : (Array.isArray(value?.errors) ? value.errors : (Array.isArray(value?.logs) ? value.logs : []))
			if (entries.length > 0) {
				return { ok: false, stage: 'compile', error: '脚本编译产生新的 Console 错误', consoleErrors: diff.stdout.slice(-3000), impl: IMPL }
			}
		} catch {}
	}
	return { ok: true }
}

async function executeEditorPatch(args) {
	return enqueueMutation(async () => {
		try {
			const record = await readCanvasRecordUnlocked(requestedCanvasId(args))
			const expectedVersion = args?.expectedVersion
			if (Number.isSafeInteger(expectedVersion) && expectedVersion !== record.entry.version) {
				return {
					ok: false,
					error: 'version-conflict',
					canvasId: record.entry.id,
					currentVersion: record.entry.version,
					impl: IMPL
				}
			}

			let editedNodeId = null
			if (args?.kind === 'node-rect') {
				const rectError = validateRect(args?.rect)
				if (rectError !== null) return { ok: false, error: rectError, impl: IMPL }
				const target = resolveNodeReference(record.dsl.root, args?.nodeId, args?.nodePath)
				target.node.rect = args.rect
				editedNodeId = target.nodeId
			} else if (args?.kind === 'node-image') {
				if (!validateSpritePath(args?.spritePath, record.dsl)) {
					return { ok: false, error: 'spritePath 参数无效', impl: IMPL }
				}
				const target = resolveNodeReference(record.dsl.root, args?.nodeId, args?.nodePath)
				const image = Array.isArray(target.node.components)
					? target.node.components.find((component) => component?.type === 'Image')
					: undefined
				if (!image) return { ok: false, error: '目标节点没有 Image 组件，不能绑定图片', impl: IMPL }
				image.color = '#FFFFFFFF'
				image.spritePath = args.spritePath
				image.preserveAspect = true
				if (typeof args?.sourceName === 'string' && args.sourceName !== '') image.sourceName = args.sourceName.slice(0, 160)
				editedNodeId = target.nodeId
			} else if (args?.kind === 'canvas') {
				const resolution = args?.referenceResolution
				if (!validVector(resolution, 2) || resolution[0] <= 0 || resolution[1] <= 0) {
					return { ok: false, error: 'referenceResolution 必须包含两个正数', impl: IMPL }
				}
				record.dsl.canvas = typeof record.dsl.canvas === 'object' && record.dsl.canvas !== null ? record.dsl.canvas : {}
				record.dsl.canvas.referenceResolution = [Math.round(resolution[0]), Math.round(resolution[1])]
			} else {
				return { ok: false, error: '不支持的编辑操作', impl: IMPL }
			}

			record.workspace.defaultCanvasId = record.entry.id
			const version = await persistCanvas(record.workspace, record.entry, record.dsl)
			const nodeCount = ensureNodeIds(record.entry.id, record.dsl.root).count
			return {
				ok: true,
				canvasId: record.entry.id,
				uiName: record.entry.uiName,
				dsl: record.dsl,
				version,
				workspace: publicWorkspace(record.workspace, new Map([[record.entry.id, { nodeCount }]])),
				impl: IMPL,
				...(editedNodeId ? { nodeId: editedNodeId } : {}),
				...(args?.kind === 'node-image' ? { imageStaged: true, unityImported: false, buildPolicy: BUILD_POLICY } : {})
			}
		} catch (error) {
			return { ok: false, error: String(error.message ?? error), impl: IMPL }
		}
	})
}

async function runUnityJob(action, inputs) {
	const prepared = await run(
		[
			'python3', UNITY_JOB, 'prepare',
			'--project', PROJECT,
			'--source', WORKER_PATH,
			'--entry-type', 'UguiJobs.BuildUiWorker',
			'--entry-method', 'Run',
			'--action', action,
			...inputs
		],
		60000
	)
	if (prepared.code !== 0) {
		return { ok: false, stage: 'prepare', error: prepared.stderr.slice(-1500) || prepared.stdout.slice(-1500) }
	}
	const { jobId } = parseJson(prepared.stdout, 'unity-job prepare')
	const submitted = await run(
		[
			'python3', UNITY_JOB, 'submit',
			'--project', PROJECT,
			'--job', jobId,
			'--confirm',
			'--timeout', '240'
		],
		300000
	)
	const submission = parseJson(submitted.stdout, 'unity-job submit')
	return { ok: true, jobId, exitCode: submitted.code, result: submission.result ?? null }
}

async function executeBuild(args) {
	const unavailable = configUnavailable()
	if (unavailable !== null) return unavailable
	try {
		const assets = await stageImagesForBuild(requestedCanvasId(args))
		const canvasId = assets.record.entry.id
		const uiName = assets.record.dsl.name
		const dslPath = canvasFilePath(canvasId)

		// 逻辑同步闸门：logic.js 比 view.cs 新（或有预览逻辑却无 view.cs）时，先拦下让模型核对
		if (args?.logicReviewed !== true) {
			const logicMtimeMs = await fileMtimeMs(canvasLogicPath(canvasId))
			const viewMtimeMs = await fileMtimeMs(canvasViewScriptPath(canvasId))
			if (needsLogicSyncReview({ logicMtimeMs, viewMtimeMs })) {
				return {
					ok: false,
					stage: 'logic-sync',
					impl: IMPL,
					canvasId,
					uiName,
					error: viewMtimeMs === null
						? '画布有预览逻辑 logic.js，但没有 view.cs：prefab 将不含任何交互逻辑。处理流程：先把 .scratch/ui-dsl/canvases/<canvasId>.sync.json 写为 {"state":"reviewing","startedAt":<epochMs>}（界面上会显示「子代理核对中」），再派发一个子代理，以 logic.js 为行为基准、对照 DSL，编写 view.cs/testdata.cs/bindings.json 三件套（partial 测试数据 seam、序列化引用、项目 C# 规范），完成后把 sync.json 更新为 {"state":"synced","finishedAt":<epochMs>,"summary":"<改动摘要>"}；若确认本画布不需要 Unity 侧逻辑，以 logicReviewed:true 重新构建。'
						: 'logic.js 比 view.cs 新：交互需求可能尚未同步进 Unity 侧脚本。处理流程：先把 .scratch/ui-dsl/canvases/<canvasId>.sync.json 写为 {"state":"reviewing","startedAt":<epochMs>}（界面上会显示「子代理核对中」），再派发一个子代理，以 logic.js 为行为基准语义核对 view.cs/testdata.cs/bindings.json（不一致就修正 C#，保持 项目 C# 规范与 partial 测试数据 seam），完成后把 sync.json 更新为 {"state":"synced","finishedAt":<epochMs>,"summary":"<改动摘要>"}，再以 logicReviewed:true 重新构建。',
					logicMtimeMs,
					viewMtimeMs
				}
			}
		}

		const baselinePath = join(DSL_DIR, `.console-baseline-${process.pid}-${Date.now()}.json`)
		await run([UNITY_CLI, '--project', PROJECT, 'errors', '--snapshot', baselinePath, '--limit', '100'], 30000)
		const stagedAt = Date.now()
		const logic = await stageLogicScriptsForBuild(canvasId, uiName)
		if (logic.staged && logic.changed) {
			// 目录监控可能迟迟不发现新脚本：先用一个 refresh job 主动触发 AssetDatabase.Refresh，
			// 该 job 在编译（domain reload）开始前就已返回，随后再等编译完成
			const refresh = await runUnityJob('refresh_scripts', [])
			if (!refresh.ok) {
				await unlink(baselinePath).catch(() => {})
				return { ...refresh, canvasId, uiName, impl: IMPL }
			}
			const compile = await awaitEditorScriptCompile(baselinePath, stagedAt)
			if (!compile.ok) {
				await unlink(baselinePath).catch(() => {})
				return { ...compile, canvasId, uiName }
			}
		}
		await unlink(baselinePath).catch(() => {})

		const inputs = ['--input', `dsl=${dslPath}`]
		// unity-job 的 --input 只接受文件：prefabDir 与可选的 view 配置打成一份 job 配置传入
		const jobConfigPath = join(DSL_DIR, `.job-config-${process.pid}-${Date.now()}.json`)
		const jobConfig = { prefabDir: PREFAB_DIR }
		if (logic.staged) jobConfig.view = { type: uiName, bindings: logic.bindings }
		await writeFile(jobConfigPath, JSON.stringify(jobConfig), 'utf8')
		inputs.push('--input', `jobcfg=${jobConfigPath}`)
		const build = await runUnityJob('build_ui_from_dsl', inputs)
		await unlink(jobConfigPath).catch(() => {})
		if (!build.ok) return { ...build, canvasId, uiName, impl: IMPL }
		const { jobId, result } = build
		const submitted = { code: build.exitCode }

		let screenshot = null
		try {
			const shot = await run([UNITY_CLI, '--project', PROJECT, 'run', 'screenshot'], 90000)
			screenshot = shot.code === 0 ? parseJson(shot.stdout, 'screenshot') : { error: shot.stderr.slice(-500) }
		} catch (error) {
			screenshot = { error: String(error.message ?? error).slice(0, 300) }
		}

		return {
			ok: Boolean(result && result.success === true),
			impl: IMPL,
			canvasId,
			uiName,
			jobId,
			exitCode: submitted.code,
			unityImported: true,
			buildPolicy: BUILD_POLICY,
			assets: { copied: assets.copied, spriteCount: assets.spriteCount },
			viewScript: { staged: logic.staged, files: logic.files },
			result,
			screenshot
		}
	} catch (error) {
		return { ok: false, error: String(error.message ?? error), impl: IMPL }
	}
}

async function executeSetup() {
	const unavailable = configUnavailable()
	if (unavailable !== null) return unavailable
	try {
		const job = await runUnityJob('setup_workbench', [])
		if (!job.ok) return { ...job, impl: IMPL }
		const result = job.result
		return {
			ok: Boolean(result && result.success === true),
			impl: IMPL,
			jobId: job.jobId,
			result
		}
	} catch (error) {
		return { ok: false, error: String(error.message ?? error), impl: IMPL }
	}
}

async function executeInteractionSemantics(args) {
	const unavailable = configUnavailable()
	if (unavailable !== null) return unavailable
	try {
		const component = typeof args?.component === 'string' ? args.component.trim() : ''
		const doc = await readFile(SEMANTICS_DOC_PATH, 'utf8')
		const pinMatch = doc.match(/uGUI pin\*\*:\s*`(com\.unity\.ugui@[0-9a-f]+)`/)
		const pin = pinMatch ? pinMatch[1] : null
		let actual = null
		try {
			const entries = await readdir(join(PROJECT, 'Library', 'PackageCache'))
			actual = entries.find((entry) => entry.startsWith('com.unity.ugui@')) ?? null
		} catch {}
		const sections = doc.split(/^## /m).slice(1)
		const titles = sections.map((section) => section.split('\n', 1)[0].trim())
		const wanted = component.toLowerCase()
		const matched = sections.find((section) =>
			section.split('\n', 1)[0].trim().toLowerCase().split(/[\s/（）()]+/).includes(wanted)
		) ?? sections.find((section) => section.split('\n', 1)[0].trim().toLowerCase().includes(wanted))
		const fresh = pin !== null && actual !== null && pin === actual
		return {
			ok: true,
			impl: IMPL,
			component,
			fresh,
			pin,
			actual,
			...(matched ? { section: '## ' + matched.trim() } : { section: null, availableSections: titles }),
			...(!fresh ? {
				rederive: `文档已过期（pin ${pin} != 实际 ${actual}）：请阅读 ${join(PROJECT, 'Library', 'PackageCache', String(actual), 'Runtime', 'UGUI', 'UI', 'Core')} 下对应组件源码（只读目标文件/函数），更新 ${SEMANTICS_DOC_PATH} 的「${component}」小节并把 pin 改为 ${actual}`
			} : {})
		}
	} catch (error) {
		return { ok: false, error: String(error.message ?? error), impl: IMPL }
	}
}

async function executeScreenshot(args) {
	try {
		const view = typeof args?.view === 'string' && args.view !== '' ? args.view : 'game'
		const shot = await run([UNITY_CLI, '--project', PROJECT, 'run', 'screenshot', '--view', view], 90000)
		if (shot.code !== 0) {
			return { ok: false, error: shot.stderr.slice(-1500) || shot.stdout.slice(-1500), impl: IMPL }
		}
		const value = parseJson(shot.stdout, 'screenshot')
		return { ...value, ok: true, impl: IMPL }
	} catch (error) {
		return { ok: false, error: String(error.message ?? error), impl: IMPL }
	}
}

// Ensure the registries, browser bridge, and live session lookup exist before applying.
export const inject = ['tools', 'webServer', 'sessions']

export function apply(ctx) {
	const webServer = ctx.get('webServer')
	const sessions = ctx.get('sessions')
	if (webServer === undefined) throw new Error('ugui-tools: no web server capability on ctx')
	if (sessions === undefined) throw new Error('ugui-tools: no session registry capability on ctx')

	const editorTargets = new Map()
	const editorTargetClocks = new Map()
	const messageTargetSnapshots = new Map()

	function requireExistingSession(sessionId) {
		if (typeof sessionId !== 'string' || sessionId === '' || sessionId.length > 256) throw new Error('sessionId 参数无效')
		const session = sessions.get(sessionId)
		if (!session) throw new Error(`Session 不存在或未运行: ${sessionId}`)
		// Preset selection is an agent-preset/selected projection and is not authoritative on the immutable creation header.
		// The browser Slot only syncs ugui summaries, and scoped agent events restrict snapshot injection to this preset.
		return session
	}

	async function synchronizeEditorTarget(body) {
		const sessionId = String(body?.sessionId ?? '')
		requireExistingSession(sessionId)
		const clientInstanceId = String(body?.clientInstanceId ?? '')
		if (!/^[A-Za-z0-9_-]{8,128}$/.test(clientInstanceId)) throw new Error('clientInstanceId 参数无效')
		const clientRevision = body?.clientRevision
		if (!Number.isSafeInteger(clientRevision) || clientRevision <= 0) throw new Error('clientRevision 必须是正整数')
		const clock = editorTargetClocks.get(sessionId)
		if (clock && clock.clientInstanceId === clientInstanceId && clock.clientRevision > clientRevision) {
			return { ok: true, accepted: false, target: editorTargets.get(sessionId) ?? null, impl: IMPL }
		}
		const nextClock = Object.freeze({ clientInstanceId, clientRevision })
		if (body?.clear === true) {
			editorTargetClocks.set(sessionId, nextClock)
			editorTargets.delete(sessionId)
			return { ok: true, accepted: true, target: null, impl: IMPL }
		}
		const record = await readCanvasRecord(requestedCanvasId(body))
		if (!Number.isSafeInteger(body?.canvasVersion) || body.canvasVersion !== record.entry.version) {
			return {
				ok: false,
				error: 'version-conflict',
				canvasId: record.entry.id,
				currentVersion: record.entry.version,
				impl: IMPL
			}
		}
		const located = resolveNodeReference(record.dsl.root, body?.nodeId, body?.nodePath)
		const target = Object.freeze({
			sessionId,
			clientInstanceId,
			clientRevision,
			canvasId: record.entry.id,
			uiName: record.entry.uiName,
			canvasVersion: record.entry.version,
			targetScope: located.nodePath.length === 0 ? 'canvas' : 'node',
			nodeId: located.nodeId,
			nodePath: Object.freeze([...located.nodePath]),
			breadcrumb: Object.freeze([...located.breadcrumb]),
			syncedAt: Date.now()
		})
		editorTargetClocks.set(sessionId, nextClock)
		editorTargets.set(sessionId, target)
		return { ok: true, accepted: true, target, impl: IMPL }
	}

	async function handleEditorContext(req, res) {
		try {
			if (req.method === 'GET') {
				const url = new URL(req.url ?? '/', 'http://localhost')
				const sessionId = url.searchParams.get('sessionId') || ''
				requireExistingSession(sessionId)
				return sendJson(res, 200, { ok: true, target: editorTargets.get(sessionId) ?? null, impl: IMPL })
			}
			if (req.method === 'POST') {
				const result = await synchronizeEditorTarget(await readRequestJson(req, 32 * 1024))
				const status = result.ok ? 200 : result.error === 'version-conflict' ? 409 : 400
				return sendJson(res, status, result)
			}
			return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
		} catch (error) {
			return sendJson(res, 400, { ok: false, error: String(error?.message ?? error), impl: IMPL })
		}
	}

	ctx.on('agent/inbox/inserted', ({ agent, message }) => {
		if (message?.source?.kind !== 'user') return
		const sessionId = String(agent.id)
		const target = editorTargets.get(sessionId)
		if (!target) return
		messageTargetSnapshots.set(String(message.id), Object.freeze({ sessionId, target, capturedAt: Date.now() }))
		while (messageTargetSnapshots.size > 512) messageTargetSnapshots.delete(messageTargetSnapshots.keys().next().value)
	})

	ctx.on('agent/pre-step', async ({ agent }, next) => {
		const decision = await next()
		if (decision.kind === 'reject') return decision
		let changed = false
		const messages = decision.messages.map((message) => {
			const snapshot = messageTargetSnapshots.get(String(message.id))
			if (!snapshot || snapshot.sessionId !== String(agent.id)) return message
			if (message.content.some((block) => block?.type === 'text' && String(block.text ?? '').includes(`<${TARGET_SNAPSHOT_TAG}>`))) return message
			changed = true
			return Object.freeze({
				...message,
				content: Object.freeze([
					...message.content,
					Object.freeze({ type: 'text', text: renderTargetSnapshot(snapshot.target, snapshot.capturedAt) })
				])
			})
		})
		return changed ? { kind: 'enter', messages } : decision
	})

	ctx.on('agent/disposed', ({ agent }) => {
		const sessionId = String(agent.id)
		editorTargets.delete(sessionId)
		editorTargetClocks.delete(sessionId)
		for (const [messageId, snapshot] of messageTargetSnapshots) {
			if (snapshot.sessionId === sessionId) messageTargetSnapshots.delete(messageId)
		}
	})

	async function handleWorkspace(req, res) {
		if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
		const result = await executeGetWorkspace()
		return sendJson(res, result.ok ? 200 : 500, result)
	}

	async function handleDsl(req, res) {
		const unavailable = configUnavailable()
		if (unavailable !== null) return sendJson(res, 503, unavailable)
		try {
			if (req.method === 'GET') {
				const url = new URL(req.url ?? '/', 'http://localhost')
				const result = await executeGetDsl({ canvasId: url.searchParams.get('canvasId') || undefined })
				return sendJson(res, result.ok ? 200 : 404, result)
			}
			if (req.method === 'PATCH') {
				const result = await executeEditorPatch(await readRequestJson(req))
				const status = result.ok ? 200 : result.error === 'version-conflict' ? 409 : 400
				return sendJson(res, status, result)
			}
			return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
		} catch (error) {
			return sendJson(res, 500, {
				ok: false,
				error: 'request-failed',
				message: String(error?.message ?? error),
				impl: IMPL
			})
		}
	}

	async function handleSync(req, res) {
		const unavailable = configUnavailable()
		if (unavailable !== null) return sendJson(res, 503, unavailable)
		try {
			if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
			const url = new URL(req.url ?? '/', 'http://localhost')
			const canvasId = url.searchParams.get('canvasId') || ''
			if (canvasId === '') return sendJson(res, 400, { ok: false, error: 'canvasId 缺失', impl: IMPL })
			const logicMtimeMs = await fileMtimeMs(canvasLogicPath(canvasId))
			const viewMtimeMs = await fileMtimeMs(canvasViewScriptPath(canvasId))
			let review = null
			try {
				review = JSON.parse(await readFile(canvasSyncPath(canvasId), 'utf8'))
			} catch (error) {
				if (error?.code !== 'ENOENT') review = { state: 'invalid', error: String(error?.message ?? error) }
			}
			return sendJson(res, 200, {
				ok: true,
				impl: IMPL,
				canvasId,
				needsReview: needsLogicSyncReview({ logicMtimeMs, viewMtimeMs }),
				logicMtimeMs,
				viewMtimeMs,
				review
			})
		} catch (error) {
			return sendJson(res, 500, { ok: false, error: 'request-failed', message: String(error?.message ?? error), impl: IMPL })
		}
	}

	async function handleLogic(req, res) {
		const unavailable = configUnavailable()
		if (unavailable !== null) return sendJson(res, 503, unavailable)
		try {
			if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
			const url = new URL(req.url ?? '/', 'http://localhost')
			const canvasId = url.searchParams.get('canvasId') || ''
			if (canvasId === '') return sendJson(res, 400, { ok: false, error: 'canvasId 缺失', impl: IMPL })
			const logicPath = canvasLogicPath(canvasId)
			try {
				const source = await readFile(logicPath, 'utf8')
				return sendJson(res, 200, { ok: true, impl: IMPL, canvasId, source })
			} catch (error) {
				if (error?.code !== 'ENOENT') throw error
				return sendJson(res, 200, { ok: true, impl: IMPL, canvasId, source: '' })
			}
		} catch (error) {
			return sendJson(res, 500, {
				ok: false,
				error: 'request-failed',
				message: String(error?.message ?? error),
				impl: IMPL
			})
		}
	}

	async function handleAsset(req, res) {
		try {
			const url = new URL(req.url ?? '/', 'http://localhost')
			const spritePathQuery = url.searchParams.get('spritePath') || ''
			let canvasId = url.searchParams.get('canvasId') || null
			if (canvasId === null && spritePathQuery !== '') {
				const workspace = await readWorkspace()
				const match = workspace.canvases.find((entry) => spritePathQuery.startsWith(`Assets/Sprites/${entry.uiName}/`))
				if (match) canvasId = match.id
			}
			const record = await readCanvasRecord(canvasId)
			const dsl = record.dsl
			if (req.method === 'POST') {
				const body = await readRequestBuffer(req, 20 * 1024 * 1024)
				const info = imageInfo(body)
				if (!info) return sendJson(res, 400, { ok: false, error: '仅支持 PNG/JPG 图片', impl: IMPL })
				const originalName = url.searchParams.get('name') || `image${info.extension}`
				const originalBase = basename(originalName).replace(/\.[^.]*$/, '')
				const stem = safePathSegment(originalBase, 'image')
				const digest = createHash('sha256').update(body).digest('hex').slice(0, 10)
				const fileName = `${stem}-${digest}${info.extension}`
				const folderName = spriteFolderName(dsl)
				const stagePath = join(ASSET_STAGE_DIR, folderName, fileName)
				await mkdir(dirname(stagePath), { recursive: true })
				await writeFile(stagePath, body)
				const spritePath = `Assets/Sprites/${folderName}/${fileName}`
				return sendJson(res, 200, {
					ok: true,
					impl: IMPL,
					canvasId: record.entry.id,
					uiName: record.entry.uiName,
					asset: {
						fileName,
						sourceName: basename(originalName).slice(0, 160),
						spritePath,
						previewUrl: `/local/ugui-asset?canvasId=${encodeURIComponent(record.entry.id)}&spritePath=${encodeURIComponent(spritePath)}`,
						bytes: body.length,
						staged: true,
						unityImported: false
					}
				})
			}
			if (req.method === 'GET') {
				const spritePath = url.searchParams.get('spritePath') || ''
				if (!validateSpritePath(spritePath, dsl)) return sendJson(res, 400, { ok: false, error: 'spritePath 参数无效', impl: IMPL })
				const folderName = spriteFolderName(dsl)
				const fileName = basename(spritePath)
				let body
				try {
					body = await readFile(join(ASSET_STAGE_DIR, folderName, fileName))
				} catch (error) {
					if (error?.code !== 'ENOENT') throw error
					body = await readFile(join(PROJECT, 'Assets', 'Sprites', folderName, fileName))
				}
				const info = imageInfo(body)
				if (!info) return sendJson(res, 415, { ok: false, error: '图片格式无效', impl: IMPL })
				return sendBuffer(res, 200, body, info.contentType)
			}
			return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
		} catch (error) {
			const message = String(error?.message ?? error)
			return sendJson(res, message === '请求体过大' ? 413 : 500, { ok: false, error: message, impl: IMPL })
		}
	}

	let browserBuild = null
	async function handleBuild(req, res) {
		const unavailable = configUnavailable()
		if (unavailable !== null) return sendJson(res, 503, unavailable)
		if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method-not-allowed', impl: IMPL })
		if (browserBuild !== null) return sendJson(res, 409, { ok: false, error: 'build-in-progress', impl: IMPL })
		const url = new URL(req.url ?? '/', 'http://localhost')
		browserBuild = executeBuild({ canvasId: url.searchParams.get('canvasId') || undefined })
		try {
			const result = await browserBuild
			return sendJson(res, result.ok ? 200 : 500, result)
		} catch (error) {
			return sendJson(res, 500, { ok: false, error: String(error?.message ?? error), impl: IMPL })
		} finally {
			browserBuild = null
		}
	}

	const canvasIdProperty = {
		type: 'string',
		description: 'Workspace 中稳定的 Canvas ID；先用 ugui_list_canvases 获取。省略时兼容性地使用 defaultCanvasId。'
	}
	const nodeIdProperty = {
		type: 'string',
		description: 'DSL 节点的稳定 nodeId。读取 DSL 后优先使用；节点改名或重排后仍指向同一节点。'
	}
	const tools = [
		{
			name: 'ugui_get_editor_context',
			description: '读取当前 uGUI Session 在浏览器中已同步的 Canvas/节点目标。直接人类消息会在进入 inbox 时自动固定该目标快照；此工具返回的是此刻的实时目标，不替代消息上已附带的快照。',
			parameters: { type: 'object', properties: {}, additionalProperties: false },
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (_args, exec) => {
				const sessionId = exec?.agent?.id === undefined ? '' : String(exec.agent.id)
				return { ok: sessionId !== '', target: sessionId === '' ? null : (editorTargets.get(sessionId) ?? null), impl: IMPL }
			}
		},
		{
			name: 'ugui_list_canvases',
			description: '列出 uGUI Workspace 中全部 Canvas 文档、各自版本号、实时节点数量与 defaultCanvasId。修改前先调用此工具确定 canvasId，不要根据最后修改的文件猜测目标。',
			parameters: { type: 'object', properties: {}, additionalProperties: false },
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: () => executeGetWorkspace()
		},
		{
			name: 'ugui_component_contract',
			description: '读取当前 uGUI DSL 支持的全部 Unity 组件、字段、枚举、默认值和节点引用规则。首次使用组件或新增引用型组件前必须调用；显式引用使用稳定 nodeId，省略时才按标准子节点名称回退。',
			parameters: { type: 'object', properties: {}, additionalProperties: false },
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: () => ({ ok: true, contract: COMPONENT_CONTRACT, impl: IMPL })
		},
		{
			name: 'ugui_get_dsl',
			description: '按 canvasId 获取一个 uGUI Canvas 文档的完整 DSL、稳定 nodeId 与独立版本号。省略 canvasId 时读取 Workspace 的 defaultCanvasId，仅用于兼容旧流程。',
			parameters: {
				type: 'object',
				properties: { canvasId: canvasIdProperty },
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executeGetDsl(args)
		},
		{
			name: 'ugui_visual_acceptance_check',
			description: '在交付任何新建或修改的 uGUI 画布前执行结构化视觉验收：检查字面 \\n、兄弟图形部分交叠（完全包含的层叠结构如 Toggle Background/Checkmark/Label、光效垫底、底图+文字属于正常结构，不报）、ScrollRect Viewport/Content、ToggleGroup 绑定和 LayoutGroup 子节点 LayoutElement 尺寸。ok=false 时必须修复后重新验收，不能交付。',
			parameters: {
				type: 'object',
				properties: {
					canvasId: canvasIdProperty,
					dsl: { type: 'object', description: '可选：直接验收未暂存的完整 DSL；提供时优先于 canvasId' }
				},
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executeVisualAcceptance(args)
		},
		{
			name: 'ugui_apply_dsl',
			description: '新建或整体替换一个 Workspace Canvas。首次使用组件前先调用 ugui_component_contract，并严格使用其字段、枚举与 nodeId 引用。dsl.name 即 prefab 名；root.name 必须与 dsl.name 一致。现有 nodeId 必须原样保留；真正的新节点可以省略 nodeId，Host 会先克隆工具参数，再补合法 ID，并只按显式 ID 或唯一名称继承旧 ID。传 canvasId 时只替换该 Canvas且不允许改名。此操作只暂存 DSL，不得自动调用 ugui_build。',
			parameters: {
				type: 'object',
				properties: {
					canvasId: canvasIdProperty,
					expectedVersion: { type: 'integer', description: '可选的目标 Canvas 版本锁' },
					dsl: { type: 'object', description: '完整 DSL 对象，含 dslVersion/name/canvas/root' }
				},
				required: ['dsl'],
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executeApplyDsl(args)
		},
		{
			name: 'ugui_patch_node',
			description: '按 canvasId 和稳定 nodeId 局部修改节点；首次使用组件前先调用 ugui_component_contract，并严格使用其字段、枚举与 nodeId 引用。nodeId 优先，path 仅兼容旧调用。patch 可含 name/rect/components/children（浅替换）；children 中已有节点必须保留 nodeId，真正的新节点可省略并由 Host 在克隆参数后补齐。替换 components 时必须保留已有 spritePath/preserveAspect，且不得编造不存在的 spritePath。修改前应读取目标 Canvas 版本。此操作只修改 DSL，不得自动构建 Prefab。',
			parameters: {
				type: 'object',
				properties: {
					canvasId: canvasIdProperty,
					expectedVersion: { type: 'integer', description: '可选的目标 Canvas 版本锁' },
					nodeId: nodeIdProperty,
					path: { type: 'string', description: '兼容旧调用：从根节点开始的名称路径；提供 nodeId 时可省略' },
					patch: { type: 'object', description: '可含 name/rect/components/children（浅替换）' }
				},
				required: ['patch'],
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executePatchNode(args)
		},
		{
			name: 'ugui_build',
			description: '把 canvasId 指定的 DSL 在 Unity 中构建为 uGUI prefab，并在此时才导入该 Canvas 的暂存图片。若 Canvas 存在 <canvasId>.view.cs（可配 .testdata.cs 与 .bindings.json），会先覆盖导入 Assets/Scripts/UserInterface/Generated/<dsl.name>.cs、等待编译，再把该 MonoBehaviour 挂到 prefab 根节点并按 bindings.json 绑定序列化引用；view.cs 是唯一事实源，重建即覆盖工程内同名脚本。构建前有逻辑同步闸门：logic.js 比 view.cs 新（或有 logic.js 无 view.cs）时返回 stage:logic-sync 拒绝构建，须先派发子代理以 logic.js 为行为基准核对/修正 C# 三件套，再以 logicReviewed:true 重新构建。仅当用户明确要求生成/更新 Prefab，或当前操作明确属于构建测试时才可调用；不得因 apply/patch/图片暂存而自动调用。省略 canvasId 时兼容性地使用 defaultCanvasId。',
			parameters: {
				type: 'object',
				properties: {
					canvasId: canvasIdProperty,
					logicReviewed: { type: 'boolean', description: '确认已完成 logic.js → view.cs 逻辑同步核对后跳过闸门' }
				},
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executeBuild(args)
		},
		{
			name: 'ugui_setup',
			description: '首次接入一个 Unity 工程时调用一次：在工程中创建 UIDslWorkbench 场景（PreviewCamera + UIDslCanvas + EventSystem，CanvasScaler 1080×1920）并保存到 Assets/Scenes/UIDslWorkbench.unity。ugui_build 报「未找到 UIDslCanvas」时应先调用本工具。',
			parameters: { type: 'object', properties: {}, additionalProperties: false },
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: () => executeSetup()
		},
		{
			name: 'ugui_interaction_semantics',
			description: '读取本地 uGUI 交互语义缓存文档（UNITY_SEMANTICS.md）中指定组件的小节，并自动校验文档 pin 与项目 PackageCache 实际 uGUI 版本是否一致。新增/修改预览器交互语义（Toggle/Button/Slider/Scrollbar/ScrollRect 行为、事件时序、几何公式）前必须调用；fresh=false 或 section=null 时按返回提示读本地 PackageCache 源码重核并更新文档。',
			parameters: {
				type: 'object',
				properties: {
					component: { type: 'string', description: '组件名：Selectable / Toggle / ToggleGroup / Button / Slider / Scrollbar / ScrollRect' }
				},
				required: ['component'],
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executeInteractionSemantics(args)
		},
		{
			name: 'ugui_impl_probe',
			description: 'Internal marker tool proving the persistent ugui plugin is mounted.',
			parameters: { type: 'object', properties: {} },
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: () => ({ ok: true, impl: IMPL, workspaceVersion: WORKSPACE_VERSION, canvasOverview: true, stableNodeIds: true, frozenToolInputs: true, extendedComponents: true, componentContractVersion: COMPONENT_CONTRACT.version, messageTargetSnapshots: true, buildPolicy: BUILD_POLICY })
		},
		{
			name: 'ugui_screenshot',
			description: '对 Unity Game 视图截图，返回 PNG 文件路径（用 read 工具查看图片）。用于核对 Unity 内实际渲染效果。',
			parameters: {
				type: 'object',
				properties: { view: { type: 'string', description: "game 或 scene，默认 game" } },
				additionalProperties: false
			},
			output: { schema: { type: 'object' }, render: (_a, v) => text(v) },
			execute: (args) => executeScreenshot(args)
		}
	]

	const toolsService = ctx.get('tools')
	const disposers = tools.map((definition) => {
		if (toolsService !== undefined) return toolsService.register(definition)
		if (typeof harness !== 'undefined') return harness.registerTool(ctx, harness.defineTool(definition))
		throw new Error('ugui-tools: no tool registration capability on ctx')
	})
	// Standing mount 的旧世代 host 在进程内不会被销毁：当本文件 ?v 升级、新世代与旧
	// 世代并存时，这 6 条进程级路由里已注册的路径会撞车。这里对重复注册做窄容忍
	// （仅忽略我们自家路径的 duplicate 错误），新旧世代处理器操作同一批磁盘文件、
	// 语义一致，由先注册者继续服务即可；真正的新路由（旧世代没有）仍会正常注册。
	const routeDisposers = []
	const registerRoute = (path, handler) => {
		try {
			routeDisposers.push(webServer.register({ kind: 'exact', path, handler }))
		} catch (error) {
			const message = String(error?.message ?? error)
			if (!message.includes('duplicate exact route') || !message.includes(path)) throw error
			if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn(`ugui-tools: route ${path} 已由旧世代 host 注册，本世代复用该注册`)
		}
	}
	registerRoute('/local/ugui-context', handleEditorContext)
	registerRoute('/local/ugui-workspace', handleWorkspace)
	registerRoute('/local/ugui-dsl', handleDsl)
	registerRoute('/local/ugui-asset', handleAsset)
	registerRoute('/local/ugui-build', handleBuild)
	registerRoute('/local/ugui-sync', handleSync)
	registerRoute('/local/ugui-logic', handleLogic)
	ctx.effect(
		() => () => {
			editorTargets.clear()
			editorTargetClocks.clear()
			messageTargetSnapshots.clear()
			for (const dispose of disposers) dispose()
			for (const dispose of routeDisposers) dispose()
		},
		'ugui tools, target snapshots, and browser routes'
	)
}
