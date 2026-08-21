window.__ModuleLoader__.load({
	id: "dsh-local-ugui-entry-guard",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const react = require("react");

		const RELOAD_FLAG_PREFIX = "ugui-entry-guard:reloaded:";
		// 清单含 ugui 行时的兜底缓冲：守卫的首次渲染发生在 boot settle 之后，
		// bundle 此时已经物化，只需极短余量覆盖边界竞态
		const PRESENT_GRACE_MS = 500;

		// 常驻入口守卫：当前会话是 ugui preset 但入口按钮（[data-ugui-entry]）缺失时，
		// 主动刷新一次页面触发重新挂载。分两种情况：
		// 1. 启动清单不含 ugui client 行（standing mount 未建立）→ 按钮不可能出现，立即刷新；
		// 2. 清单含行但按钮仍未渲染（bundle 加载失败）→ 短缓冲后刷新一次。
		// sessionStorage 防刷新死循环，真故障时告警而不是死循环。
		function UguiEntryGuard(props) {
			const current = props.useSessions((state) => {
				const id = state && state.current;
				const summary = id && state.byId ? state.byId[id] ?? null : null;
				return summary && typeof summary.agentPreset === "string" ? { id: String(id), agentPreset: summary.agentPreset } : null;
			});
			react.useEffect(() => {
				if (!current || current.agentPreset !== "ugui") return undefined;
				const entryPresent = Boolean(
					window.__DSH_BOOT__
					&& Array.isArray(window.__DSH_BOOT__.entries)
					&& window.__DSH_BOOT__.entries.some((entry) => entry && entry.id === "dsh-local-ugui-tools")
				);
				const timer = setTimeout(() => {
					if (document.querySelector("[data-ugui-entry]")) return;
					const flagKey = RELOAD_FLAG_PREFIX + current.id;
					if (sessionStorage.getItem(flagKey) === "1") {
						console.warn("[ugui-entry-guard] 刷新后入口按钮仍缺失：ugui client bundle 可能加载失败，请查看浏览器控制台与 /plugins/dsh-local-ugui-tools/client.js 是否可达。");
						return;
					}
					sessionStorage.setItem(flagKey, "1");
					location.reload();
				}, entryPresent ? PRESENT_GRACE_MS : 0);
				return () => clearTimeout(timer);
			}, [current && current.id, current && current.agentPreset]);
			return null;
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			slots.inject("sidebar.footer.action", () => slots.register(
				{ name: "sidebar.footer.action", id: "ugui-entry-guard", order: 100, label: "UGUI 入口守卫" },
				(owner) => react.createElement(UguiEntryGuard, { useSessions: owner.useSessions })
			));
		}

		// slots 是硬依赖：声明 inject，fiber 等服务就绪再 apply（与主插件同一修复）。
		exports.inject = ["slots"];
		exports.apply = apply;
		return module.exports;
	}
});
