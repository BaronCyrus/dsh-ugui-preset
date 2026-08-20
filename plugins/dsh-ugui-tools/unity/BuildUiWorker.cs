using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Text;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace UguiJobs
{
    /// <summary>
    /// uGUI DSL 构建 Worker：由 unity-cli 任务级 job 在内存中 Roslyn 编译执行，
    /// 不新增项目源文件、不触发 domain reload。整棵节点树在一次调用内原子构建并保存 prefab。
    /// 入口：public static void Run(string configPath)，config 字段含 dsl(冻结的 DSL 文件路径)、resultPath、action。
    /// 注意：Roslyn 编译引用全部已加载程序集，Newtonsoft.Json 与 Unity.Localization.ThirdParty.Editor
    /// 存在同名类型（CS0433）；JsonUtility 又不支持自递归 [Serializable] 类型。
    /// 因此本 Worker 内嵌一个零依赖的最小 JSON 解析器。
    /// </summary>
    public static class BuildUiWorker
    {
        private const string DefaultPrefabDir = "Assets/AddressableResources/UIPrefab";
        private static readonly Dictionary<string, Sprite> SpriteCache = new Dictionary<string, Sprite>();
        private static readonly Dictionary<string, GameObject> NodeById = new Dictionary<string, GameObject>();
        private static readonly List<PendingBinding> PendingBindings = new List<PendingBinding>();

        private sealed class PendingBinding
        {
            public GameObject Owner;
            public Component Component;
            public JValue Config;
        }

        #region 最小 JSON 解析器

        private sealed class JValue
        {
            public int Kind; // 0 null, 1 bool, 2 number, 3 string, 4 array, 5 object
            public bool Bool;
            public double Num;
            public string Str;
            public List<JValue> Arr;
            public Dictionary<string, JValue> Obj;
        }

        private sealed class JsonParser
        {
            private readonly string _s;
            private int _i;

            public JsonParser(string s)
            {
                _s = s;
                _i = 0;
            }

            public JValue Parse()
            {
                var v = ParseValue();
                SkipWs();
                return v;
            }

            private void SkipWs()
            {
                while (_i < _s.Length && char.IsWhiteSpace(_s[_i]))
                    _i++;
            }

            private char Peek()
            {
                if (_i >= _s.Length)
                    throw new FormatException("JSON 意外结束");
                return _s[_i];
            }

            private void Expect(char c)
            {
                if (Peek() != c)
                    throw new FormatException("JSON 期望 '" + c + "' 于位置 " + _i);
                _i++;
            }

            private JValue ParseValue()
            {
                SkipWs();
                char c = Peek();
                if (c == '{') return ParseObject();
                if (c == '[') return ParseArray();
                if (c == '"') return new JValue { Kind = 3, Str = ParseString() };
                if (c == 't') { Consume("true"); return new JValue { Kind = 1, Bool = true }; }
                if (c == 'f') { Consume("false"); return new JValue { Kind = 1, Bool = false }; }
                if (c == 'n') { Consume("null"); return new JValue { Kind = 0 }; }
                return ParseNumber();
            }

            private void Consume(string literal)
            {
                if (_i + literal.Length > _s.Length || _s.Substring(_i, literal.Length) != literal)
                    throw new FormatException("JSON 字面量错误于位置 " + _i);
                _i += literal.Length;
            }

            private JValue ParseObject()
            {
                Expect('{');
                var obj = new Dictionary<string, JValue>();
                SkipWs();
                if (Peek() == '}')
                {
                    _i++;
                    return new JValue { Kind = 5, Obj = obj };
                }
                while (true)
                {
                    SkipWs();
                    string key = ParseString();
                    SkipWs();
                    Expect(':');
                    obj[key] = ParseValue();
                    SkipWs();
                    char c = Peek();
                    _i++;
                    if (c == '}')
                        break;
                    if (c != ',')
                        throw new FormatException("JSON 对象分隔符错误于位置 " + _i);
                }
                return new JValue { Kind = 5, Obj = obj };
            }

            private JValue ParseArray()
            {
                Expect('[');
                var arr = new List<JValue>();
                SkipWs();
                if (Peek() == ']')
                {
                    _i++;
                    return new JValue { Kind = 4, Arr = arr };
                }
                while (true)
                {
                    arr.Add(ParseValue());
                    SkipWs();
                    char c = Peek();
                    _i++;
                    if (c == ']')
                        break;
                    if (c != ',')
                        throw new FormatException("JSON 数组分隔符错误于位置 " + _i);
                }
                return new JValue { Kind = 4, Arr = arr };
            }

            private string ParseString()
            {
                Expect('"');
                var sb = new StringBuilder();
                while (true)
                {
                    char c = Peek();
                    _i++;
                    if (c == '"')
                        break;
                    if (c == '\\')
                    {
                        char e = Peek();
                        _i++;
                        switch (e)
                        {
                            case '"': sb.Append('"'); break;
                            case '\\': sb.Append('\\'); break;
                            case '/': sb.Append('/'); break;
                            case 'b': sb.Append('\b'); break;
                            case 'f': sb.Append('\f'); break;
                            case 'n': sb.Append('\n'); break;
                            case 'r': sb.Append('\r'); break;
                            case 't': sb.Append('\t'); break;
                            case 'u':
                                if (_i + 4 > _s.Length)
                                    throw new FormatException("JSON \\u 转义截断");
                                string hex = _s.Substring(_i, 4);
                                _i += 4;
                                sb.Append((char)ushort.Parse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                                break;
                            default:
                                throw new FormatException("JSON 非法转义: \\" + e);
                        }
                    }
                    else
                    {
                        sb.Append(c);
                    }
                }
                return sb.ToString();
            }

            private JValue ParseNumber()
            {
                int start = _i;
                while (_i < _s.Length && "+-0123456789.eE".IndexOf(_s[_i]) >= 0)
                    _i++;
                string raw = _s.Substring(start, _i - start);
                if (!double.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out double num))
                    throw new FormatException("JSON 数字错误于位置 " + start);
                return new JValue { Kind = 2, Num = num };
            }
        }

        private static JValue Get(JValue v, string key)
        {
            if (v == null || v.Kind != 5 || v.Obj == null)
                return null;
            return v.Obj.TryGetValue(key, out var child) ? child : null;
        }

        private static string Str(JValue v, string fallback = null)
        {
            return v != null && v.Kind == 3 ? v.Str : fallback;
        }

        private static float Num(JValue v, float fallback = 0f)
        {
            return v != null && v.Kind == 2 ? (float)v.Num : fallback;
        }

        private static bool Bool(JValue v, bool fallback = false)
        {
            return v != null && v.Kind == 1 ? v.Bool : fallback;
        }

        #endregion

        public static void Run(string configPath)
        {
            var config = new JsonParser(File.ReadAllText(configPath)).Parse();
            string resultPath = Str(Get(config, "resultPath"));
            string action = Str(Get(config, "action"), "build_ui_from_dsl");
            JValue result;
            try
            {
                if (action == "refresh_scripts")
                {
                    // 仅触发资产刷新：脚本编译在回调返回后才排队执行，本 job 在 domain reload 前完成
                    AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
                    result = SimpleResult(action, true, "ok");
                }
                else if (action == "setup_workbench")
                {
                    result = SetupWorkbench(action);
                }
                else
                {
                    string dslPath = Str(Get(config, "dsl"));
                    var dsl = new JsonParser(File.ReadAllText(dslPath)).Parse();
                    result = Build(dsl, config);
                }
            }
            catch (Exception e)
            {
                result = new JValue
                {
                    Kind = 5,
                    Obj = new Dictionary<string, JValue>
                    {
                        ["success"] = new JValue { Kind = 1, Bool = false },
                        ["action"] = new JValue { Kind = 3, Str = action },
                        ["message"] = new JValue { Kind = 3, Str = e.Message },
                    },
                };
            }
            File.WriteAllText(resultPath, ToJson(result));
        }

        private static JValue SimpleResult(string action, bool success, string message)
        {
            return new JValue
            {
                Kind = 5,
                Obj = new Dictionary<string, JValue>
                {
                    ["success"] = new JValue { Kind = 1, Bool = success },
                    ["action"] = new JValue { Kind = 3, Str = action },
                    ["message"] = new JValue { Kind = 3, Str = message },
                },
            };
        }

        // 首次接入：创建 UIDslWorkbench 场景（PreviewCamera + UIDslCanvas + EventSystem），
        // 供 build_ui_from_dsl 在其中搭建并截图；场景保存后保持打开状态。
        private static JValue SetupWorkbench(string action)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var cameraGo = new GameObject("PreviewCamera");
            var camera = cameraGo.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.12f, 0.12f, 0.14f, 1f);
            cameraGo.transform.position = new Vector3(0f, 0f, -10f);

            var canvasGo = new GameObject("UIDslCanvas", typeof(RectTransform), typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = camera;
            canvas.planeDistance = 10f;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1080f, 1920f);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0f;

            new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));

            const string sceneDir = "Assets/Scenes";
            Directory.CreateDirectory(sceneDir);
            string scenePath = sceneDir + "/UIDslWorkbench.unity";
            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            var result = SimpleResult(action, true, "ok");
            result.Obj["scene"] = new JValue { Kind = 3, Str = scenePath };
            return result;
        }

        private static string ToJson(JValue v)
        {
            var sb = new StringBuilder();
            WriteJson(v, sb);
            return sb.ToString();
        }

        private static void WriteJson(JValue v, StringBuilder sb)
        {
            switch (v.Kind)
            {
                case 0: sb.Append("null"); break;
                case 1: sb.Append(v.Bool ? "true" : "false"); break;
                case 2: sb.Append(v.Num.ToString("R", CultureInfo.InvariantCulture)); break;
                case 3: WriteString(v.Str, sb); break;
                case 4:
                    sb.Append('[');
                    for (int i = 0; i < v.Arr.Count; i++)
                    {
                        if (i > 0) sb.Append(',');
                        WriteJson(v.Arr[i], sb);
                    }
                    sb.Append(']');
                    break;
                default:
                    sb.Append('{');
                    bool first = true;
                    foreach (var kv in v.Obj)
                    {
                        if (!first) sb.Append(',');
                        first = false;
                        WriteString(kv.Key, sb);
                        sb.Append(':');
                        WriteJson(kv.Value, sb);
                    }
                    sb.Append('}');
                    break;
            }
        }

        private static void WriteString(string s, StringBuilder sb)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < ' ')
                            sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        else
                            sb.Append(c);
                        break;
                }
            }
            sb.Append('"');
        }

        private static JValue Build(JValue dsl, JValue config)
        {
            string action = Str(Get(config, "action"), "build_ui_from_dsl");
            SpriteCache.Clear();
            NodeById.Clear();
            PendingBindings.Clear();
            string name = Str(Get(dsl, "name"));
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("DSL 缺少 name");
            if (!IsSafeUiName(name))
                throw new ArgumentException("DSL name 必须以英文字母开头，且仅包含英文字母、数字、下划线（最多 64 字符）: " + name);
            var rootTok = Get(dsl, "root");
            if (rootTok == null || rootTok.Kind != 5)
                throw new ArgumentException("DSL 缺少 root");

            int nodeCount = 0;
            ValidateNode(rootTok, ref nodeCount);
            AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);

            // jobcfg 由宿主按 ugui.config.json 生成：prefabDir 覆盖默认目录，view 携带视图脚本挂载配置
            JValue jobcfg = null;
            string jobcfgPath = Str(Get(config, "jobcfg"));
            if (!string.IsNullOrEmpty(jobcfgPath) && File.Exists(jobcfgPath))
                jobcfg = new JsonParser(File.ReadAllText(jobcfgPath)).Parse();
            string prefabDir = jobcfg != null ? Str(Get(jobcfg, "prefabDir"), DefaultPrefabDir) : DefaultPrefabDir;
            if (string.IsNullOrEmpty(prefabDir)) prefabDir = DefaultPrefabDir;
            if (!Directory.Exists(prefabDir))
            {
                Directory.CreateDirectory(prefabDir);
                AssetDatabase.Refresh(ImportAssetOptions.ForceSynchronousImport);
            }
            string path = prefabDir + "/" + name + ".prefab";

            var scene = SceneManager.GetActiveScene();
            Transform canvasT = null;
            foreach (var go in scene.GetRootGameObjects())
            {
                if (go.name == "UIDslCanvas")
                {
                    canvasT = go.transform;
                    break;
                }
            }
            if (!canvasT)
                throw new InvalidOperationException("未找到 UIDslCanvas，请先调用 ugui_setup 创建并打开 UIDslWorkbench 场景");

            string rootName = Str(Get(rootTok, "name"));

            Undo.IncrementCurrentGroup();
            int undoGroup = Undo.GetCurrentGroup();
            Undo.SetCurrentGroupName("Build UI From DSL " + name);

            var existing = FindDirectChild(canvasT, rootName);
            GameObject rootGo = null;
            Component viewComponent = null;
            int viewBoundCount = 0;
            try
            {
                rootGo = CreateNode(rootTok, canvasT);
                ResolvePendingBindings();
                var view = jobcfg != null ? Get(jobcfg, "view") : null;
                if (view != null && view.Kind == 5)
                {
                    string viewType = Str(Get(view, "type"));
                    if (string.IsNullOrEmpty(viewType))
                        throw new ArgumentException("view 配置缺少 type 字段");
                    viewComponent = AttachViewComponent(rootGo, viewType, Get(view, "bindings"), out viewBoundCount);
                }
                ValidateLayoutElements(rootGo);
                Canvas.ForceUpdateCanvases();
                LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)rootGo.transform);
                var saved = PrefabUtility.SaveAsPrefabAssetAndConnect(rootGo, path, InteractionMode.AutomatedAction);
                if (!saved)
                    throw new InvalidOperationException("Prefab 保存失败: " + path);
                if (existing)
                    Undo.DestroyObjectImmediate(existing.gameObject);
                EditorSceneManager.MarkSceneDirty(scene);
                Undo.CollapseUndoOperations(undoGroup);
            }
            catch
            {
                Undo.RevertAllDownToGroup(undoGroup);
                if (rootGo)
                    UnityEngine.Object.DestroyImmediate(rootGo);
                throw;
            }

            return new JValue
            {
                Kind = 5,
                Obj = new Dictionary<string, JValue>
                {
                    ["success"] = new JValue { Kind = 1, Bool = true },
                    ["action"] = new JValue { Kind = 3, Str = action },
                    ["prefab"] = new JValue { Kind = 3, Str = path },
                    ["guid"] = new JValue { Kind = 3, Str = AssetDatabase.AssetPathToGUID(path) },
                    ["nodeCount"] = new JValue { Kind = 2, Num = nodeCount },
                    ["rootPath"] = new JValue { Kind = 3, Str = "/UIDslCanvas/" + rootName },
                    ["view"] = viewComponent == null
                        ? new JValue { Kind = 0 }
                        : new JValue
                        {
                            Kind = 5,
                            Obj = new Dictionary<string, JValue>
                            {
                                ["type"] = new JValue { Kind = 3, Str = viewComponent.GetType().Name },
                                ["boundFields"] = new JValue { Kind = 2, Num = viewBoundCount },
                            },
                        },
                    ["message"] = new JValue { Kind = 3, Str = "ok" },
                },
            };
        }

        // 视图脚本挂载：把已编译的 MonoBehaviour 挂到根节点，并按 view 配置中的 bindings
        // （{ 字段名: nodeId 或 [nodeId...] }）写入序列化引用，效果等同 Inspector 拖入。
        private static Component AttachViewComponent(GameObject rootGo, string typeName, JValue bindings, out int boundCount)
        {
            var type = FindTypeByName(typeName);
            if (type == null)
                throw new InvalidOperationException("未找到视图脚本类型 " + typeName + "：脚本可能尚未编译完成，或类名与 DSL name 不一致");
            if (!typeof(MonoBehaviour).IsAssignableFrom(type))
                throw new ArgumentException(typeName + " 不是 MonoBehaviour，无法挂载到 prefab 根节点");
            var component = rootGo.AddComponent(type);
            boundCount = 0;
            if (bindings == null || bindings.Kind != 5)
                return component;
            var serialized = new SerializedObject(component);
            foreach (var kv in bindings.Obj)
            {
                BindSerializedField(type, serialized, kv.Key, kv.Value);
                boundCount++;
            }
            serialized.ApplyModifiedPropertiesWithoutUndo();
            return component;
        }

        private static Type FindTypeByName(string typeName)
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                Type type = null;
                try { type = assembly.GetType(typeName); }
                catch { /* 个别动态程序集可能反射失败，跳过 */ }
                if (type != null) return type;
            }
            return null;
        }

        private static void BindSerializedField(Type ownerType, SerializedObject serialized, string fieldName, JValue target)
        {
            var field = ownerType.GetField(fieldName, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            if (field == null)
                throw new ArgumentException(ownerType.Name + " 不存在字段 " + fieldName + "（bindings.json 与视图脚本不一致）");
            var property = serialized.FindProperty(fieldName);
            if (property == null)
                throw new ArgumentException(ownerType.Name + "." + fieldName + " 不是序列化字段，无法绑定（缺 [SerializeField] 或非 public）");
            Type elementType = null;
            if (field.FieldType.IsArray)
                elementType = field.FieldType.GetElementType();
            else if (field.FieldType.IsGenericType && field.FieldType.GetGenericTypeDefinition() == typeof(List<>))
                elementType = field.FieldType.GetGenericArguments()[0];
            if (elementType != null)
            {
                if (target == null || target.Kind != 4)
                    throw new ArgumentException("bindings." + fieldName + " 必须是 nodeId 数组");
                property.arraySize = target.Arr.Count;
                for (int i = 0; i < target.Arr.Count; i++)
                    property.GetArrayElementAtIndex(i).objectReferenceValue = ResolveBindingTarget(fieldName, target.Arr[i], elementType);
            }
            else
            {
                property.objectReferenceValue = ResolveBindingTarget(fieldName, target, field.FieldType);
            }
        }

        private static UnityEngine.Object ResolveBindingTarget(string fieldName, JValue nodeIdToken, Type targetType)
        {
            string nodeId = nodeIdToken != null && nodeIdToken.Kind == 3 ? nodeIdToken.Str : null;
            if (string.IsNullOrEmpty(nodeId) || !NodeById.TryGetValue(nodeId, out var go) || !go)
                throw new ArgumentException("bindings." + fieldName + " 引用了不存在的 nodeId: " + (nodeId ?? "null"));
            if (targetType == typeof(GameObject))
                return go;
            if (targetType == typeof(Transform) || targetType == typeof(RectTransform))
                return go.transform;
            if (typeof(Component).IsAssignableFrom(targetType))
            {
                var component = go.GetComponent(targetType);
                if (!component)
                    throw new ArgumentException("bindings." + fieldName + " 目标节点 " + go.name + " 上没有组件 " + targetType.Name);
                return component;
            }
            throw new ArgumentException("bindings." + fieldName + " 的字段类型不支持绑定: " + targetType.Name);
        }

        private static void ValidateNode(JValue node, ref int count)
        {
            count++;
            string nodeName = Str(Get(node, "name"));
            if (string.IsNullOrEmpty(nodeName))
                throw new ArgumentException("存在未命名节点");
            if (nodeName.Contains("/"))
                throw new ArgumentException("节点名不能包含 '/': " + nodeName);
            var children = Get(node, "children");
            if (children != null && children.Kind == 4)
            {
                foreach (var child in children.Arr)
                {
                    if (child == null || child.Kind != 5)
                        throw new ArgumentException("children 含非对象项");
                    ValidateNode(child, ref count);
                }
            }
        }

        private static Transform FindDirectChild(Transform parent, string childName)
        {
            for (int i = 0; i < parent.childCount; i++)
            {
                var child = parent.GetChild(i);
                if (child.name == childName)
                    return child;
            }
            return null;
        }

        private static GameObject CreateNode(JValue node, Transform parent)
        {
            string nodeName = Str(Get(node, "name"));
            var go = new GameObject(nodeName, typeof(RectTransform));
            Undo.RegisterCreatedObjectUndo(go, "Create " + nodeName);
            go.transform.SetParent(parent, false);
            string nodeId = Str(Get(node, "nodeId"));
            if (!string.IsNullOrEmpty(nodeId))
            {
                if (NodeById.ContainsKey(nodeId))
                    throw new ArgumentException("nodeId 重复: " + nodeId);
                NodeById.Add(nodeId, go);
            }
            var rt = (RectTransform)go.transform;
            rt.localPosition = Vector3.zero;
            rt.localRotation = Quaternion.identity;
            rt.localScale = Vector3.one;
            // 节点 active:false 表示初始隐藏（如选中态标记），对应 GameObject.SetActive(false)
            if (!Bool(Get(node, "active"), true))
                go.SetActive(false);

            ApplyRect(rt, Get(node, "rect"));

            var comps = Get(node, "components");
            if (comps != null && comps.Kind == 4)
            {
                foreach (var comp in comps.Arr)
                {
                    if (comp != null && comp.Kind == 5)
                        ApplyComponent(go, comp);
                }
            }
            if (go.GetComponent<Mask>() && !go.GetComponent<Image>())
                throw new ArgumentException("Mask 节点必须在同一节点配置 Image: " + nodeName);

            var children = Get(node, "children");
            if (children != null && children.Kind == 4)
            {
                foreach (var child in children.Arr)
                {
                    if (child != null && child.Kind == 5)
                        CreateNode(child, go.transform);
                }
            }
            return go;
        }

        private static void ApplyRect(RectTransform rt, JValue rect)
        {
            string anchor = Str(Get(rect, "anchor"), "center");
            Vector2 size = ReadVec2(Get(rect, "size"), new Vector2(100f, 100f));
            var off = Get(rect, "offset");
            float ox = OffAt(off, 0);
            float oy = OffAt(off, 1);

            Vector2 min;
            Vector2 max;
            Vector2 pivot;
            Vector2 pos;
            Vector2 sizeDelta;
            switch (anchor)
            {
                case "topLeft":
                    min = new Vector2(0f, 1f); max = min; pivot = new Vector2(0f, 1f);
                    pos = new Vector2(ox, -oy); sizeDelta = size;
                    break;
                case "topCenter":
                    min = new Vector2(0.5f, 1f); max = min; pivot = new Vector2(0.5f, 1f);
                    pos = new Vector2(ox, -oy); sizeDelta = size;
                    break;
                case "topRight":
                    min = new Vector2(1f, 1f); max = min; pivot = new Vector2(1f, 1f);
                    pos = new Vector2(-ox, -oy); sizeDelta = size;
                    break;
                case "middleLeft":
                    min = new Vector2(0f, 0.5f); max = min; pivot = new Vector2(0f, 0.5f);
                    pos = new Vector2(ox, oy); sizeDelta = size;
                    break;
                case "middleRight":
                    min = new Vector2(1f, 0.5f); max = min; pivot = new Vector2(1f, 0.5f);
                    pos = new Vector2(-ox, oy); sizeDelta = size;
                    break;
                case "topStretch":
                    min = new Vector2(0f, 1f); max = new Vector2(1f, 1f); pivot = new Vector2(0.5f, 1f);
                    pos = new Vector2(ox, -oy); sizeDelta = new Vector2(0f, size.y);
                    break;
                case "bottomCenter":
                    min = new Vector2(0.5f, 0f); max = min; pivot = new Vector2(0.5f, 0f);
                    pos = new Vector2(ox, oy); sizeDelta = size;
                    break;
                case "bottomRight":
                    min = new Vector2(1f, 0f); max = min; pivot = new Vector2(1f, 0f);
                    pos = new Vector2(-ox, oy); sizeDelta = size;
                    break;
                case "bottomStretch":
                    min = new Vector2(0f, 0f); max = new Vector2(1f, 0f); pivot = new Vector2(0.5f, 0f);
                    pos = new Vector2(ox, oy); sizeDelta = new Vector2(0f, size.y);
                    break;
                case "leftStretch":
                    min = new Vector2(0f, 0f); max = new Vector2(0f, 1f); pivot = new Vector2(0f, 0.5f);
                    pos = new Vector2(ox, oy); sizeDelta = new Vector2(size.x, 0f);
                    break;
                case "rightStretch":
                    min = new Vector2(1f, 0f); max = new Vector2(1f, 1f); pivot = new Vector2(1f, 0.5f);
                    pos = new Vector2(-ox, oy); sizeDelta = new Vector2(size.x, 0f);
                    break;
                case "bottomLeft":
                    min = new Vector2(0f, 0f); max = min; pivot = new Vector2(0f, 0f);
                    pos = new Vector2(ox, oy); sizeDelta = size;
                    break;
                case "stretch":
                {
                    float l = OffAt(off, 0);
                    float t = OffAt(off, 1);
                    float r = OffAt(off, 2);
                    float b = OffAt(off, 3);
                    min = Vector2.zero; max = Vector2.one; pivot = new Vector2(0.5f, 0.5f);
                    pos = new Vector2((l - r) / 2f, (b - t) / 2f);
                    sizeDelta = new Vector2(-(l + r), -(t + b));
                    break;
                }
                case "custom":
                    min = ReadVec2(Get(rect, "anchorMin"), new Vector2(0.5f, 0.5f));
                    max = ReadVec2(Get(rect, "anchorMax"), min);
                    pivot = ReadVec2(Get(rect, "pivot"), new Vector2(0.5f, 0.5f));
                    pos = ReadVec2(Get(rect, "position"), Vector2.zero);
                    sizeDelta = size;
                    break;
                default:
                    min = new Vector2(0.5f, 0.5f); max = min; pivot = new Vector2(0.5f, 0.5f);
                    pos = new Vector2(ox, oy); sizeDelta = size;
                    break;
            }

            rt.anchorMin = min;
            rt.anchorMax = max;
            rt.pivot = pivot;
            rt.sizeDelta = sizeDelta;
            rt.anchoredPosition = pos;
        }

        private static void ApplyComponent(GameObject go, JValue comp)
        {
            string type = Str(Get(comp, "type"));
            if (type == "Image")
            {
                var img = go.AddComponent<Image>();
                img.color = ReadColor(Str(Get(comp, "color")), Color.white);
                string spritePath = Str(Get(comp, "spritePath"));
                if (!string.IsNullOrEmpty(spritePath))
                {
                    img.sprite = LoadSprite(spritePath);
                    img.type = Image.Type.Simple;
                    img.preserveAspect = Bool(Get(comp, "preserveAspect"), false);
                }
            }
            else if (type == "TMP_Text")
            {
                var txt = go.AddComponent<TextMeshProUGUI>();
                txt.text = Str(Get(comp, "text"), string.Empty);
                float fontSize = Num(Get(comp, "fontSize"), 0f);
                txt.fontSize = fontSize > 0f ? fontSize : 24f;
                txt.horizontalAlignment = MapHorizontal(Str(Get(comp, "align")));
                txt.verticalAlignment = MapVertical(Str(Get(comp, "vAlign")));
                txt.color = ReadColor(Str(Get(comp, "color")), Color.white);
            }
            else if (type == "Button")
            {
                go.AddComponent<Button>();
            }
            else if (type == "Toggle")
            {
                var toggle = go.AddComponent<Toggle>();
                toggle.interactable = Bool(Get(comp, "interactable"), true);
                toggle.SetIsOnWithoutNotify(Bool(Get(comp, "isOn"), false));
                PendingBindings.Add(new PendingBinding { Owner = go, Component = toggle, Config = comp });
            }
            else if (type == "ToggleGroup")
            {
                var toggleGroup = go.AddComponent<ToggleGroup>();
                toggleGroup.allowSwitchOff = Bool(Get(comp, "allowSwitchOff"), false);
            }
            else if (type == "Slider")
            {
                var slider = go.AddComponent<Slider>();
                slider.interactable = Bool(Get(comp, "interactable"), true);
                slider.direction = MapSliderDirection(Str(Get(comp, "direction"), "leftToRight"));
                slider.minValue = Num(Get(comp, "minValue"), 0f);
                slider.maxValue = Num(Get(comp, "maxValue"), 1f);
                if (slider.maxValue < slider.minValue)
                    throw new ArgumentException("Slider maxValue 不能小于 minValue: " + go.name);
                slider.wholeNumbers = Bool(Get(comp, "wholeNumbers"), false);
                slider.SetValueWithoutNotify(Num(Get(comp, "value"), slider.minValue));
                PendingBindings.Add(new PendingBinding { Owner = go, Component = slider, Config = comp });
            }
            else if (type == "Scrollbar")
            {
                var scrollbar = go.AddComponent<Scrollbar>();
                scrollbar.interactable = Bool(Get(comp, "interactable"), true);
                scrollbar.direction = MapScrollbarDirection(Str(Get(comp, "direction"), "leftToRight"));
                scrollbar.size = Num(Get(comp, "size"), 0.2f);
                scrollbar.numberOfSteps = Mathf.Max(0, Mathf.RoundToInt(Num(Get(comp, "numberOfSteps"), 0f)));
                scrollbar.SetValueWithoutNotify(Num(Get(comp, "value"), 0f));
                PendingBindings.Add(new PendingBinding { Owner = go, Component = scrollbar, Config = comp });
            }
            else if (type == "ScrollRect")
            {
                var scrollRect = go.AddComponent<ScrollRect>();
                scrollRect.horizontal = Bool(Get(comp, "horizontal"), true);
                scrollRect.vertical = Bool(Get(comp, "vertical"), true);
                scrollRect.movementType = MapScrollRectMovementType(Str(Get(comp, "movementType"), "elastic"));
                scrollRect.elasticity = Num(Get(comp, "elasticity"), 0.1f);
                scrollRect.inertia = Bool(Get(comp, "inertia"), true);
                scrollRect.decelerationRate = Num(Get(comp, "decelerationRate"), 0.135f);
                scrollRect.scrollSensitivity = Num(Get(comp, "scrollSensitivity"), 1f);
                scrollRect.horizontalScrollbarVisibility = MapScrollRectVisibility(Str(Get(comp, "horizontalScrollbarVisibility"), "permanent"));
                scrollRect.verticalScrollbarVisibility = MapScrollRectVisibility(Str(Get(comp, "verticalScrollbarVisibility"), "permanent"));
                scrollRect.horizontalScrollbarSpacing = Num(Get(comp, "horizontalScrollbarSpacing"), 0f);
                scrollRect.verticalScrollbarSpacing = Num(Get(comp, "verticalScrollbarSpacing"), 0f);
                PendingBindings.Add(new PendingBinding { Owner = go, Component = scrollRect, Config = comp });
            }
            else if (type == "Mask")
            {
                var mask = go.AddComponent<Mask>();
                mask.showMaskGraphic = Bool(Get(comp, "showMaskGraphic"), true);
            }
            else if (type == "RectMask2D")
            {
                var rectMask = go.AddComponent<RectMask2D>();
                Vector2 softness = ReadVec2(Get(comp, "softness"), Vector2.zero);
                rectMask.softness = new Vector2Int(
                    Mathf.Max(0, Mathf.RoundToInt(softness.x)),
                    Mathf.Max(0, Mathf.RoundToInt(softness.y)));
            }
            else if (type == "HorizontalLayoutGroup")
            {
                var layout = go.AddComponent<HorizontalLayoutGroup>();
                ApplyLayoutGroup(layout, comp);
                ApplyHorizontalOrVerticalLayout(layout, comp);
            }
            else if (type == "VerticalLayoutGroup")
            {
                var layout = go.AddComponent<VerticalLayoutGroup>();
                ApplyLayoutGroup(layout, comp);
                ApplyHorizontalOrVerticalLayout(layout, comp);
            }
            else if (type == "GridLayoutGroup")
            {
                var layout = go.AddComponent<GridLayoutGroup>();
                ApplyLayoutGroup(layout, comp);
                layout.startCorner = MapGridCorner(Str(Get(comp, "startCorner"), "upperLeft"));
                layout.startAxis = MapGridAxis(Str(Get(comp, "startAxis"), "horizontal"));
                layout.cellSize = ReadVec2(Get(comp, "cellSize"), new Vector2(100f, 100f));
                layout.spacing = ReadVec2(Get(comp, "spacing"), Vector2.zero);
                layout.constraint = MapGridConstraint(Str(Get(comp, "constraint"), "flexible"));
                layout.constraintCount = Mathf.Max(1, Mathf.RoundToInt(Num(Get(comp, "constraintCount"), 2f)));
            }
            else if (type == "ContentSizeFitter")
            {
                var fitter = go.AddComponent<ContentSizeFitter>();
                fitter.horizontalFit = MapFitMode(Str(Get(comp, "horizontalFit"), "unconstrained"));
                fitter.verticalFit = MapFitMode(Str(Get(comp, "verticalFit"), "unconstrained"));
            }
            else if (type == "LayoutElement")
            {
                var layoutElement = go.AddComponent<LayoutElement>();
                layoutElement.ignoreLayout = Bool(Get(comp, "ignoreLayout"), false);
                layoutElement.minWidth = Num(Get(comp, "minWidth"), -1f);
                layoutElement.minHeight = Num(Get(comp, "minHeight"), -1f);
                layoutElement.preferredWidth = Num(Get(comp, "preferredWidth"), -1f);
                layoutElement.preferredHeight = Num(Get(comp, "preferredHeight"), -1f);
                layoutElement.flexibleWidth = Num(Get(comp, "flexibleWidth"), -1f);
                layoutElement.flexibleHeight = Num(Get(comp, "flexibleHeight"), -1f);
                layoutElement.layoutPriority = Mathf.Max(1, Mathf.RoundToInt(Num(Get(comp, "layoutPriority"), 1f)));
            }
            else
            {
                throw new ArgumentException("不支持的组件类型: " + (type ?? "<null>"));
            }
        }

        private static void ResolvePendingBindings()
        {
            foreach (var binding in PendingBindings)
            {
                if (binding.Component is Toggle toggle)
                {
                    var graphicNode = ResolveNodeReference(binding.Owner, binding.Config, "graphicNodeId", false, "Checkmark");
                    if (graphicNode)
                        toggle.graphic = RequireReferenceComponent<Graphic>(graphicNode, binding.Owner, "graphicNodeId");
                    var targetNode = ResolveNodeReference(binding.Owner, binding.Config, "targetGraphicNodeId", false, "Background");
                    toggle.targetGraphic = targetNode
                        ? RequireReferenceComponent<Graphic>(targetNode, binding.Owner, "targetGraphicNodeId")
                        : null;
                    var groupNode = ResolveNodeReference(binding.Owner, binding.Config, "toggleGroupNodeId", false);
                    toggle.group = groupNode
                        ? RequireReferenceComponent<ToggleGroup>(groupNode, binding.Owner, "toggleGroupNodeId")
                        : null;
                    if (toggle.graphic)
                        toggle.graphic.CrossFadeAlpha(toggle.isOn ? 1f : 0f, 0f, true);
                }
                else if (binding.Component is Slider slider)
                {
                    var fillNode = ResolveNodeReference(binding.Owner, binding.Config, "fillRectNodeId", false, "Fill");
                    var handleNode = ResolveNodeReference(binding.Owner, binding.Config, "handleRectNodeId", false, "Handle");
                    if (fillNode) slider.fillRect = (RectTransform)fillNode.transform;
                    if (handleNode) slider.handleRect = (RectTransform)handleNode.transform;
                    var targetNode = ResolveNodeReference(binding.Owner, binding.Config, "targetGraphicNodeId", false, "Handle");
                    slider.targetGraphic = targetNode
                        ? RequireReferenceComponent<Graphic>(targetNode, binding.Owner, "targetGraphicNodeId")
                        : null;
                    slider.SetValueWithoutNotify(slider.value);
                }
                else if (binding.Component is Scrollbar scrollbar)
                {
                    var handleNode = ResolveNodeReference(binding.Owner, binding.Config, "handleRectNodeId", false, "Handle");
                    if (handleNode) scrollbar.handleRect = (RectTransform)handleNode.transform;
                    var targetNode = ResolveNodeReference(binding.Owner, binding.Config, "targetGraphicNodeId", false, "Handle");
                    scrollbar.targetGraphic = targetNode
                        ? RequireReferenceComponent<Graphic>(targetNode, binding.Owner, "targetGraphicNodeId")
                        : null;
                    scrollbar.SetValueWithoutNotify(scrollbar.value);
                }
                else if (binding.Component is ScrollRect scrollRect)
                {
                    var contentNode = ResolveNodeReference(binding.Owner, binding.Config, "contentNodeId", true, "Content");
                    var viewportNode = ResolveNodeReference(binding.Owner, binding.Config, "viewportNodeId", false, "Viewport");
                    var horizontalNode = ResolveNodeReference(binding.Owner, binding.Config, "horizontalScrollbarNodeId", false, "Scrollbar Horizontal", "Horizontal Scrollbar");
                    var verticalNode = ResolveNodeReference(binding.Owner, binding.Config, "verticalScrollbarNodeId", false, "Scrollbar Vertical", "Vertical Scrollbar");
                    scrollRect.content = (RectTransform)contentNode.transform;
                    if (viewportNode) scrollRect.viewport = (RectTransform)viewportNode.transform;
                    if (horizontalNode) scrollRect.horizontalScrollbar = RequireReferenceComponent<Scrollbar>(horizontalNode, binding.Owner, "horizontalScrollbarNodeId");
                    if (verticalNode) scrollRect.verticalScrollbar = RequireReferenceComponent<Scrollbar>(verticalNode, binding.Owner, "verticalScrollbarNodeId");
                    bool expandsViewport = scrollRect.horizontalScrollbarVisibility == ScrollRect.ScrollbarVisibility.AutoHideAndExpandViewport
                        || scrollRect.verticalScrollbarVisibility == ScrollRect.ScrollbarVisibility.AutoHideAndExpandViewport;
                    if (expandsViewport && !scrollRect.viewport)
                        throw new ArgumentException(binding.Owner.name + " 使用 autoHideAndExpandViewport 时必须配置 viewportNodeId 或 Viewport 子节点");
                }
            }
        }

        private static GameObject ResolveNodeReference(GameObject owner, JValue config, string field, bool required, params string[] fallbackNames)
        {
            var referenceValue = Get(config, field);
            if (referenceValue != null)
            {
                if (referenceValue.Kind != 3 || string.IsNullOrEmpty(referenceValue.Str))
                    throw new ArgumentException(owner.name + "." + field + " 引用字段必须是非空 nodeId");
                string explicitNodeId = referenceValue.Str;
                if (!NodeById.TryGetValue(explicitNodeId, out var explicitNode) || !explicitNode)
                    throw new ArgumentException(owner.name + "." + field + " 引用了不存在的 nodeId: " + explicitNodeId);
                return explicitNode;
            }
            var fallback = FindDescendantByNames(owner.transform, fallbackNames);
            if (required && !fallback)
                throw new ArgumentException(owner.name + "." + field + " 缺失，且未找到标准子节点: " + string.Join(", ", fallbackNames));
            return fallback;
        }

        private static GameObject FindDescendantByNames(Transform root, params string[] names)
        {
            foreach (string name in names)
            {
                var found = FindDescendantByName(root, name);
                if (found) return found.gameObject;
            }
            return null;
        }

        private static Transform FindDescendantByName(Transform root, string name)
        {
            for (int index = 0; index < root.childCount; index++)
            {
                var child = root.GetChild(index);
                if (child.name == name) return child;
                var nested = FindDescendantByName(child, name);
                if (nested) return nested;
            }
            return null;
        }

        private static void ValidateLayoutElements(GameObject root)
        {
            ValidateLayoutElementsRecursive((RectTransform)root.transform);
        }

        private static void ValidateLayoutElementsRecursive(RectTransform node)
        {
            var horizontal = node.GetComponent<HorizontalLayoutGroup>();
            var vertical = node.GetComponent<VerticalLayoutGroup>();
            if (horizontal || vertical)
            {
                for (int index = 0; index < node.childCount; index++)
                {
                    var child = node.GetChild(index) as RectTransform;
                    if (!child) continue;
                    var element = child.GetComponent<LayoutElement>();
                    if (element && element.ignoreLayout) continue;
                    if (horizontal && horizontal.childControlWidth && !ProvidesLayoutDimension(child, 0))
                        throw new ArgumentException(child.name + "：HorizontalLayoutGroup 控制的子节点需要 LayoutElement.minWidth/preferredWidth，或由自身 ILayoutElement 提供宽度");
                    if (horizontal && horizontal.childControlHeight && !ProvidesLayoutDimension(child, 1))
                        throw new ArgumentException(child.name + "：HorizontalLayoutGroup 控制的子节点需要 LayoutElement.minHeight/preferredHeight，或由自身 ILayoutElement 提供高度");
                    if (vertical && vertical.childControlWidth && !ProvidesLayoutDimension(child, 0))
                        throw new ArgumentException(child.name + "：VerticalLayoutGroup 控制的子节点需要 LayoutElement.minWidth/preferredWidth，或由自身 ILayoutElement 提供宽度");
                    if (vertical && vertical.childControlHeight && !ProvidesLayoutDimension(child, 1))
                        throw new ArgumentException(child.name + "：VerticalLayoutGroup 控制的子节点需要 LayoutElement.minHeight/preferredHeight，或由自身 ILayoutElement 提供高度");
                }
            }
            for (int index = 0; index < node.childCount; index++)
            {
                var child = node.GetChild(index) as RectTransform;
                if (child) ValidateLayoutElementsRecursive(child);
            }
        }

        private static bool ProvidesLayoutDimension(RectTransform child, int axis)
        {
            var element = child.GetComponent<LayoutElement>();
            if (element)
            {
                float minimum = axis == 0 ? element.minWidth : element.minHeight;
                float preferred = axis == 0 ? element.preferredWidth : element.preferredHeight;
                if (minimum >= 0f || preferred >= 0f) return true;
            }
            if (axis == 0) return LayoutUtility.GetPreferredWidth(child) > 0f;
            return LayoutUtility.GetPreferredHeight(child) > 0f;
        }

        private static T RequireReferenceComponent<T>(GameObject referenced, GameObject owner, string field) where T : Component
        {
            var component = referenced.GetComponent<T>();
            if (!component)
                throw new ArgumentException(owner.name + "." + field + " 指向的节点缺少 " + typeof(T).Name + ": " + referenced.name);
            return component;
        }

        private static Slider.Direction MapSliderDirection(string value)
        {
            switch (value)
            {
                case "leftToRight": return Slider.Direction.LeftToRight;
                case "rightToLeft": return Slider.Direction.RightToLeft;
                case "bottomToTop": return Slider.Direction.BottomToTop;
                case "topToBottom": return Slider.Direction.TopToBottom;
                default: throw new ArgumentException("Slider direction 无效: " + value);
            }
        }

        private static Scrollbar.Direction MapScrollbarDirection(string value)
        {
            switch (value)
            {
                case "leftToRight": return Scrollbar.Direction.LeftToRight;
                case "rightToLeft": return Scrollbar.Direction.RightToLeft;
                case "bottomToTop": return Scrollbar.Direction.BottomToTop;
                case "topToBottom": return Scrollbar.Direction.TopToBottom;
                default: throw new ArgumentException("Scrollbar direction 无效: " + value);
            }
        }

        private static ScrollRect.MovementType MapScrollRectMovementType(string value)
        {
            switch (value)
            {
                case "unrestricted": return ScrollRect.MovementType.Unrestricted;
                case "elastic": return ScrollRect.MovementType.Elastic;
                case "clamped": return ScrollRect.MovementType.Clamped;
                default: throw new ArgumentException("ScrollRect movementType 无效: " + value);
            }
        }

        private static ScrollRect.ScrollbarVisibility MapScrollRectVisibility(string value)
        {
            switch (value)
            {
                case "permanent": return ScrollRect.ScrollbarVisibility.Permanent;
                case "autoHide": return ScrollRect.ScrollbarVisibility.AutoHide;
                case "autoHideAndExpandViewport": return ScrollRect.ScrollbarVisibility.AutoHideAndExpandViewport;
                default: throw new ArgumentException("ScrollRect ScrollbarVisibility 无效: " + value);
            }
        }

        private static void ApplyLayoutGroup(LayoutGroup layout, JValue comp)
        {
            var padding = Get(comp, "padding");
            layout.padding = new RectOffset(
                Mathf.RoundToInt(OffAt(padding, 0)),
                Mathf.RoundToInt(OffAt(padding, 1)),
                Mathf.RoundToInt(OffAt(padding, 2)),
                Mathf.RoundToInt(OffAt(padding, 3)));
            layout.childAlignment = MapTextAnchor(Str(Get(comp, "childAlignment"), "upperLeft"));
        }

        private static void ApplyHorizontalOrVerticalLayout(HorizontalOrVerticalLayoutGroup layout, JValue comp)
        {
            layout.spacing = Num(Get(comp, "spacing"), layout.spacing);
            layout.childControlWidth = Bool(Get(comp, "childControlWidth"), layout.childControlWidth);
            layout.childControlHeight = Bool(Get(comp, "childControlHeight"), layout.childControlHeight);
            layout.childForceExpandWidth = Bool(Get(comp, "childForceExpandWidth"), layout.childForceExpandWidth);
            layout.childForceExpandHeight = Bool(Get(comp, "childForceExpandHeight"), layout.childForceExpandHeight);
            layout.childScaleWidth = Bool(Get(comp, "childScaleWidth"), layout.childScaleWidth);
            layout.childScaleHeight = Bool(Get(comp, "childScaleHeight"), layout.childScaleHeight);
            layout.reverseArrangement = Bool(Get(comp, "reverseArrangement"), layout.reverseArrangement);
        }

        private static TextAnchor MapTextAnchor(string value)
        {
            switch (value)
            {
                case "upperLeft": return TextAnchor.UpperLeft;
                case "upperCenter": return TextAnchor.UpperCenter;
                case "upperRight": return TextAnchor.UpperRight;
                case "middleLeft": return TextAnchor.MiddleLeft;
                case "middleCenter": return TextAnchor.MiddleCenter;
                case "middleRight": return TextAnchor.MiddleRight;
                case "lowerLeft": return TextAnchor.LowerLeft;
                case "lowerCenter": return TextAnchor.LowerCenter;
                case "lowerRight": return TextAnchor.LowerRight;
                default: throw new ArgumentException("childAlignment 无效: " + value);
            }
        }

        private static GridLayoutGroup.Corner MapGridCorner(string value)
        {
            switch (value)
            {
                case "upperLeft": return GridLayoutGroup.Corner.UpperLeft;
                case "upperRight": return GridLayoutGroup.Corner.UpperRight;
                case "lowerLeft": return GridLayoutGroup.Corner.LowerLeft;
                case "lowerRight": return GridLayoutGroup.Corner.LowerRight;
                default: throw new ArgumentException("startCorner 无效: " + value);
            }
        }

        private static GridLayoutGroup.Axis MapGridAxis(string value)
        {
            switch (value)
            {
                case "horizontal": return GridLayoutGroup.Axis.Horizontal;
                case "vertical": return GridLayoutGroup.Axis.Vertical;
                default: throw new ArgumentException("startAxis 无效: " + value);
            }
        }

        private static GridLayoutGroup.Constraint MapGridConstraint(string value)
        {
            switch (value)
            {
                case "flexible": return GridLayoutGroup.Constraint.Flexible;
                case "fixedColumnCount": return GridLayoutGroup.Constraint.FixedColumnCount;
                case "fixedRowCount": return GridLayoutGroup.Constraint.FixedRowCount;
                default: throw new ArgumentException("constraint 无效: " + value);
            }
        }

        private static ContentSizeFitter.FitMode MapFitMode(string value)
        {
            switch (value)
            {
                case "unconstrained": return ContentSizeFitter.FitMode.Unconstrained;
                case "minSize": return ContentSizeFitter.FitMode.MinSize;
                case "preferredSize": return ContentSizeFitter.FitMode.PreferredSize;
                default: throw new ArgumentException("FitMode 无效: " + value);
            }
        }

        private static Sprite LoadSprite(string spritePath)
        {
            if (!spritePath.StartsWith("Assets/Sprites/", StringComparison.Ordinal))
                throw new ArgumentException("spritePath 必须位于 Assets/Sprites: " + spritePath);
            if (SpriteCache.TryGetValue(spritePath, out var cached) && cached)
                return cached;

            AssetDatabase.ImportAsset(spritePath, ImportAssetOptions.ForceSynchronousImport);
            var importer = AssetImporter.GetAtPath(spritePath) as TextureImporter;
            if (importer == null)
                throw new InvalidOperationException("找不到图片或 TextureImporter: " + spritePath);
            bool needsImport = importer.textureType != TextureImporterType.Sprite
                || importer.spriteImportMode != SpriteImportMode.Single
                || importer.mipmapEnabled
                || !importer.alphaIsTransparency;
            if (needsImport)
            {
                importer.textureType = TextureImporterType.Sprite;
                importer.spriteImportMode = SpriteImportMode.Single;
                importer.mipmapEnabled = false;
                importer.alphaIsTransparency = true;
                importer.SaveAndReimport();
            }

            var sprite = AssetDatabase.LoadAssetAtPath<Sprite>(spritePath);
            if (!sprite)
                throw new InvalidOperationException("图片未能导入为 Sprite: " + spritePath);
            SpriteCache[spritePath] = sprite;
            return sprite;
        }

        private static float OffAt(JValue off, int index)
        {
            if (off == null || off.Kind != 4 || index >= off.Arr.Count)
                return 0f;
            return Num(off.Arr[index], 0f);
        }

        private static Vector2 ReadVec2(JValue token, Vector2 fallback)
        {
            if (token != null && token.Kind == 4 && token.Arr.Count >= 2)
                return new Vector2(Num(token.Arr[0]), Num(token.Arr[1]));
            return fallback;
        }

        private static bool IsSafeUiName(string value)
        {
            if (string.IsNullOrEmpty(value) || value.Length > 64 || !IsAsciiLetter(value[0]))
                return false;
            for (int i = 1; i < value.Length; i++)
            {
                char c = value[i];
                if (!IsAsciiLetter(c) && !char.IsDigit(c) && c != '_')
                    return false;
            }
            return true;
        }

        private static bool IsAsciiLetter(char c)
        {
            return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
        }

        private static Color ReadColor(string hex, Color fallback)
        {
            if (string.IsNullOrEmpty(hex))
                return fallback;
            string s = hex.StartsWith("#", StringComparison.Ordinal) ? hex.Substring(1) : hex;
            if (s.Length == 6)
                s += "FF";
            if (s.Length != 8)
                return fallback;
            if (!uint.TryParse(s, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out uint v))
                return fallback;
            return new Color32((byte)(v >> 24), (byte)(v >> 16), (byte)(v >> 8), (byte)v);
        }

        private static HorizontalAlignmentOptions MapHorizontal(string align)
        {
            switch (align)
            {
                case "left": return HorizontalAlignmentOptions.Left;
                case "right": return HorizontalAlignmentOptions.Right;
                default: return HorizontalAlignmentOptions.Center;
            }
        }

        private static VerticalAlignmentOptions MapVertical(string vAlign)
        {
            switch (vAlign)
            {
                case "top": return VerticalAlignmentOptions.Top;
                case "bottom": return VerticalAlignmentOptions.Bottom;
                default: return VerticalAlignmentOptions.Middle;
            }
        }
    }
}
