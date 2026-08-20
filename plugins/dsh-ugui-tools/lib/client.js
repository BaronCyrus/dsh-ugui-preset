window.__ModuleLoader__.load({
	id: "dsh-local-ugui-tools",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const react = require("react");
		const reactDom = require("react-dom");
		const h = react.createElement;

		const css = `
.uguiSide_root{flex:none;align-items:center;width:100%;height:42px;margin:8px 0 0;display:flex;position:relative}
.uguiSide_root.uguiSide_rail{width:36px;height:36px;margin:0}
.uguiSide_trigger{width:calc(100% + 4px);height:42px;color:var(--dsw-alias-label-primary);cursor:pointer;background:transparent;border:0;border-radius:12px;align-items:center;gap:8px;margin:0 -2px;padding:0 10px 0 8px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden}
.uguiSide_trigger:hover,.uguiSide_trigger[data-active]{background:var(--dsw-alias-interactive-bg-hover)}
.uguiSide_rail .uguiSide_trigger{border-radius:50%;justify-content:center;width:36px;height:36px;margin:0;padding:0}
.uguiSide_label{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}
.uguiSide_live{width:7px;height:7px;border-radius:50%;margin-left:auto;background:var(--dsw-alias-state-success-primary,#36b37e);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary,#36b37e) 15%,transparent)}
.uguiSide_panel{z-index:45;border:1px solid var(--dsw-alias-border-inverted);background:var(--dsw-specific-menu,var(--dsw-alias-bg-base,#fff));box-shadow:var(--dsw-shadow-lv3,0 16px 48px rgba(0,0,0,.24));border-radius:14px;flex-direction:column;display:flex;position:fixed;overflow:hidden;color:var(--dsw-alias-label-primary);resize:both;min-width:min(660px,calc(100vw - 24px));min-height:min(430px,calc(100vh - 24px));max-width:calc(100vw - 24px);max-height:calc(100vh - 24px)}
.uguiSide_panel[data-popout]{border:0;box-shadow:none}
.uguiSide_panel[data-popout] .uguiSide_header{cursor:default}
.uguiSide_header{box-sizing:border-box;flex:none;align-items:center;gap:8px;min-height:52px;padding:9px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);display:flex;cursor:move;user-select:none;touch-action:none}
.uguiSide_panel[data-dragging] .uguiSide_header{cursor:grabbing}
.uguiSide_titleWrap{min-width:0;flex:1;display:flex;flex-direction:column}
.uguiSide_title{font-size:14px;font-weight:600;line-height:20px}
.uguiSide_meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
.uguiSide_status{max-width:220px;color:var(--dsw-alias-label-tertiary);font-size:11px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.uguiSide_status[data-error]{color:var(--dsw-alias-state-error-primary,#d64545)}
.uguiSide_iconBtn{width:30px;height:30px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:transparent;border:0;border-radius:8px;align-items:center;justify-content:center;display:inline-flex;padding:0}
.uguiSide_iconBtn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.uguiSide_iconBtn:disabled{cursor:wait;opacity:.5}
.uguiSide_buildBtn{height:30px;flex:none;border:0;border-radius:7px;padding:0 10px;background:var(--dsw-alias-state-business-primary,#4c7dff);color:#fff;font:inherit;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap}
.uguiSide_buildBtn:hover{filter:brightness(1.06)}
.uguiSide_buildBtn:disabled{cursor:wait;opacity:.65}
.uguiSide_syncBadge{height:22px;flex:none;display:inline-flex;align-items:center;gap:5px;border-radius:6px;padding:0 8px;font-size:10.5px;font-weight:600;white-space:nowrap;border:1px solid transparent;cursor:default}
.uguiSide_syncBadge[data-state="pending"]{color:#b8860b;background:rgba(184,134,11,.12);border-color:rgba(184,134,11,.35)}
.uguiSide_syncBadge[data-state="reviewing"]{color:#4c7dff;background:rgba(76,125,255,.12);border-color:rgba(76,125,255,.35)}
.uguiSide_syncBadge[data-state="synced"]{color:#2e9e5b;background:rgba(46,158,91,.12);border-color:rgba(46,158,91,.3)}
.uguiSide_syncBadge[data-state="reviewing"]::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;animation:uguiSide_syncPulse 1s ease-in-out infinite}
@keyframes uguiSide_syncPulse{50%{opacity:.25}}
.uguiSide_canvasTabs{box-sizing:border-box;height:42px;flex:none;display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 94%,var(--dsw-alias-state-business-primary,#4c7dff));overflow-x:auto;overflow-y:hidden}
.uguiSide_canvasTab{box-sizing:border-box;height:29px;max-width:210px;flex:none;display:inline-flex;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary);padding:0 9px;font:inherit;font-size:11px;cursor:pointer}
.uguiSide_canvasTab:hover{border-color:var(--dsw-alias-border-inverted);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.uguiSide_canvasTab[data-active]{border-color:var(--dsw-alias-state-business-primary,#4c7dff);color:var(--dsw-alias-state-business-primary,#4c7dff);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 10%,var(--dsw-alias-bg-base,#fff));box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 25%,transparent)}
.uguiSide_canvasTab:disabled{cursor:wait;opacity:.6}
.uguiSide_canvasTabName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.uguiSide_canvasTabVersion{flex:none;color:var(--dsw-alias-label-caption);font-size:9px}
.uguiSide_canvasEmpty{padding:0 4px;color:var(--dsw-alias-label-tertiary);font-size:11px;white-space:nowrap}
.uguiSide_targetBar{box-sizing:border-box;height:38px;flex:none;display:flex;align-items:center;gap:7px;padding:6px 10px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base,#fff);overflow:hidden}
.uguiSide_targetLabel{flex:none;color:var(--dsw-alias-label-caption);font-size:10px;font-weight:600;white-space:nowrap}
.uguiSide_targetCanvas{box-sizing:border-box;max-width:180px;height:24px;flex:none;display:inline-flex;align-items:center;border-radius:6px;padding:0 8px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 12%,transparent);color:var(--dsw-alias-state-business-primary,#4c7dff);font-size:10px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiSide_targetSeparator{flex:none;color:var(--dsw-alias-label-caption);font-size:10px}
.uguiSide_targetNode{min-width:0;height:24px;flex:1;display:flex;align-items:center;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;padding:0 8px;color:var(--dsw-alias-label-secondary);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiSide_targetNode[data-root]{color:var(--dsw-alias-label-tertiary);font-style:italic}
.uguiSide_targetReset{height:24px;flex:none;border:0;border-radius:6px;padding:0 7px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:10px;cursor:pointer}
.uguiSide_targetReset:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.uguiComposerTarget{box-sizing:border-box;width:100%;min-height:30px;display:flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 28%,var(--dsw-alias-border-l2));border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 7%,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-secondary);font-size:11px;line-height:18px;overflow:hidden}
.uguiComposerTarget[data-status="error"]{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d64545) 45%,var(--dsw-alias-border-l2));background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d64545) 7%,var(--dsw-alias-bg-base,#fff))}
.uguiComposerTarget_dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--dsw-alias-label-dimmed)}
.uguiComposerTarget[data-status="ready"] .uguiComposerTarget_dot{background:var(--dsw-alias-state-success-primary,#36b37e);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary,#36b37e) 14%,transparent)}
.uguiComposerTarget[data-status="syncing"] .uguiComposerTarget_dot{background:var(--dsw-alias-state-warning-primary,#d99517)}
.uguiComposerTarget[data-status="error"] .uguiComposerTarget_dot{background:var(--dsw-alias-state-error-primary,#d64545)}
.uguiComposerTarget_label{flex:none;color:var(--dsw-alias-label-caption);font-weight:600;white-space:nowrap}
.uguiComposerTarget_canvas{max-width:180px;flex:none;color:var(--dsw-alias-state-business-primary,#4c7dff);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiComposerTarget_sep{flex:none;color:var(--dsw-alias-label-caption)}
.uguiComposerTarget_node{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiComposerTarget_state{flex:none;color:var(--dsw-alias-label-caption);white-space:nowrap}
.uguiSide_tabs{height:38px;flex:none;display:flex;border-bottom:1px solid var(--dsw-alias-border-l2);padding:0 12px}
.uguiSide_tab{height:38px;color:var(--dsw-alias-label-tertiary);cursor:pointer;font:inherit;font-size:12px;background:transparent;border:0;padding:0 12px;position:relative}
.uguiSide_tab:hover{color:var(--dsw-alias-label-primary)}
.uguiSide_tab[data-active]{color:var(--dsw-alias-state-business-primary,#4c7dff)}
.uguiSide_tab[data-active]:after{content:"";height:2px;background:currentColor;border-radius:2px 2px 0 0;position:absolute;left:10px;right:10px;bottom:0}
.uguiSide_body{min-height:0;flex:1;overflow:hidden;padding:0}
.uguiSide_overview{box-sizing:border-box;height:100%;overflow:auto;padding:16px;background:color-mix(in srgb,var(--dsw-alias-bg-base,#fff) 96%,var(--dsw-alias-state-business-primary,#4c7dff))}
.uguiSide_overviewHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:0 0 14px}
.uguiSide_overviewTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:16px;line-height:24px}
.uguiSide_overviewSubtitle{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}
.uguiSide_overviewSummary{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}
.uguiSide_overviewSummary span{height:25px;display:inline-flex;align-items:center;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;padding:0 8px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-secondary);font-size:10px;white-space:nowrap}
.uguiSide_overviewGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.uguiSide_overviewCard{box-sizing:border-box;min-width:0;border:1px solid var(--dsw-alias-border-l2);border-radius:11px;padding:12px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 2px 7px rgba(0,0,0,.04)}
.uguiSide_overviewCard[data-current]{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 70%,var(--dsw-alias-border-l2));box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 12%,transparent)}
.uguiSide_overviewCardHead{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.uguiSide_overviewNameWrap{min-width:0;display:flex;flex-direction:column;gap:2px}
.uguiSide_overviewName{font-size:13px;line-height:19px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uguiSide_overviewId{color:var(--dsw-alias-label-caption);font-size:9px;line-height:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.uguiSide_overviewBadges{flex:none;display:flex;gap:4px}
.uguiSide_overviewBadge{height:19px;display:inline-flex;align-items:center;border-radius:5px;padding:0 6px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:600}
.uguiSide_overviewBadge[data-tone="current"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 14%,transparent);color:var(--dsw-alias-state-business-primary,#4c7dff)}
.uguiSide_overviewBadge[data-tone="default"]{background:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#d99517) 14%,transparent);color:var(--dsw-alias-state-warning-primary,#b97800)}
.uguiSide_overviewMetrics{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px}
.uguiSide_overviewMetrics span{box-sizing:border-box;min-width:0;height:38px;display:flex;align-items:baseline;justify-content:center;gap:4px;border-radius:7px;padding:9px 6px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:9px}
.uguiSide_overviewMetrics b{color:var(--dsw-alias-label-primary);font-size:13px}
.uguiSide_overviewTarget{margin-top:9px;border-radius:6px;padding:6px 8px;background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#36b37e) 9%,transparent);color:var(--dsw-alias-label-secondary);font-size:10px;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiSide_overviewPath{margin:9px 0 10px;color:var(--dsw-alias-label-caption);font:9px/14px ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiSide_overviewOpen{box-sizing:border-box;width:100%;height:29px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;font-weight:600;cursor:pointer}
.uguiSide_overviewOpen:hover{border-color:var(--dsw-alias-state-business-primary,#4c7dff);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 9%,transparent);color:var(--dsw-alias-state-business-primary,#4c7dff)}
.uguiSide_overviewOpen:disabled{cursor:wait;opacity:.55}
.uguiSide_overviewEmpty{height:180px;display:flex;align-items:center;justify-content:center;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;color:var(--dsw-alias-label-tertiary);font-size:12px}
.uguiSide_note,.uguiSide_error{margin:8px 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.uguiSide_error{color:var(--dsw-alias-state-error-primary,#d64545)}
.uguiSide_designer{height:100%;min-height:0;display:grid;grid-template-columns:190px minmax(250px,1fr) 218px}
.uguiSide_column{min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base,#fff)}
.uguiSide_column+.uguiSide_column{border-left:1px solid var(--dsw-alias-border-l2)}
.uguiSide_columnTitle{height:35px;box-sizing:border-box;flex:none;display:flex;align-items:center;padding:0 10px;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.uguiSide_tree{min-height:0;overflow:auto;padding:6px}
.uguiSide_treeRow{box-sizing:border-box;width:100%;height:27px;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;display:flex;align-items:center;padding-right:6px;white-space:nowrap;overflow:hidden}
.uguiSide_treeRow:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.uguiSide_treeRow[data-selected]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 14%,transparent);color:var(--dsw-alias-state-business-primary,#4c7dff)}
.uguiSide_treeToggle,.uguiSide_treeSelect{height:100%;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.uguiSide_treeToggle{width:18px;flex:none;padding:0;text-align:center;color:var(--dsw-alias-label-caption)}
.uguiSide_treeToggle:hover{color:var(--dsw-alias-label-primary)}
.uguiSide_treeToggle:focus-visible,.uguiSide_treeSelect:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4c7dff);outline-offset:-2px;border-radius:4px}
.uguiSide_treeMark{width:18px;flex:none;text-align:center;color:var(--dsw-alias-label-caption)}
.uguiSide_treeSelect{min-width:0;flex:1;padding:0 0 0 1px;text-align:left;display:flex;align-items:center}
.uguiSide_treeName{min-width:0;overflow:hidden;text-overflow:ellipsis}
.uguiSide_previewColumn{background:var(--dsw-alias-markdown-code-block,#11151f)}
.uguiSide_previewShell{box-sizing:border-box;min-width:0;min-height:0;flex:1;padding:12px;background-color:var(--dsw-alias-markdown-code-block,#11151f);background-image:linear-gradient(45deg,rgba(127,127,127,.07) 25%,transparent 25%),linear-gradient(-45deg,rgba(127,127,127,.07) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(127,127,127,.07) 75%),linear-gradient(-45deg,transparent 75%,rgba(127,127,127,.07) 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;display:flex;justify-content:center;align-items:center;overflow:auto;position:relative}
.uguiSide_previewModes{z-index:80;position:absolute;top:8px;right:8px;display:flex;gap:2px;padding:2px;border:1px solid rgba(255,255,255,.16);border-radius:7px;background:rgba(10,14,22,.78);backdrop-filter:blur(8px)}
.uguiSide_previewMode{height:23px;border:0;border-radius:5px;padding:0 7px;background:transparent;color:rgba(255,255,255,.62);font:inherit;font-size:10px;cursor:pointer}
.uguiSide_previewMode:hover{color:#fff;background:rgba(255,255,255,.08)}
.uguiSide_previewMode[data-active]{color:#fff;background:rgba(91,140,255,.72)}
.uguiSide_canvasWrap{flex:none;position:relative}
.uguiSide_canvas{position:absolute;left:0;top:0;transform-origin:top left;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.35);background-color:#11151f}
.uguiSide_previewShell[data-background="checker"] .uguiSide_canvas{background-color:#d7dbe2;background-image:linear-gradient(45deg,#aeb4bf 25%,transparent 25%),linear-gradient(-45deg,#aeb4bf 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#aeb4bf 75%),linear-gradient(-45deg,transparent 75%,#aeb4bf 75%);background-size:32px 32px;background-position:0 0,0 16px,16px -16px,-16px 0}
.uguiSide_previewShell[data-background="dark"] .uguiSide_canvas{background-color:#11151f;background-image:none}
.uguiSide_node{box-sizing:border-box;position:absolute;overflow:visible;touch-action:none}
.uguiSide_sprite{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;border-radius:inherit}
.uguiSide_node[data-selected]{z-index:20;outline-style:solid;outline-color:#5b8cff;outline-offset:0}
.uguiSide_node[data-drop-target]{z-index:30;outline:4px solid #65d6a6!important;outline-offset:-4px;background-blend-mode:normal}
.uguiSide_text{box-sizing:border-box;position:absolute;inset:0;display:flex;white-space:pre-wrap;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.15}
.uguiSide_nodeHandle{box-sizing:border-box;position:absolute;right:0;bottom:0;z-index:50;border:2px solid #fff;background:#5b8cff;transform:translate(50%,50%);cursor:nwse-resize;touch-action:none}
.uguiSide_inspector{min-height:0;overflow:auto;padding:8px}
.uguiSide_section{padding:7px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.uguiSide_section:last-child{border-bottom:0}
.uguiSide_sectionTitle{margin:0 0 7px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.uguiSide_path{margin:0 0 8px;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;word-break:break-all}
.uguiSide_fields{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.uguiSide_field{min-width:0;display:flex;align-items:center;gap:5px}
.uguiSide_fieldLabel{width:15px;flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;text-align:right}
.uguiSide_input{box-sizing:border-box;min-width:0;width:100%;height:28px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary);font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;padding:0 7px;outline:none}
.uguiSide_input:focus{border-color:var(--dsw-alias-state-business-primary,#4c7dff);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 15%,transparent)}
.uguiSide_select{box-sizing:border-box;width:100%;height:30px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;padding:0 7px;outline:none}
.uguiSide_select:focus{border-color:var(--dsw-alias-state-business-primary,#4c7dff);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4c7dff) 15%,transparent)}
.uguiSide_badge{display:inline-flex;min-height:19px;align-items:center;border-radius:5px;padding:0 6px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:10px}
.uguiSide_components{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.uguiSide_hint{margin:7px 0 0;color:var(--dsw-alias-label-caption);font-size:10px;line-height:15px}
.uguiSide_dropZone{box-sizing:border-box;width:100%;min-height:52px;margin-top:8px;border:1px dashed var(--dsw-alias-border-inverted);border-radius:7px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:15px;display:flex;align-items:center;justify-content:center;text-align:center;white-space:pre-line;padding:8px;cursor:copy}
.uguiSide_dropZone:hover,.uguiSide_dropZone[data-active]{border-color:#65d6a6;color:var(--dsw-alias-label-primary);background:color-mix(in srgb,#65d6a6 12%,transparent)}
.uguiSide_json{box-sizing:border-box;width:100%;height:100%;margin:0;border:0;padding:12px;background:var(--dsw-alias-markdown-code-block,#11151f);color:var(--dsw-alias-label-secondary);font:var(--dsw-font-markdown-code-block-small,11px/17px ui-monospace,SFMono-Regular,Menlo,monospace);white-space:pre;overflow:auto}
.uguiSide_footer{flex:none;border-top:1px solid var(--dsw-alias-border-l2);padding:6px 12px;color:var(--dsw-alias-label-caption);font-size:10px;line-height:15px;display:flex;justify-content:space-between;gap:12px}
@media(max-width:760px){.uguiSide_designer{grid-template-columns:150px minmax(230px,1fr)}.uguiSide_inspectorColumn{display:none}}
.uguiPlay_root{min-height:0;height:100%;display:flex;flex-direction:column;background:var(--dsw-alias-markdown-code-block,#11151f)}
.uguiPlay_toolbar{box-sizing:border-box;height:38px;flex:none;display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.72);font-size:11px}
.uguiPlay_toolbarBtn{height:26px;border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:0 9px;background:transparent;color:rgba(255,255,255,.75);font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}
.uguiPlay_toolbarBtn:hover:not(:disabled){background:rgba(255,255,255,.08);color:#fff}
.uguiPlay_toolbarBtn[data-active]{border-color:rgba(91,140,255,.85);background:rgba(91,140,255,.28);color:#fff}
.uguiPlay_toolbarBtn:disabled{cursor:default;opacity:.4}
.uguiPlay_hint{margin-left:auto;min-width:0;color:rgba(255,255,255,.45);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiPlay_shell{box-sizing:border-box;min-width:0;min-height:0;flex:1;padding:12px;background-color:var(--dsw-alias-markdown-code-block,#11151f);background-image:linear-gradient(45deg,rgba(127,127,127,.07) 25%,transparent 25%),linear-gradient(-45deg,rgba(127,127,127,.07) 25%,transparent 25%),linear-gradient(45deg,transparent 75%,rgba(127,127,127,.07) 75%),linear-gradient(-45deg,transparent 75%,rgba(127,127,127,.07) 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;display:flex;justify-content:center;align-items:center;overflow:auto;position:relative}
.uguiPlay_shell[data-background="checker"] .uguiPlay_canvas{background-color:#d7dbe2;background-image:linear-gradient(45deg,#aeb4bf 25%,transparent 25%),linear-gradient(-45deg,#aeb4bf 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#aeb4bf 75%),linear-gradient(-45deg,transparent 75%,#aeb4bf 75%);background-size:32px 32px;background-position:0 0,0 16px,16px -16px,-16px 0}
.uguiPlay_shell[data-background="dark"] .uguiPlay_canvas{background-color:#11151f;background-image:none}
.uguiPlay_canvas{position:absolute;left:0;top:0;transform-origin:top left;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.35);background-color:#11151f}
.uguiPlay_node{box-sizing:border-box;position:absolute;overflow:visible;touch-action:none;pointer-events:none;user-select:none;-webkit-user-select:none}
.uguiPlay_node[data-interactive],.uguiPlay_node[data-scroll-id]{pointer-events:auto}
.uguiPlay_node[data-interactive]:not([data-pstate="disabled"]):hover{filter:brightness(1.09)}
.uguiPlay_node[data-interactive]:not([data-pstate="disabled"]):active,.uguiPlay_node[data-pstate="pressed"]{filter:brightness(.93)}
.uguiPlay_node[data-pstate="disabled"]{opacity:.45;filter:saturate(.5)}
.uguiPlay_graphic{transition:opacity .16s ease}
.uguiPlay_scrollbar{transition:opacity .25s ease}
.uguiPlay_log{flex:none;display:flex;flex-direction:column;border-top:1px solid rgba(255,255,255,.1);background:rgba(10,14,22,.72)}
.uguiPlay_logHead{height:28px;flex:none;display:flex;align-items:center;gap:7px;padding:0 10px;color:rgba(255,255,255,.66);font-size:10px;font-weight:600;cursor:pointer;user-select:none}
.uguiPlay_logHead:hover{color:#fff}
.uguiPlay_logCount{min-width:16px;height:15px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;padding:0 5px;background:rgba(255,255,255,.12);font-size:9px;font-weight:500}
.uguiPlay_logClear{height:20px;border:0;border-radius:5px;padding:0 7px;background:transparent;color:rgba(255,255,255,.55);font:inherit;font-size:10px;cursor:pointer}
.uguiPlay_logClear:hover{background:rgba(255,255,255,.1);color:#fff}
.uguiPlay_logBody{height:118px;overflow:auto;padding:2px 10px 8px;font:10px/15px ui-monospace,SFMono-Regular,Menlo,monospace;color:rgba(255,255,255,.72)}
.uguiPlay_logRow{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uguiPlay_logTime{color:rgba(255,255,255,.35);margin-right:8px}
.uguiPlay_logEmpty{color:rgba(255,255,255,.35)}
`;
		const tagId = "dsh-local-ugui-tools";
		if (typeof document !== "undefined") {
			let tag = document.querySelector("style[data-plugin=" + JSON.stringify(tagId) + "]");
			if (tag === null) {
				tag = document.createElement("style");
				tag.dataset.plugin = tagId;
				document.head.appendChild(tag);
			}
			tag.textContent = css;
		}

		function pointerOwnerWindow(event) {
			const target = event && (event.currentTarget || event.target);
			return target && target.ownerDocument && target.ownerDocument.defaultView ? target.ownerDocument.defaultView : window;
		}

		function popoutPanelStyle() {
			return {
				inset: 0,
				width: "100vw",
				height: "100vh",
				minWidth: 0,
				minHeight: 0,
				maxWidth: "none",
				maxHeight: "none",
				borderRadius: 0,
				resize: "none"
			};
		}

		function synchronizePopoutTheme(popupDocument, sourceDocument, sourceThemeElement) {
			if (!popupDocument || !sourceDocument) return;
			if (typeof popupDocument.querySelector === "function" && typeof sourceDocument.querySelector === "function") {
				const selector = "style[data-plugin=" + JSON.stringify(tagId) + "]";
				const popupStyle = popupDocument.querySelector(selector);
				const sourceStyle = sourceDocument.querySelector(selector);
				if (popupStyle && sourceStyle && popupStyle.textContent !== sourceStyle.textContent) popupStyle.textContent = sourceStyle.textContent;
			}
			const sourceView = sourceDocument.defaultView || window;
			if (!sourceView || typeof sourceView.getComputedStyle !== "function") return;
			const themeStyles = sourceView.getComputedStyle(sourceThemeElement || sourceDocument.documentElement);
			for (let index = 0; index < themeStyles.length; index += 1) {
				const property = themeStyles[index];
				if (property && property.startsWith("--")) popupDocument.documentElement.style.setProperty(property, themeStyles.getPropertyValue(property));
			}
			const visualStyles = sourceThemeElement ? themeStyles : sourceView.getComputedStyle(sourceDocument.body);
			if (visualStyles.fontFamily) popupDocument.body.style.fontFamily = visualStyles.fontFamily;
			if (visualStyles.color) popupDocument.body.style.color = visualStyles.color;
			if (visualStyles.backgroundColor && visualStyles.backgroundColor !== "transparent" && visualStyles.backgroundColor !== "rgba(0, 0, 0, 0)") popupDocument.body.style.backgroundColor = visualStyles.backgroundColor;
		}

		function preparePopoutDocument(popup, title, sourceDocument, sourceThemeElement) {
			const popupDocument = popup.document;
			popupDocument.title = title;
			popupDocument.documentElement.lang = "zh-CN";
			Object.assign(popupDocument.documentElement.style, { width: "100%", height: "100%", margin: "0", overflow: "hidden" });
			Object.assign(popupDocument.body.style, { width: "100%", height: "100%", margin: "0", overflow: "hidden" });
			if (typeof popupDocument.body.replaceChildren === "function") popupDocument.body.replaceChildren();
			const oldStyle = typeof popupDocument.querySelector === "function" ? popupDocument.querySelector("style[data-plugin=" + JSON.stringify(tagId) + "]") : null;
			if (oldStyle && typeof oldStyle.remove === "function") oldStyle.remove();
			const styleTag = popupDocument.createElement("style");
			styleTag.dataset.plugin = tagId;
			styleTag.textContent = css;
			popupDocument.head.appendChild(styleTag);
			const mount = popupDocument.createElement("div");
			mount.id = "ugui-popout-root";
			Object.assign(mount.style, { width: "100%", height: "100%" });
			popupDocument.body.appendChild(mount);
			synchronizePopoutTheme(popupDocument, sourceDocument, sourceThemeElement);
			return mount;
		}

		const targetClientInstanceId = (() => {
			try {
				if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
			} catch {}
			return "ugui-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
		})();
		const emptyEditorTargetState = Object.freeze({ status: "idle", target: null, revision: 0, fingerprint: "", error: "" });
		const editorTargetStates = new Map();
		const editorTargetListeners = new Map();

		function getEditorTargetState(sessionId) {
			return editorTargetStates.get(String(sessionId)) || emptyEditorTargetState;
		}

		function publishEditorTargetState(sessionId, state) {
			const key = String(sessionId);
			editorTargetStates.set(key, Object.freeze(state));
			const listeners = editorTargetListeners.get(key);
			if (listeners) for (const listener of [...listeners]) listener();
		}

		function subscribeEditorTargetState(sessionId, listener) {
			const key = String(sessionId);
			let listeners = editorTargetListeners.get(key);
			if (!listeners) {
				listeners = new Set();
				editorTargetListeners.set(key, listeners);
			}
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0) editorTargetListeners.delete(key);
			};
		}

		function postEditorTarget(sessionId, target, clear, force) {
			const key = String(sessionId);
			const previous = getEditorTargetState(key);
			const fingerprint = clear ? "clear" : [target.canvasId, target.canvasVersion, target.nodeId || "", target.nodePath.join(".")].join("|");
			if (!force && previous.fingerprint === fingerprint && (previous.status === "ready" || previous.status === "syncing")) return;
			const revision = previous.revision + 1;
			const localTarget = clear ? null : Object.freeze({
				canvasId: target.canvasId,
				uiName: target.uiName,
				canvasVersion: target.canvasVersion,
				targetScope: target.nodePath.length === 0 ? "canvas" : "node",
				nodeId: target.nodeId || "",
				nodePath: Object.freeze([...target.nodePath]),
				breadcrumb: Object.freeze([...target.breadcrumb])
			});
			publishEditorTargetState(key, { status: "syncing", target: localTarget, revision, fingerprint, error: "" });
			const body = clear ? {
				sessionId: key,
				clientInstanceId: targetClientInstanceId,
				clientRevision: revision,
				clear: true
			} : {
				sessionId: key,
				clientInstanceId: targetClientInstanceId,
				clientRevision: revision,
				canvasId: localTarget.canvasId,
				canvasVersion: localTarget.canvasVersion,
				nodeId: localTarget.nodeId,
				nodePath: localTarget.nodePath
			};
			fetch("/local/ugui-context", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			}).then(async (response) => {
				const result = await response.json().catch(() => null);
				if (!response.ok || !result || result.ok !== true) throw new Error(result && result.error ? result.error : "HTTP " + response.status);
				if (result.accepted === false) throw new Error("目标同步请求已过期，请重试");
				const current = getEditorTargetState(key);
				if (current.revision !== revision) return;
				publishEditorTargetState(key, { status: clear ? "idle" : "ready", target: localTarget, revision, fingerprint, error: "" });
			}).catch((reason) => {
				const current = getEditorTargetState(key);
				if (current.revision !== revision) return;
				publishEditorTargetState(key, {
					status: "error",
					target: localTarget,
					revision,
					fingerprint,
					error: String(reason && reason.message ? reason.message : reason)
				});
			});
		}

		function synchronizeEditorTarget(sessionId, target, force) {
			postEditorTarget(sessionId, target, false, force === true);
		}

		function clearEditorTarget(sessionId) {
			postEditorTarget(sessionId, null, true, true);
		}

		function useEditorTargetState(sessionId) {
			const subscribe = react.useCallback((listener) => subscribeEditorTargetState(sessionId, listener), [sessionId]);
			const snapshot = react.useCallback(() => getEditorTargetState(sessionId), [sessionId]);
			return react.useSyncExternalStore(subscribe, snapshot, snapshot);
		}

		function designerIcon(size) {
			return h("svg", { width: size, height: size, viewBox: "0 0 20 20", fill: "none", "aria-hidden": true },
				h("rect", { x: "2.5", y: "3", width: "15", height: "12", rx: "2", stroke: "currentColor", strokeWidth: "1.4" }),
				h("path", { d: "M6 17h8M10 15v2M5.5 6.5h4v3h-4zM11.8 6.5h2.7M11.8 9h2.7M5.5 11.5h9", stroke: "currentColor", strokeWidth: "1.25", strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		function refreshIcon() {
			return h("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
				h("path", { d: "M13.1 5.9A5.3 5.3 0 1 0 13 10.5M13.2 2.8v3.4H9.8", stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round", strokeLinejoin: "round" }));
		}

		function closeIcon() {
			return h("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
				h("path", { d: "M4 4l8 8M12 4l-8 8", stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round" }));
		}

		function numberAt(value, fallback) {
			return typeof value === "number" && Number.isFinite(value) ? value : fallback;
		}

		function vec(value, fallback) {
			return Array.isArray(value) ? value : fallback;
		}

		function canvasSize(dsl) {
			const resolution = dsl && dsl.canvas && Array.isArray(dsl.canvas.referenceResolution) ? dsl.canvas.referenceResolution : [1080, 1920];
			return [Math.max(1, numberAt(resolution[0], 1080)), Math.max(1, numberAt(resolution[1], 1920))];
		}

		function frameOf(rect, parentWidth, parentHeight) {
			const source = rect && typeof rect === "object" ? rect : {};
			const anchor = typeof source.anchor === "string" ? source.anchor : "center";
			const size = vec(source.size, [100, 100]);
			const offset = vec(source.offset, [0, 0, 0, 0]);
			const width = numberAt(size[0], 100);
			const height = numberAt(size[1], 100);
			const ox = numberAt(offset[0], 0);
			const oy = numberAt(offset[1], 0);
			if (anchor === "stretch") {
				const right = numberAt(offset[2], 0);
				const bottom = numberAt(offset[3], 0);
				return { x: ox, y: oy, width: Math.max(0, parentWidth - ox - right), height: Math.max(0, parentHeight - oy - bottom) };
			}
			if (anchor === "topLeft") return { x: ox, y: oy, width, height };
			if (anchor === "topCenter") return { x: (parentWidth - width) / 2 + ox, y: oy, width, height };
			if (anchor === "topRight") return { x: parentWidth - width - ox, y: oy, width, height };
			if (anchor === "middleLeft") return { x: ox, y: (parentHeight - height) / 2 - oy, width, height };
			if (anchor === "middleRight") return { x: parentWidth - width - ox, y: (parentHeight - height) / 2 - oy, width, height };
			if (anchor === "bottomLeft") return { x: ox, y: parentHeight - height - oy, width, height };
			if (anchor === "bottomCenter") return { x: (parentWidth - width) / 2 + ox, y: parentHeight - height - oy, width, height };
			if (anchor === "bottomRight") return { x: parentWidth - width - ox, y: parentHeight - height - oy, width, height };
			if (anchor === "topStretch") return { x: ox, y: oy, width: parentWidth, height };
			if (anchor === "bottomStretch") return { x: ox, y: parentHeight - height - oy, width: parentWidth, height };
			if (anchor === "leftStretch") return { x: ox, y: -oy, width, height: parentHeight };
			if (anchor === "rightStretch") return { x: parentWidth - width - ox, y: -oy, width, height: parentHeight };
			if (anchor === "custom") {
				const anchorMin = vec(source.anchorMin, [0.5, 0.5]);
				const anchorMax = vec(source.anchorMax, anchorMin);
				const pivot = vec(source.pivot, [0.5, 0.5]);
				const position = vec(source.position, [0, 0]);
				const px = numberAt(pivot[0], 0.5);
				const py = numberAt(pivot[1], 0.5);
				const minX = numberAt(anchorMin[0], 0.5);
				const minY = numberAt(anchorMin[1], 0.5);
				const maxX = numberAt(anchorMax[0], minX);
				const maxY = numberAt(anchorMax[1], minY);
				const actualWidth = Math.max(0, parentWidth * (maxX - minX) + width);
				const actualHeight = Math.max(0, parentHeight * (maxY - minY) + height);
				const anchorX = parentWidth * (minX + (maxX - minX) * px);
				const anchorY = parentHeight * (minY + (maxY - minY) * py);
				const x = anchorX + numberAt(position[0], 0) - actualWidth * px;
				const y = parentHeight - (anchorY + numberAt(position[1], 0)) - actualHeight * (1 - py);
				return { x, y, width: actualWidth, height: actualHeight };
			}
			return { x: (parentWidth - width) / 2 + ox, y: (parentHeight - height) / 2 - oy, width, height };
		}

		function customTopLeft(rect, frame) {
			const next = Object.assign({}, rect || {}, {
				anchor: "custom",
				anchorMin: [0, 1],
				anchorMax: [0, 1],
				pivot: [0, 1],
				position: [frame.x, -frame.y],
				size: [frame.width, frame.height]
			});
			delete next.offset;
			return next;
		}

		function rectFromFrame(rect, frame, parentWidth, parentHeight) {
			const source = Object.assign({}, rect || {});
			const anchor = typeof source.anchor === "string" ? source.anchor : "center";
			const target = {
				x: numberAt(frame.x, 0),
				y: numberAt(frame.y, 0),
				width: Math.max(1, numberAt(frame.width, 1)),
				height: Math.max(1, numberAt(frame.height, 1))
			};
			if (anchor === "stretch") {
				source.offset = [target.x, target.y, parentWidth - target.x - target.width, parentHeight - target.y - target.height];
				return source;
			}
			if (anchor === "custom") {
				const anchorMin = vec(source.anchorMin, [0.5, 0.5]);
				const anchorMax = vec(source.anchorMax, anchorMin);
				const pivot = vec(source.pivot, [0.5, 0.5]);
				const minX = numberAt(anchorMin[0], 0.5);
				const minY = numberAt(anchorMin[1], 0.5);
				const maxX = numberAt(anchorMax[0], minX);
				const maxY = numberAt(anchorMax[1], minY);
				const px = numberAt(pivot[0], 0.5);
				const py = numberAt(pivot[1], 0.5);
				const anchorX = parentWidth * (minX + (maxX - minX) * px);
				const anchorY = parentHeight * (minY + (maxY - minY) * py);
				source.size = [target.width - parentWidth * (maxX - minX), target.height - parentHeight * (maxY - minY)];
				source.position = [target.x - anchorX + target.width * px, parentHeight - anchorY - target.y - target.height * (1 - py)];
				return source;
			}
			if (anchor === "topLeft") {
				source.size = [target.width, target.height];
				source.offset = [target.x, target.y];
				return source;
			}
			if (anchor === "topCenter") {
				source.size = [target.width, target.height];
				source.offset = [target.x - (parentWidth - target.width) / 2, target.y];
				return source;
			}
			if (anchor === "topRight") {
				source.size = [target.width, target.height];
				source.offset = [parentWidth - target.width - target.x, target.y];
				return source;
			}
			if (anchor === "middleLeft") {
				source.size = [target.width, target.height];
				source.offset = [target.x, (parentHeight - target.height) / 2 - target.y];
				return source;
			}
			if (anchor === "middleRight") {
				source.size = [target.width, target.height];
				source.offset = [parentWidth - target.width - target.x, (parentHeight - target.height) / 2 - target.y];
				return source;
			}
			if (anchor === "bottomLeft") {
				source.size = [target.width, target.height];
				source.offset = [target.x, parentHeight - target.height - target.y];
				return source;
			}
			if (anchor === "bottomCenter") {
				source.size = [target.width, target.height];
				source.offset = [target.x - (parentWidth - target.width) / 2, parentHeight - target.height - target.y];
				return source;
			}
			if (anchor === "bottomRight") {
				source.size = [target.width, target.height];
				source.offset = [parentWidth - target.width - target.x, parentHeight - target.height - target.y];
				return source;
			}
			if (anchor === "topStretch") {
				if (Math.abs(target.width - parentWidth) > 0.01) return customTopLeft(source, target);
				source.size = [0, target.height];
				source.offset = [target.x, target.y];
				return source;
			}
			if (anchor === "bottomStretch") {
				if (Math.abs(target.width - parentWidth) > 0.01) return customTopLeft(source, target);
				source.size = [0, target.height];
				source.offset = [target.x, parentHeight - target.height - target.y];
				return source;
			}
			if (anchor === "leftStretch") {
				if (Math.abs(target.height - parentHeight) > 0.01) return customTopLeft(source, target);
				source.size = [target.width, 0];
				source.offset = [target.x, -target.y];
				return source;
			}
			if (anchor === "rightStretch") {
				if (Math.abs(target.height - parentHeight) > 0.01) return customTopLeft(source, target);
				source.size = [target.width, 0];
				source.offset = [parentWidth - target.width - target.x, -target.y];
				return source;
			}
			source.size = [target.width, target.height];
			source.offset = [target.x - (parentWidth - target.width) / 2, (parentHeight - target.height) / 2 - target.y];
			return source;
		}

		const anchorOptions = [
			["center", "中心"],
			["topLeft", "左上"],
			["topCenter", "顶部居中"],
			["topRight", "右上"],
			["middleLeft", "左中"],
			["middleRight", "右中"],
			["bottomLeft", "左下"],
			["bottomCenter", "底部居中"],
			["bottomRight", "右下"],
			["topStretch", "顶部横向拉伸"],
			["bottomStretch", "底部横向拉伸"],
			["leftStretch", "左侧纵向拉伸"],
			["rightStretch", "右侧纵向拉伸"],
			["stretch", "四向拉伸"],
			["custom", "自定义锚点"]
		];

		function rectForAnchor(anchor, frame, parentWidth, parentHeight, currentRect) {
			const x = frame.x;
			const y = frame.y;
			const width = Math.max(1, frame.width);
			const height = Math.max(1, frame.height);
			if (anchor === "topLeft") return { anchor, offset: [x, y], size: [width, height] };
			if (anchor === "topCenter") return { anchor, offset: [x - (parentWidth - width) / 2, y], size: [width, height] };
			if (anchor === "topRight") return { anchor, offset: [parentWidth - width - x, y], size: [width, height] };
			if (anchor === "middleLeft") return { anchor, offset: [x, (parentHeight - height) / 2 - y], size: [width, height] };
			if (anchor === "middleRight") return { anchor, offset: [parentWidth - width - x, (parentHeight - height) / 2 - y], size: [width, height] };
			if (anchor === "bottomLeft") return { anchor, offset: [x, parentHeight - height - y], size: [width, height] };
			if (anchor === "bottomCenter") return { anchor, offset: [x - (parentWidth - width) / 2, parentHeight - height - y], size: [width, height] };
			if (anchor === "bottomRight") return { anchor, offset: [parentWidth - width - x, parentHeight - height - y], size: [width, height] };
			if (anchor === "topStretch") return { anchor, offset: [0, y], size: [0, height] };
			if (anchor === "bottomStretch") return { anchor, offset: [0, parentHeight - height - y], size: [0, height] };
			if (anchor === "leftStretch") return { anchor, offset: [x, 0], size: [width, 0] };
			if (anchor === "rightStretch") return { anchor, offset: [parentWidth - width - x, 0], size: [width, 0] };
			if (anchor === "stretch") return { anchor, offset: [x, y, parentWidth - x - width, parentHeight - y - height] };
			if (anchor === "custom") return customTopLeft(currentRect, { x, y, width, height });
			return { anchor: "center", offset: [x - (parentWidth - width) / 2, (parentHeight - height) / 2 - y], size: [width, height] };
		}

		function componentOf(node, type) {
			const components = Array.isArray(node && node.components) ? node.components : [];
			return components.find((component) => component && component.type === type);
		}

		function layoutPadding(component) {
			const values = component && Array.isArray(component.padding) ? component.padding : [];
			return {
				left: Math.max(0, numberAt(values[0], 0)),
				right: Math.max(0, numberAt(values[1], 0)),
				top: Math.max(0, numberAt(values[2], 0)),
				bottom: Math.max(0, numberAt(values[3], 0))
			};
		}

		function alignmentFactors(value) {
			const name = typeof value === "string" ? value : "upperLeft";
			return {
				x: name.endsWith("Center") ? 0.5 : name.endsWith("Right") ? 1 : 0,
				y: name.startsWith("middle") ? 0.5 : name.startsWith("lower") ? 1 : 0
			};
		}

		function layoutFramesForChildren(node, parentWidth, parentHeight) {
			const children = Array.isArray(node && node.children) ? node.children : [];
			const base = children.map((child) => frameOf(child && child.rect, parentWidth, parentHeight));
			const horizontal = componentOf(node, "HorizontalLayoutGroup");
			const vertical = componentOf(node, "VerticalLayoutGroup");
			const grid = componentOf(node, "GridLayoutGroup");
			const layout = horizontal || vertical || grid;
			if (!layout || children.length === 0) return base;
			const padding = layoutPadding(layout);
			const availableWidth = Math.max(0, parentWidth - padding.left - padding.right);
			const availableHeight = Math.max(0, parentHeight - padding.top - padding.bottom);
			const alignment = alignmentFactors(layout.childAlignment);
			if (grid) {
				const cell = Array.isArray(grid.cellSize) ? grid.cellSize : [100, 100];
				const gap = Array.isArray(grid.spacing) ? grid.spacing : [0, 0];
				const cellWidth = Math.max(0, numberAt(cell[0], 100));
				const cellHeight = Math.max(0, numberAt(cell[1], 100));
				const gapX = numberAt(gap[0], 0);
				const gapY = numberAt(gap[1], 0);
				const count = children.length;
				const constraintCount = Math.max(1, Math.round(numberAt(grid.constraintCount, 2)));
				let columns;
				let rows;
				if (grid.constraint === "fixedColumnCount") {
					columns = constraintCount;
					rows = Math.ceil(count / columns);
				} else if (grid.constraint === "fixedRowCount") {
					rows = constraintCount;
					columns = Math.ceil(count / rows);
				} else {
					columns = Math.max(1, Math.floor((availableWidth + gapX) / Math.max(1, cellWidth + gapX)));
					rows = Math.ceil(count / columns);
				}
				const totalWidth = columns * cellWidth + Math.max(0, columns - 1) * gapX;
				const totalHeight = rows * cellHeight + Math.max(0, rows - 1) * gapY;
				const originX = padding.left + Math.max(0, availableWidth - totalWidth) * alignment.x;
				const originY = padding.top + Math.max(0, availableHeight - totalHeight) * alignment.y;
				return children.map((_child, index) => {
					let column;
					let row;
					if (grid.startAxis === "vertical") {
						row = index % rows;
						column = Math.floor(index / rows);
					} else {
						column = index % columns;
						row = Math.floor(index / columns);
					}
					if (grid.startCorner === "upperRight" || grid.startCorner === "lowerRight") column = columns - 1 - column;
					if (grid.startCorner === "lowerLeft" || grid.startCorner === "lowerRight") row = rows - 1 - row;
					return { x: originX + column * (cellWidth + gapX), y: originY + row * (cellHeight + gapY), width: cellWidth, height: cellHeight };
				});
			}
			const spacing = numberAt(layout.spacing, 0);
			const isHorizontal = Boolean(horizontal);
			const controlMain = isHorizontal ? layout.childControlWidth !== false : layout.childControlHeight !== false;
			const expandMain = isHorizontal ? layout.childForceExpandWidth !== false : layout.childForceExpandHeight !== false;
			const controlCross = isHorizontal ? layout.childControlHeight !== false : layout.childControlWidth !== false;
			const expandCross = isHorizontal ? layout.childForceExpandHeight !== false : layout.childForceExpandWidth !== false;
			const availableMain = isHorizontal ? availableWidth : availableHeight;
			const availableCross = isHorizontal ? availableHeight : availableWidth;
			const spacingTotal = Math.max(0, children.length - 1) * spacing;
			const equalMain = Math.max(0, (availableMain - spacingTotal) / children.length);
			const mainSizes = base.map((frame) => controlMain && expandMain ? equalMain : isHorizontal ? frame.width : frame.height);
			const totalMain = mainSizes.reduce((sum, value) => sum + value, 0) + spacingTotal;
			const mainFactor = isHorizontal ? alignment.x : alignment.y;
			let cursor = (isHorizontal ? padding.left : padding.top) + Math.max(0, availableMain - totalMain) * mainFactor;
			const order = children.map((_child, index) => index);
			if (layout.reverseArrangement === true) order.reverse();
			const frames = new Array(children.length);
			for (const index of order) {
				const baseFrame = base[index];
				const mainSize = mainSizes[index];
				const baseCross = isHorizontal ? baseFrame.height : baseFrame.width;
				const crossSize = controlCross && expandCross ? availableCross : baseCross;
				const crossFactor = isHorizontal ? alignment.y : alignment.x;
				const cross = (isHorizontal ? padding.top : padding.left) + Math.max(0, availableCross - crossSize) * crossFactor;
				frames[index] = isHorizontal
					? { x: cursor, y: cross, width: mainSize, height: crossSize }
					: { x: cross, y: cursor, width: crossSize, height: mainSize };
				cursor += mainSize + spacing;
			}
			return frames;
		}

		function findDescendantPreviewNode(node, name) {
			if (!node || !Array.isArray(node.children)) return null;
			for (const child of node.children) {
				if (child && child.name === name) return child;
				const nested = findDescendantPreviewNode(child, name);
				if (nested) return nested;
			}
			return null;
		}

		function findPreviewNodeById(node, nodeId) {
			if (!node || typeof node !== "object") return null;
			if (node.nodeId === nodeId) return node;
			if (Array.isArray(node.children)) {
				for (const child of node.children) {
					const nested = findPreviewNodeById(child, nodeId);
					if (nested) return nested;
				}
			}
			return null;
		}

		function previewHiddenNodeIds(root) {
			const hidden = new Set();
			function visit(node) {
				if (!node || typeof node !== "object") return;
				const toggle = componentOf(node, "Toggle");
				if (toggle && toggle.isOn !== true) {
					const graphic = typeof toggle.graphicNodeId === "string" && toggle.graphicNodeId !== ""
						? findPreviewNodeById(root, toggle.graphicNodeId)
						: findDescendantPreviewNode(node, "Checkmark");
					if (graphic && typeof graphic.nodeId === "string") hidden.add(graphic.nodeId);
				}
				if (Array.isArray(node.children)) node.children.forEach(visit);
			}
			visit(root);
			return hidden;
		}

		function previewNodeFlags(node) {
			return {
				clipsChildren: Boolean(componentOf(node, "Mask") || componentOf(node, "RectMask2D") || componentOf(node, "ScrollRect"))
			};
		}

		function textStyle(component) {
			const align = component.align === "left" ? "flex-start" : component.align === "right" ? "flex-end" : "center";
			const vertical = component.vAlign === "top" ? "flex-start" : component.vAlign === "bottom" ? "flex-end" : "center";
			return {
				color: component.color || "#FFFFFFFF",
				fontSize: Math.max(8, numberAt(component.fontSize, 24)),
				fontWeight: component.fontStyle && String(component.fontStyle).toLowerCase().includes("bold") ? 700 : 500,
				justifyContent: align,
				alignItems: vertical,
				textAlign: component.align === "left" || component.align === "right" ? component.align : "center",
				padding: "0 4px"
			};
		}

		function pathKey(path) {
			return path.length === 0 ? "root" : path.join(".");
		}

		function treeCollapseKey(node, path) {
			return node && typeof node.nodeId === "string" && node.nodeId !== "" ? node.nodeId : "path:" + pathKey(path);
		}

		function treeCollapseStorageKey(canvasId) {
			return "dsh.ugui.treeCollapsed." + String(canvasId || "default");
		}

		function readTreeCollapsed(canvasId, root) {
			try {
				const parsed = JSON.parse(localStorage.getItem(treeCollapseStorageKey(canvasId)) || "[]");
				if (!Array.isArray(parsed)) return new Set();
				const valid = new Set();
				function visit(node, path) {
					if (!node || !Array.isArray(node.children) || node.children.length === 0) return;
					valid.add(treeCollapseKey(node, path));
					for (let index = 0; index < node.children.length; index += 1) visit(node.children[index], path.concat(index));
				}
				visit(root, []);
				return new Set(parsed.filter((value) => typeof value === "string" && valid.has(value)));
			} catch {
				return new Set();
			}
		}

		function writeTreeCollapsed(canvasId, collapsed) {
			try {
				localStorage.setItem(treeCollapseStorageKey(canvasId), JSON.stringify([...collapsed].filter((key) => !key.startsWith("path:")).sort()));
			} catch {}
		}

		function selectedAncestorCollapseKeys(root, selectedPath) {
			const keys = [];
			let node = root;
			for (let depth = 0; depth < selectedPath.length; depth += 1) {
				if (!node || !Array.isArray(node.children)) break;
				keys.push(treeCollapseKey(node, selectedPath.slice(0, depth)));
				node = node.children[selectedPath[depth]];
			}
			return keys;
		}

		function nodeAtPath(root, path) {
			let node = root;
			for (const index of path) {
				if (!node || !Array.isArray(node.children) || !node.children[index]) return null;
				node = node.children[index];
			}
			return node;
		}

		function findNodePathById(root, nodeId) {
			if (!root || typeof nodeId !== "string" || nodeId === "") return null;
			let found = null;
			function visit(node, path) {
				if (found || !node || typeof node !== "object") return;
				if (node.nodeId === nodeId) {
					found = [...path];
					return;
				}
				if (Array.isArray(node.children)) {
					for (let index = 0; index < node.children.length; index += 1) visit(node.children[index], path.concat(index));
				}
			}
			visit(root, []);
			return found;
		}

		function nodeBreadcrumb(root, path) {
			if (!root || !Array.isArray(path)) return [];
			const names = [String(root.name || "Root")];
			let node = root;
			for (const index of path) {
				if (!Array.isArray(node.children) || !node.children[index]) break;
				node = node.children[index];
				names.push(String(node.name || "未命名节点"));
			}
			return names;
		}

		function nodeMeta(dsl, path) {
			if (!dsl || !dsl.root || !Array.isArray(path)) return null;
			const resolution = canvasSize(dsl);
			let node = dsl.root;
			let frame = { x: 0, y: 0, width: resolution[0], height: resolution[1] };
			let parentWidth = resolution[0];
			let parentHeight = resolution[1];
			for (const index of path) {
				if (!Array.isArray(node.children) || !node.children[index]) return null;
				parentWidth = frame.width;
				parentHeight = frame.height;
				node = node.children[index];
				frame = frameOf(node.rect, parentWidth, parentHeight);
			}
			return { node, frame, parentWidth, parentHeight, root: path.length === 0 };
		}

		function replaceNodeRect(dsl, path, rect) {
			const clone = JSON.parse(JSON.stringify(dsl));
			const node = nodeAtPath(clone.root, path);
			if (node) node.rect = rect;
			return clone;
		}

		function tintRgba(value) {
			const source = typeof value === "string" ? value.replace(/^#/, "") : "FFFFFFFF";
			const hex = source.length === 6 ? source + "FF" : source;
			if (!/^[0-9a-f]{8}$/i.test(hex)) return [255, 255, 255, 255];
			return [0, 2, 4, 6].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
		}

		function SpriteLayer({ src, color, preserveAspect }) {
			const canvasRef = react.useRef(null);
			react.useEffect(() => {
				let disposed = false;
				const source = new globalThis.Image();
				source.decoding = "async";
				source.onload = () => {
					if (disposed || !canvasRef.current) return;
					const canvas = canvasRef.current;
					const width = Math.max(1, source.naturalWidth || source.width || 1);
					const height = Math.max(1, source.naturalHeight || source.height || 1);
					canvas.width = width;
					canvas.height = height;
					const context = canvas.getContext("2d", { willReadFrequently: true });
					if (!context) return;
					context.clearRect(0, 0, width, height);
					context.drawImage(source, 0, 0, width, height);
					const tint = tintRgba(color);
					if (tint[0] === 255 && tint[1] === 255 && tint[2] === 255 && tint[3] === 255) return;
					const pixels = context.getImageData(0, 0, width, height);
					const data = pixels.data;
					for (let index = 0; index < data.length; index += 4) {
						data[index] = Math.round(data[index] * tint[0] / 255);
						data[index + 1] = Math.round(data[index + 1] * tint[1] / 255);
						data[index + 2] = Math.round(data[index + 2] * tint[2] / 255);
						data[index + 3] = Math.round(data[index + 3] * tint[3] / 255);
					}
					context.putImageData(pixels, 0, 0);
				};
				source.src = src;
				return () => {
					disposed = true;
					source.onload = null;
				};
			}, [src, color]);
			return h("canvas", {
				ref: canvasRef,
				className: "uguiSide_sprite",
				style: { objectFit: preserveAspect ? "contain" : "fill" },
				"aria-hidden": true
			});
		}

		function renderNode(node, parentWidth, parentHeight, path, selectedKey, scale, onSelect, onBeginGesture, onImageDrop, root, selectedGestureTarget, previewContext, frameOverride, layoutDriven) {
			if (!node || typeof node !== "object") return null;
			const frame = root ? { x: 0, y: 0, width: parentWidth, height: parentHeight } : frameOverride || frameOf(node.rect, parentWidth, parentHeight);
			const image = componentOf(node, "Image");
			const mask = componentOf(node, "Mask");
			const showOwnGraphic = !mask || mask.showMaskGraphic !== false;
			const button = componentOf(node, "Button");
			const label = componentOf(node, "TMP_Text");
			const key = pathKey(path);
			const selected = key === selectedKey;
			const ownGestureTarget = root || layoutDriven ? null : { path, frame, parentWidth, parentHeight, rect: node.rect || {}, key };
			const activeGestureTarget = selectedGestureTarget || (selected ? ownGestureTarget : null);
			const spritePath = image && typeof image.spritePath === "string" ? image.spritePath : "";
			const flags = previewNodeFlags(node);
			const childFrames = layoutFramesForChildren(node, frame.width, frame.height);
			const drivesChildLayout = Boolean(componentOf(node, "HorizontalLayoutGroup") || componentOf(node, "VerticalLayoutGroup") || componentOf(node, "GridLayoutGroup"));
			const style = {
				left: frame.x,
				top: frame.y,
				width: frame.width,
				height: frame.height,
				backgroundColor: showOwnGraphic && !spritePath && image && image.color ? image.color : "transparent",
				borderRadius: button ? Math.min(18, Math.max(5, frame.height * 0.12)) : 0,
				boxShadow: button ? "inset 0 0 0 2px rgba(255,255,255,.12)" : "none",
				outlineWidth: selected ? 2 / scale : 0,
				cursor: root || layoutDriven ? "default" : "move",
				overflow: flags.clipsChildren ? "hidden" : "visible",
				opacity: previewContext && previewContext.hiddenNodeIds.has(node.nodeId) ? 0 : 1
			};
			const children = [];
			if (showOwnGraphic && spritePath) children.push(h(SpriteLayer, {
				key: "sprite",
				src: "/local/ugui-asset?spritePath=" + encodeURIComponent(spritePath),
				color: image.color || "#FFFFFFFF",
				preserveAspect: image.preserveAspect === true
			}));
			if (label) children.push(h("div", { key: "text", className: "uguiSide_text", style: textStyle(label) }, String(label.text || "")));
			if (Array.isArray(node.children)) {
				for (let index = 0; index < node.children.length; index += 1) {
					children.push(renderNode(node.children[index], frame.width, frame.height, path.concat(index), selectedKey, scale, onSelect, onBeginGesture, onImageDrop, false, activeGestureTarget, previewContext, childFrames[index], drivesChildLayout || layoutDriven));
				}
			}
			if (selected && !root && !layoutDriven) {
				children.push(h("span", {
					key: "resize",
					className: "uguiSide_nodeHandle",
					style: { width: 12 / scale, height: 12 / scale, borderWidth: Math.max(1, 2 / scale) },
					title: "拖动调整大小",
					onPointerDown: (event) => {
						event.stopPropagation();
						onBeginGesture(event, path, "resize", frame, parentWidth, parentHeight, node.rect || {}, scale);
					}
				}));
			}
			return h("div", {
				key,
				className: "uguiSide_node",
				"data-selected": selected || undefined,
				"data-components": Array.isArray(node.components) ? node.components.map((component) => component && component.type).filter(Boolean).join(" ") : undefined,
				style,
				title: String(node.name || "未命名节点") + (layoutDriven ? "（由父级 LayoutGroup 控制）" : ""),
				onPointerDown: (event) => {
					event.stopPropagation();
					const gestureTarget = activeGestureTarget || ownGestureTarget;
					const deferredSelection = activeGestureTarget && activeGestureTarget.key !== key ? path : null;
					if (!activeGestureTarget) onSelect(path);
					if (gestureTarget && event.button === 0) {
						onBeginGesture(event, gestureTarget.path, "move", gestureTarget.frame, gestureTarget.parentWidth, gestureTarget.parentHeight, gestureTarget.rect, scale, deferredSelection);
					}
				},
				onDragOver: image ? (event) => {
					event.preventDefault();
					event.stopPropagation();
					event.dataTransfer.dropEffect = "copy";
					event.currentTarget.dataset.dropTarget = "true";
				} : undefined,
				onDragLeave: image ? (event) => {
					delete event.currentTarget.dataset.dropTarget;
				} : undefined,
				onDrop: image ? (event) => {
					event.preventDefault();
					event.stopPropagation();
					delete event.currentTarget.dataset.dropTarget;
					onSelect(path);
					onImageDrop(path, event.dataTransfer);
				} : undefined
			}, children);
		}

		function initialPreviewBackground() {
			try {
				return localStorage.getItem("dsh.ugui.previewBackground") === "dark" ? "dark" : "checker";
			} catch {
				return "checker";
			}
		}

		function Preview({ dsl, selectedPath, onSelect, onBeginGesture, onImageDrop }) {
			const shellRef = react.useRef(null);
			const [bounds, setBounds] = react.useState({ width: 440, height: 620 });
			const [background, setBackground] = react.useState(initialPreviewBackground);
			const selectBackground = react.useCallback((value) => {
				setBackground(value);
				try { localStorage.setItem("dsh.ugui.previewBackground", value); } catch {}
			}, []);
			react.useLayoutEffect(() => {
				const shell = shellRef.current;
				if (!shell) return;
				function measure() {
					const element = shellRef.current;
					if (!element) return;
					const rect = element.getBoundingClientRect();
					const width = Math.max(element.clientWidth || 0, rect.width || 0);
					const height = Math.max(element.clientHeight || 0, rect.height || 0);
					// Ignore transient zero-size observations while the floating panel enters layout.
					if (!Number.isFinite(width) || !Number.isFinite(height) || width < 120 || height < 120) return;
					setBounds((current) => Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5 ? current : { width, height });
				}
				measure();
				const frame = window.requestAnimationFrame(measure);
				const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
				if (observer) observer.observe(shell);
				window.addEventListener("resize", measure);
				return () => {
					window.cancelAnimationFrame(frame);
					if (observer) observer.disconnect();
					window.removeEventListener("resize", measure);
				};
			}, []);
			if (!dsl || !dsl.root) return h("p", { className: "uguiSide_note" }, "还没有可预览的 DSL。");
			const resolution = canvasSize(dsl);
			const width = resolution[0];
			const height = resolution[1];
			const measuredWidth = Number.isFinite(bounds.width) && bounds.width >= 120 ? bounds.width : 440;
			const measuredHeight = Number.isFinite(bounds.height) && bounds.height >= 120 ? bounds.height : 620;
			const scale = Math.max(0.03, Math.min(1, (measuredWidth - 24) / width, (measuredHeight - 24) / height));
			const previewContext = { hiddenNodeIds: previewHiddenNodeIds(dsl.root) };
			return h("div", { ref: shellRef, className: "uguiSide_previewShell", "data-background": background },
				h("div", { className: "uguiSide_previewModes", role: "group", "aria-label": "预览背景" },
					h("button", { type: "button", className: "uguiSide_previewMode", "data-active": background === "checker" || undefined, onClick: () => selectBackground("checker") }, "棋盘格"),
					h("button", { type: "button", className: "uguiSide_previewMode", "data-active": background === "dark" || undefined, onClick: () => selectBackground("dark") }, "深色")),
				h("div", { className: "uguiSide_canvasWrap", style: { width: width * scale, height: height * scale } },
					h("div", { className: "uguiSide_canvas", style: { width, height, transform: "scale(" + scale + ")" }, onPointerDown: () => onSelect([]) },
						renderNode(dsl.root, width, height, [], pathKey(selectedPath), scale, onSelect, onBeginGesture, onImageDrop, true, null, previewContext, null, false))));
		}

		function Tree({ root, selectedPath, canvasId, onSelect }) {
			const [collapsed, setCollapsed] = react.useState(() => readTreeCollapsed(canvasId, root));
			const selectedKey = pathKey(selectedPath);
			const ancestorKeys = selectedAncestorCollapseKeys(root, selectedPath);
			const ancestorToken = ancestorKeys.join("\u0000");
			react.useEffect(() => {
				setCollapsed((current) => {
					if (!ancestorKeys.some((key) => current.has(key))) return current;
					const next = new Set(current);
					for (const key of ancestorKeys) next.delete(key);
					return next;
				});
			}, [canvasId, ancestorToken]);
			react.useEffect(() => {
				writeTreeCollapsed(canvasId, collapsed);
			}, [canvasId, collapsed]);
			const toggle = (node, path) => {
				const key = treeCollapseKey(node, path);
				setCollapsed((current) => {
					const next = new Set(current);
					if (next.has(key)) next.delete(key);
					else next.add(key);
					return next;
				});
			};
			const rows = [];
			function visit(node, path, depth) {
				if (!node) return;
				const components = Array.isArray(node.components) ? node.components : [];
				const hasChildren = Array.isArray(node.children) && node.children.length > 0;
				const isCollapsed = hasChildren && collapsed.has(treeCollapseKey(node, path));
				rows.push(h("div", {
					key: treeCollapseKey(node, path),
					className: "uguiSide_treeRow",
					"data-selected": pathKey(path) === selectedKey || undefined,
					style: { paddingLeft: 4 + depth * 12 }
				},
					hasChildren ? h("button", {
						type: "button",
						className: "uguiSide_treeToggle",
						"aria-expanded": !isCollapsed,
						"aria-label": (isCollapsed ? "展开 " : "折叠 ") + String(node.name || "未命名节点"),
						title: isCollapsed ? "展开子节点" : "折叠子节点",
						onClick: (event) => {
							event.stopPropagation();
							toggle(node, path);
						}
					}, isCollapsed ? "▸" : "▾") : h("span", { className: "uguiSide_treeMark", "aria-hidden": true }, components.some((item) => item && item.type === "TMP_Text") ? "T" : "·"),
					h("button", {
						type: "button",
						className: "uguiSide_treeSelect",
						title: String(node.name || "未命名节点"),
						onClick: () => onSelect(path)
					}, h("span", { className: "uguiSide_treeName" }, String(node.name || "未命名节点")))));
				if (hasChildren && !isCollapsed) {
					for (let index = 0; index < node.children.length; index += 1) visit(node.children[index], path.concat(index), depth + 1);
				}
			}
			visit(root, [], 0);
			return h("div", { className: "uguiSide_tree", role: "tree", "aria-label": "组件树" }, rows);
		}

		function displayNumber(value) {
			const rounded = Math.round(numberAt(value, 0) * 100) / 100;
			return String(Object.is(rounded, -0) ? 0 : rounded);
		}

		function NumberField({ label, value, min, title, onCommit }) {
			const [draft, setDraft] = react.useState(displayNumber(value));
			const focused = react.useRef(false);
			const cancelled = react.useRef(false);
			react.useEffect(() => {
				if (!focused.current) setDraft(displayNumber(value));
			}, [value]);
			function commit() {
				focused.current = false;
				if (cancelled.current) {
					cancelled.current = false;
					setDraft(displayNumber(value));
					return;
				}
				const parsed = Number(draft);
				if (!Number.isFinite(parsed) || (typeof min === "number" && parsed < min)) {
					setDraft(displayNumber(value));
					return;
				}
				if (Math.abs(parsed - numberAt(value, 0)) > 0.0001) onCommit(parsed);
				else setDraft(displayNumber(value));
			}
			return h("label", { className: "uguiSide_field", title },
				h("span", { className: "uguiSide_fieldLabel" }, label),
				h("input", {
					className: "uguiSide_input",
					type: "number",
					value: draft,
					min,
					step: "1",
					onFocus: () => {
						focused.current = true;
						cancelled.current = false;
					},
					onChange: (event) => setDraft(event.target.value),
					onBlur: commit,
					onKeyDown: (event) => {
						if (event.key === "Enter") event.currentTarget.blur();
						if (event.key === "Escape") {
							cancelled.current = true;
							setDraft(displayNumber(value));
							event.currentTarget.blur();
						}
					}
				}));
		}

		function Inspector({ dsl, selectedPath, onFrameCommit, onCanvasCommit, onAnchorCommit, onImageDrop }) {
			if (!dsl || !dsl.root) return h("div", { className: "uguiSide_inspector" }, h("p", { className: "uguiSide_note" }, "暂无属性"));
			const meta = nodeMeta(dsl, selectedPath) || nodeMeta(dsl, []);
			const resolution = meta.root ? canvasSize(dsl) : null;
			const components = Array.isArray(meta.node.components) ? meta.node.components : [];
			const image = components.find((component) => component && component.type === "Image");
			const breadcrumb = [dsl.root.name || "Root"];
			let cursor = dsl.root;
			for (const index of selectedPath) {
				cursor = cursor && Array.isArray(cursor.children) ? cursor.children[index] : null;
				if (cursor) breadcrumb.push(cursor.name || "未命名节点");
			}
			return h("div", { className: "uguiSide_inspector" },
				meta.root ? h("section", { className: "uguiSide_section" },
					h("h4", { className: "uguiSide_sectionTitle" }, "画布尺寸"),
					h("div", { className: "uguiSide_fields" },
						h(NumberField, { label: "W", value: resolution[0], min: 1, title: "Canvas referenceResolution 宽度", onCommit: (value) => onCanvasCommit([value, resolution[1]]) }),
						h(NumberField, { label: "H", value: resolution[1], min: 1, title: "Canvas referenceResolution 高度", onCommit: (value) => onCanvasCommit([resolution[0], value]) }))) : null,
				h("section", { className: "uguiSide_section" },
					h("h4", { className: "uguiSide_sectionTitle" }, String(meta.node.name || "未命名节点")),
					h("p", { className: "uguiSide_path" }, breadcrumb.join(" / ")),
					meta.root ? h("p", { className: "uguiSide_hint" }, "根节点固定铺满画布；请通过上方 W/H 修改画布尺寸。") : h(react.Fragment, null,
						h("div", { className: "uguiSide_fields" },
							h(NumberField, { label: "X", value: meta.frame.x, title: "相对父节点左上角 X", onCommit: (value) => onFrameCommit("x", value) }),
							h(NumberField, { label: "Y", value: meta.frame.y, title: "相对父节点左上角 Y", onCommit: (value) => onFrameCommit("y", value) }),
							h(NumberField, { label: "W", value: meta.frame.width, min: 1, title: "可视宽度", onCommit: (value) => onFrameCommit("width", value) }),
							h(NumberField, { label: "H", value: meta.frame.height, min: 1, title: "可视高度", onCommit: (value) => onFrameCommit("height", value) })),
						h("p", { className: "uguiSide_hint" }, "X/Y 以父节点左上角为原点。也可在预览中拖动节点，或拖右下角蓝色手柄缩放。"))),
				h("section", { className: "uguiSide_section" },
					h("h4", { className: "uguiSide_sectionTitle" }, "布局与组件"),
					h("select", {
						className: "uguiSide_select",
						value: String(meta.node.rect && meta.node.rect.anchor || "center"),
						disabled: meta.root,
						title: meta.root ? "根节点固定为四向拉伸" : "选择 RectTransform Anchor 布局",
						onChange: (event) => onAnchorCommit(event.target.value)
					}, anchorOptions.map((item) => h("option", { key: item[0], value: item[0] }, item[1]))),
					!meta.root ? h("p", { className: "uguiSide_hint" }, "切换拉伸布局时，受拉伸方向控制的宽度或高度会跟随父节点。") : null,
					image ? h("div", {
						className: "uguiSide_dropZone",
						title: "支持从 Finder 或项目目录拖入 PNG/JPG；这里只暂存，不会导入 Unity",
						onDragOver: (event) => {
							event.preventDefault();
							event.dataTransfer.dropEffect = "copy";
							event.currentTarget.dataset.active = "true";
						},
						onDragLeave: (event) => { delete event.currentTarget.dataset.active; },
						onDrop: (event) => {
							event.preventDefault();
							delete event.currentTarget.dataset.active;
							onImageDrop(selectedPath, event.dataTransfer);
						}
					}, image.sourceName ? "当前图片：" + image.sourceName + "\n仅暂存；点击生成 Prefab 才导入 Unity" : "把 PNG / JPG 拖到这里\n仅暂存，不会自动导入 Unity") : null,
					h("div", { className: "uguiSide_components" },
						components.length > 0 ? components.map((item, index) => h("span", { key: index, className: "uguiSide_badge" }, String(item && item.type || "Component"))) : h("span", { className: "uguiSide_badge" }, "RectTransform"))));
		}

		function initialPanelSize() {
			try {
				const saved = JSON.parse(localStorage.getItem("dsh.ugui.panelSize") || "null");
				if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) return { width: saved.width, height: saved.height };
			} catch {}
			return { width: 820, height: 650 };
		}

		function activeCanvasStorageKey(sessionId) {
			return "dsh.ugui.activeCanvas." + String(sessionId || "default");
		}

		function initialActiveCanvas(sessionId) {
			try {
				const value = localStorage.getItem(activeCanvasStorageKey(sessionId));
				return typeof value === "string" && value !== "" ? value : "";
			} catch {
				return "";
			}
		}

		function rememberActiveCanvas(sessionId, canvasId) {
			try {
				if (canvasId) localStorage.setItem(activeCanvasStorageKey(sessionId), canvasId);
				else localStorage.removeItem(activeCanvasStorageKey(sessionId));
			} catch {}
		}

		function mergeWorkspace(previous, incoming) {
			if (!incoming || !Array.isArray(incoming.canvases)) return previous;
			const previousEntries = new Map((previous && Array.isArray(previous.canvases) ? previous.canvases : []).map((entry) => [entry.id, entry]));
			return Object.assign({}, previous || {}, incoming, {
				canvases: incoming.canvases.map((entry) => Object.assign({}, previousEntries.get(entry.id) || {}, entry))
			});
		}

		function shouldHandleGestureUndo(event) {
			if (!event || event.defaultPrevented || event.repeat || event.shiftKey || event.altKey || (!event.ctrlKey && !event.metaKey) || String(event.key).toLowerCase() !== "z") return false;
			const target = event.target;
			if (target && typeof target.closest === "function" && target.closest("input,textarea,select,[contenteditable='true'],[role='textbox']")) return false;
			return true;
		}

		function createGestureUndoHistory(limit) {
			const stacks = new Map();
			const maximum = Number.isSafeInteger(limit) && limit > 0 ? limit : 50;
			function stackFor(canvasId) {
				const key = String(canvasId || "");
				let stack = stacks.get(key);
				if (!stack) {
					stack = [];
					stacks.set(key, stack);
				}
				return stack;
			}
			return {
				record(action, beforeVersion) {
					const stack = stackFor(action.canvasId);
					const top = stack[stack.length - 1];
					if (top && top.afterVersion !== beforeVersion) stack.length = 0;
					stack.push(JSON.parse(JSON.stringify(action)));
					if (stack.length > maximum) stack.splice(0, stack.length - maximum);
					return stack.length;
				},
				peek(canvasId, currentVersion) {
					const stack = stackFor(canvasId);
					const action = stack[stack.length - 1];
					if (!action) return { ok: false, reason: "empty" };
					if (action.afterVersion !== currentVersion) return { ok: false, reason: "version-conflict" };
					return { ok: true, action: JSON.parse(JSON.stringify(action)) };
				},
				commit(canvasId, nextVersion) {
					const stack = stackFor(canvasId);
					stack.pop();
					const next = stack[stack.length - 1];
					if (next) next.afterVersion = nextVersion;
					return stack.length;
				},
				clear(canvasId) {
					stackFor(canvasId).length = 0;
				},
				depth(canvasId) {
					return stackFor(canvasId).length;
				}
			};
		}

		function ComposerTargetDock(props) {
			const state = useEditorTargetState(props.sessionId);
			const target = state.target;
			const canvasLabel = target ? target.uiName : "未选择 Canvas";
			const nodeLabel = target ? (target.nodePath.length > 0 ? target.breadcrumb.slice(1).join(" / ") : "整个 Canvas") : "打开 UGUI制作模式窗口后自动同步";
			const statusLabel = state.status === "ready" ? "发送时固定" : state.status === "syncing" ? "同步中…" : state.status === "error" ? "同步失败，点击重试" : "尚未同步";
			const title = state.status === "error" ? state.error : target ? "下一条消息将固定目标：" + target.canvasId + " · " + target.breadcrumb.join(" / ") + " · v" + String(target.canvasVersion) : "尚无可附加的 uGUI 编辑目标";
			const retry = () => {
				if (state.status === "error" && target) synchronizeEditorTarget(props.sessionId, target, true);
			};
			return h("div", {
				className: "uguiComposerTarget",
				"data-status": state.status,
				role: "status",
				title,
				tabIndex: state.status === "error" ? 0 : undefined,
				onClick: retry,
				onKeyDown: (event) => {
					if (state.status === "error" && (event.key === "Enter" || event.key === " ")) retry();
				}
			},
				h("span", { className: "uguiComposerTarget_dot", "aria-hidden": true }),
				h("span", { className: "uguiComposerTarget_label" }, "下一条消息目标"),
				h("span", { className: "uguiComposerTarget_canvas" }, canvasLabel),
				h("span", { className: "uguiComposerTarget_sep", "aria-hidden": true }, "›"),
				h("span", { className: "uguiComposerTarget_node" }, nodeLabel),
				h("span", { className: "uguiComposerTarget_state" }, statusLabel));
		}

		function PresetScopedComposerTarget(props) {
			const enabled = props.useSessions((state) => {
				const summary = state && state.byId ? state.byId[props.sessionId] : null;
				return Boolean(summary && summary.agentPreset === "ugui");
			});
			return enabled ? h(ComposerTargetDock, { sessionId: props.sessionId }) : null;
		}

		function PresetScopedDesignerAction(props) {
			const sessionId = props.useSessions((state) => {
				const current = state && state.current;
				const summary = current && state.byId ? state.byId[current] : null;
				return summary && summary.agentPreset === "ugui" ? String(current) : "";
			});
			return sessionId ? h(DesignerAction, { key: sessionId, wide: props.wide, sessionId }) : null;
		}

		function WorkspaceOverview(props) {
			const workspace = props.workspace || { defaultCanvasId: null, canvases: [] };
			const canvases = Array.isArray(workspace.canvases) ? workspace.canvases : [];
			const knownCounts = canvases.filter((entry) => Number.isSafeInteger(entry.nodeCount));
			const totalNodes = knownCounts.reduce((sum, entry) => sum + entry.nodeCount, 0);
			const defaultCanvas = canvases.find((entry) => entry.id === workspace.defaultCanvasId);
			return h("section", { className: "uguiSide_overview", "aria-label": "多 Canvas 总览" },
				h("header", { className: "uguiSide_overviewHeader" },
					h("div", null,
						h("h3", { className: "uguiSide_overviewTitle" }, "多 Canvas 总览"),
						h("p", { className: "uguiSide_overviewSubtitle" }, "统一查看版本、节点规模和当前编辑位置。")),
					h("div", { className: "uguiSide_overviewSummary" },
						h("span", null, String(canvases.length), " 个 Canvas"),
						h("span", null, knownCounts.length === canvases.length ? String(totalNodes) + " 个节点" : "节点统计中…"),
						h("span", { title: defaultCanvas ? defaultCanvas.id : "" }, "默认：", defaultCanvas ? defaultCanvas.uiName : "未设置"))),
				canvases.length === 0
					? h("div", { className: "uguiSide_overviewEmpty" }, props.loading ? "正在读取 Workspace…" : "Workspace 中暂无 Canvas")
					: h("div", { className: "uguiSide_overviewGrid" }, canvases.map((entry) => {
						const current = entry.id === props.activeCanvasId;
						const isDefault = entry.id === workspace.defaultCanvasId;
						return h("article", { key: entry.id, className: "uguiSide_overviewCard", "data-current": current || undefined },
							h("div", { className: "uguiSide_overviewCardHead" },
								h("div", { className: "uguiSide_overviewNameWrap" },
									h("strong", { className: "uguiSide_overviewName" }, entry.uiName),
									h("code", { className: "uguiSide_overviewId" }, entry.id)),
								h("div", { className: "uguiSide_overviewBadges" },
									current ? h("span", { className: "uguiSide_overviewBadge", "data-tone": "current" }, "当前") : null,
									isDefault ? h("span", { className: "uguiSide_overviewBadge", "data-tone": "default" }, "默认") : null)),
							h("div", { className: "uguiSide_overviewMetrics" },
								h("span", null, h("b", null, "v" + String(entry.version || 0)), " 版本"),
								h("span", null, h("b", null, Number.isSafeInteger(entry.nodeCount) ? String(entry.nodeCount) : "—"), " 节点")),
							current ? h("div", { className: "uguiSide_overviewTarget", title: props.targetTitle || "" }, "当前目标：", props.targetLabel || "整个 Canvas") : null,
							h("div", { className: "uguiSide_overviewPath", title: entry.dslPath }, entry.dslPath),
							h("button", {
								type: "button",
								className: "uguiSide_overviewOpen",
								disabled: props.disabled,
								onClick: () => props.onOpen(entry.id)
							}, current ? "打开设计器" : "切换并打开"));
					}))
			);
		}

		// ── 预览器：独立交互运行时 ─────────────────────────────────────────
		// 预览器拥有独立的布局计算、交互状态 store 与事件总线，与设计器的编辑
		// 手势完全隔离：交互状态只保存在浏览器内存（按 nodeId 键控），不写回
		// DSL、不参与版本与撤销，也不影响 Unity 构建链路；事件总线是后续
		// 「事件 → 动作」逻辑扩展的唯一入口。

		function clampNumber(value, min, max) {
			return Math.min(max, Math.max(min, value));
		}

		function clamp01(value) {
			return clampNumber(value, 0, 1);
		}

		function isHorizontalDirection(direction) {
			return direction !== "bottomToTop" && direction !== "topToBottom";
		}

		function playNodeName(node) {
			return String(node && node.name || "未命名节点");
		}

		function formatPlayTime(date) {
			const pad = (value) => String(value).padStart(2, "0");
			return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
		}

		function playToggleOn(overlay, nodeId, toggle) {
			const entry = overlay[nodeId];
			if (entry && typeof entry.isOn === "boolean") return entry.isOn;
			return Boolean(toggle && toggle.isOn === true);
		}

		function playLayoutMetrics(node) {
			const element = componentOf(node, "LayoutElement");
			const size = vec(node && node.rect && node.rect.size, [100, 100]);
			const axis = (minValue, preferredValue, flexibleValue, base) => {
				const min = numberAt(minValue, -1);
				const preferredRaw = numberAt(preferredValue, -1);
				const flexible = numberAt(flexibleValue, -1);
				const preferred = preferredRaw >= 0 ? preferredRaw : Math.max(0, numberAt(base, 0));
				return { min: min >= 0 ? min : preferred, preferred, flexible: flexible > 0 ? flexible : 0 };
			};
			return {
				ignore: Boolean(element && element.ignoreLayout === true),
				horizontal: axis(element && element.minWidth, element && element.preferredWidth, element && element.flexibleWidth, size[0]),
				vertical: axis(element && element.minHeight, element && element.preferredHeight, element && element.flexibleHeight, size[1])
			};
		}

		function playLayoutFramesForChildren(node, parentWidth, parentHeight, hiddenSet) {
			const allChildren = Array.isArray(node && node.children) ? node.children : [];
			const children = hiddenSet ? allChildren.filter((child) => !(child && hiddenSet.has(child.nodeId))) : allChildren;
			const base = children.map((child) => frameOf(child && child.rect, parentWidth, parentHeight));
			const horizontal = componentOf(node, "HorizontalLayoutGroup");
			const vertical = componentOf(node, "VerticalLayoutGroup");
			const grid = componentOf(node, "GridLayoutGroup");
			const layout = horizontal || vertical || grid;
			if (!layout || children.length === 0) return base;
			const padding = layoutPadding(layout);
			const availableWidth = Math.max(0, parentWidth - padding.left - padding.right);
			const availableHeight = Math.max(0, parentHeight - padding.top - padding.bottom);
			const alignment = alignmentFactors(layout.childAlignment);
			if (grid) {
				const cell = Array.isArray(grid.cellSize) ? grid.cellSize : [100, 100];
				const gap = Array.isArray(grid.spacing) ? grid.spacing : [0, 0];
				const cellWidth = Math.max(0, numberAt(cell[0], 100));
				const cellHeight = Math.max(0, numberAt(cell[1], 100));
				const gapX = numberAt(gap[0], 0);
				const gapY = numberAt(gap[1], 0);
				const count = children.length;
				const constraintCount = Math.max(1, Math.round(numberAt(grid.constraintCount, 2)));
				let columns;
				let rows;
				if (grid.constraint === "fixedColumnCount") {
					columns = constraintCount;
					rows = Math.ceil(count / columns);
				} else if (grid.constraint === "fixedRowCount") {
					rows = constraintCount;
					columns = Math.ceil(count / rows);
				} else {
					columns = Math.max(1, Math.floor((availableWidth + gapX) / Math.max(1, cellWidth + gapX)));
					rows = Math.ceil(count / columns);
				}
				const totalWidth = columns * cellWidth + Math.max(0, columns - 1) * gapX;
				const totalHeight = rows * cellHeight + Math.max(0, rows - 1) * gapY;
				const originX = padding.left + Math.max(0, availableWidth - totalWidth) * alignment.x;
				const originY = padding.top + Math.max(0, availableHeight - totalHeight) * alignment.y;
				return children.map((_child, index) => {
					let column;
					let row;
					if (grid.startAxis === "vertical") {
						row = index % rows;
						column = Math.floor(index / rows);
					} else {
						column = index % columns;
						row = Math.floor(index / columns);
					}
					if (grid.startCorner === "upperRight" || grid.startCorner === "lowerRight") column = columns - 1 - column;
					if (grid.startCorner === "lowerLeft" || grid.startCorner === "lowerRight") row = rows - 1 - row;
					return { x: originX + column * (cellWidth + gapX), y: originY + row * (cellHeight + gapY), width: cellWidth, height: cellHeight };
				});
			}
			const metrics = children.map(playLayoutMetrics);
			const spacing = numberAt(layout.spacing, 0);
			const isH = Boolean(horizontal);
			const controlMain = isH ? layout.childControlWidth !== false : layout.childControlHeight !== false;
			const expandMain = isH ? layout.childForceExpandWidth !== false : layout.childForceExpandHeight !== false;
			const controlCross = isH ? layout.childControlHeight !== false : layout.childControlWidth !== false;
			const expandCross = isH ? layout.childForceExpandHeight !== false : layout.childForceExpandWidth !== false;
			const availableMain = isH ? availableWidth : availableHeight;
			const availableCross = isH ? availableHeight : availableWidth;
			const activeFlags = children.map((_child, index) => !metrics[index].ignore);
			const activeCount = activeFlags.filter(Boolean).length;
			const spacingTotal = Math.max(0, activeCount - 1) * spacing;
			const mainSizes = base.map((frame, index) => {
				if (!activeFlags[index]) return isH ? frame.width : frame.height;
				const axis = isH ? metrics[index].horizontal : metrics[index].vertical;
				return controlMain ? Math.max(axis.min, axis.preferred) : isH ? frame.width : frame.height;
			});
			if (expandMain && activeCount > 0) {
				const used = mainSizes.reduce((sum, value, index) => activeFlags[index] ? sum + value : sum, 0);
				const extra = availableMain - spacingTotal - used;
				if (extra > 0.01) {
					const weights = mainSizes.map((_size, index) => {
						if (!activeFlags[index]) return 0;
						const axis = isH ? metrics[index].horizontal : metrics[index].vertical;
						return axis.flexible > 0 ? axis.flexible : 1;
					});
					const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
					for (let index = 0; index < mainSizes.length; index += 1) {
						if (activeFlags[index]) mainSizes[index] += extra * weights[index] / totalWeight;
					}
				}
			}
			const totalMain = mainSizes.reduce((sum, value, index) => activeFlags[index] ? sum + value : sum, 0) + spacingTotal;
			const mainFactor = isH ? alignment.x : alignment.y;
			let cursor = (isH ? padding.left : padding.top) + Math.max(0, availableMain - totalMain) * mainFactor;
			const order = children.map((_child, index) => index);
			if (layout.reverseArrangement === true) order.reverse();
			const frames = new Array(children.length);
			for (const index of order) {
				const baseFrame = base[index];
				if (!activeFlags[index]) {
					frames[index] = baseFrame;
					continue;
				}
				const mainSize = mainSizes[index];
				const crossAxis = isH ? metrics[index].vertical : metrics[index].horizontal;
				const baseCross = isH ? baseFrame.height : baseFrame.width;
				const crossSize = controlCross ? (expandCross ? availableCross : Math.max(crossAxis.min, crossAxis.preferred)) : baseCross;
				const crossFactor = isH ? alignment.y : alignment.x;
				const cross = (isH ? padding.top : padding.left) + Math.max(0, availableCross - crossSize) * crossFactor;
				frames[index] = isH
					? { x: cursor, y: cross, width: mainSize, height: crossSize }
					: { x: cross, y: cursor, width: crossSize, height: mainSize };
				cursor += mainSize + spacing;
			}
			return frames;
		}

		function playFittedFrame(node, frame, childFrames, hiddenSet) {
			const fitter = componentOf(node, "ContentSizeFitter");
			if (!fitter) return frame;
			const fitWidth = fitter.horizontalFit === "minSize" || fitter.horizontalFit === "preferredSize";
			const fitHeight = fitter.verticalFit === "minSize" || fitter.verticalFit === "preferredSize";
			if (!fitWidth && !fitHeight) return frame;
			const horizontal = componentOf(node, "HorizontalLayoutGroup");
			const vertical = componentOf(node, "VerticalLayoutGroup");
			const layout = horizontal || vertical || componentOf(node, "GridLayoutGroup");
			const padding = layout ? layoutPadding(layout) : { left: 0, right: 0, top: 0, bottom: 0 };
			const allChildren = Array.isArray(node.children) ? node.children : [];
			const children = hiddenSet ? allChildren.filter((child) => !(child && hiddenSet.has(child.nodeId))) : allChildren;
			const metrics = children.map(playLayoutMetrics);
			let contentWidth = 0;
			let contentHeight = 0;
			if (horizontal || vertical) {
				const group = horizontal || vertical;
				const spacing = numberAt(group.spacing, 0);
				let active = 0;
				for (let index = 0; index < childFrames.length; index += 1) {
					if (metrics[index] && metrics[index].ignore) continue;
					active += 1;
					if (horizontal) {
						contentWidth += childFrames[index].width;
						contentHeight = Math.max(contentHeight, childFrames[index].height);
					} else {
						contentHeight += childFrames[index].height;
						contentWidth = Math.max(contentWidth, childFrames[index].width);
					}
				}
				if (horizontal) contentWidth += Math.max(0, active - 1) * spacing;
				else contentHeight += Math.max(0, active - 1) * spacing;
			} else {
				for (const childFrame of childFrames) {
					contentWidth = Math.max(contentWidth, childFrame.x + childFrame.width);
					contentHeight = Math.max(contentHeight, childFrame.y + childFrame.height);
				}
			}
			return {
				x: frame.x,
				y: frame.y,
				width: fitWidth ? Math.max(0, contentWidth + padding.left + padding.right) : frame.width,
				height: fitHeight ? Math.max(0, contentHeight + padding.top + padding.bottom) : frame.height
			};
		}

		function buildPlayLayout(node, parentWidth, parentHeight, frameOverride, key, parent, hiddenSet) {
			let frame = frameOverride || frameOf(node && node.rect, parentWidth, parentHeight);
			const allChildren = Array.isArray(node && node.children) ? node.children : [];
			const children = hiddenSet ? allChildren.filter((child) => !(child && hiddenSet.has(child.nodeId))) : allChildren;
			let childFrames = playLayoutFramesForChildren(node, frame.width, frame.height, hiddenSet);
			const fitted = playFittedFrame(node, frame, childFrames, hiddenSet);
			if (Math.abs(fitted.width - frame.width) > 0.01 || Math.abs(fitted.height - frame.height) > 0.01) {
				frame = fitted;
				childFrames = playLayoutFramesForChildren(node, frame.width, frame.height, hiddenSet);
			}
			const layoutNode = { node, frame, key, parent, children: [] };
			layoutNode.children = children.map((child, index) => buildPlayLayout(child, frame.width, frame.height, childFrames[index], key + "." + index, layoutNode, hiddenSet));
			return layoutNode;
		}

		function buildLayoutIndex(layoutRoot) {
			const index = new Map();
			(function visit(layoutNode) {
				const id = layoutNode.node && layoutNode.node.nodeId;
				if (typeof id === "string" && id !== "") index.set(id, layoutNode);
				for (const child of layoutNode.children) visit(child);
			})(layoutRoot);
			return index;
		}

		function findLayoutNode(layoutNode, nodeId) {
			if (!layoutNode) return null;
			if (layoutNode.node && layoutNode.node.nodeId === nodeId) return layoutNode;
			for (const child of layoutNode.children) {
				const found = findLayoutNode(child, nodeId);
				if (found) return found;
			}
			return null;
		}

		function playResolveReference(root, owner, refId, fallbackNames) {
			if (typeof refId === "string" && refId !== "") return findPreviewNodeById(root, refId);
			for (const fallback of fallbackNames) {
				const found = findDescendantPreviewNode(owner, fallback);
				if (found) return found;
			}
			return null;
		}

		function collectToggleGroups(root) {
			const groups = new Map();
			(function visit(node) {
				if (!node || typeof node !== "object") return;
				const toggle = componentOf(node, "Toggle");
				if (toggle && typeof toggle.toggleGroupNodeId === "string" && toggle.toggleGroupNodeId !== "") {
					const list = groups.get(toggle.toggleGroupNodeId) || [];
					list.push(node);
					groups.set(toggle.toggleGroupNodeId, list);
				}
				if (Array.isArray(node.children)) node.children.forEach(visit);
			})(root);
			return groups;
		}

		function computeScrollData(layoutRoot, overlay, root) {
			const data = new Map();
			if (!layoutRoot || !root) return data;
			(function visit(layoutNode) {
				const scroll = componentOf(layoutNode.node, "ScrollRect");
				if (scroll) {
					const nodeId = typeof layoutNode.node.nodeId === "string" ? layoutNode.node.nodeId : "";
					const content = playResolveReference(root, layoutNode.node, scroll.contentNodeId, ["Content"]);
					const viewport = playResolveReference(root, layoutNode.node, scroll.viewportNodeId, ["Viewport"]);
					const contentLayout = content && content.nodeId ? findLayoutNode(layoutNode, content.nodeId) : null;
					const viewportLayout = viewport && viewport.nodeId ? findLayoutNode(layoutNode, viewport.nodeId) : null;
					const viewportFrame = viewportLayout ? viewportLayout.frame : layoutNode.frame;
					const contentFrame = contentLayout ? contentLayout.frame : viewportFrame;
					const entry = overlay[nodeId];
					const offset = entry && entry.offset ? entry.offset : { x: 0, y: 0 };
					const rangeX = Math.max(0, contentFrame.width - viewportFrame.width);
					const rangeY = Math.max(0, contentFrame.height - viewportFrame.height);
					data.set(nodeId, {
						component: scroll,
						name: playNodeName(layoutNode.node),
						contentId: content && typeof content.nodeId === "string" ? content.nodeId : "",
						viewportFrame,
						contentFrame,
						rangeX,
						rangeY,
						offset,
						normX: rangeX > 0 ? clamp01(-offset.x / rangeX) : 0,
						normY: rangeY > 0 ? clamp01(-offset.y / rangeY) : 0
					});
				}
				for (const child of layoutNode.children) visit(child);
			})(layoutRoot);
			return data;
		}

		function sliderChildFrames(root, layoutNode, slider, norm) {
			const frames = new Map();
			const direction = typeof slider.direction === "string" ? slider.direction : "leftToRight";
			const horizontal = isHorizontalDirection(direction);
			const fraction = horizontal
				? (direction === "rightToLeft" ? 1 - norm : norm)
				: (direction === "bottomToTop" ? 1 - norm : norm);
			const fill = playResolveReference(root, layoutNode.node, slider.fillRectNodeId, ["Fill"]);
			if (fill && fill.nodeId) {
				const fillLayout = findLayoutNode(layoutNode, fill.nodeId);
				if (fillLayout && fillLayout.parent) {
					const area = fillLayout.parent.frame;
					if (horizontal) {
						const width = Math.max(0, area.width * fraction);
						frames.set(fill.nodeId, direction === "rightToLeft"
							? { x: area.width - width, y: 0, width, height: area.height }
							: { x: 0, y: 0, width, height: area.height });
					} else {
						const height = Math.max(0, area.height * fraction);
						frames.set(fill.nodeId, direction === "bottomToTop"
							? { x: 0, y: area.height - height, width: area.width, height }
							: { x: 0, y: 0, width: area.width, height });
					}
				}
			}
			const handle = playResolveReference(root, layoutNode.node, slider.handleRectNodeId, ["Handle"]);
			if (handle && handle.nodeId) {
				const handleLayout = findLayoutNode(layoutNode, handle.nodeId);
				if (handleLayout && handleLayout.parent) {
					const area = handleLayout.parent.frame;
					const size = handleLayout.frame;
					if (horizontal) {
						const center = clampNumber(fraction * area.width, 0, area.width);
						frames.set(handle.nodeId, { x: center - size.width / 2, y: (area.height - size.height) / 2, width: size.width, height: size.height });
					} else {
						const center = clampNumber(fraction * area.height, 0, area.height);
						frames.set(handle.nodeId, { x: (area.width - size.width) / 2, y: center - size.height / 2, width: size.width, height: size.height });
					}
				}
			}
			return frames;
		}

		function scrollbarChildFrames(root, layoutNode, scrollbar, value, size) {
			const frames = new Map();
			const handle = playResolveReference(root, layoutNode.node, scrollbar.handleRectNodeId, ["Handle"]);
			if (!handle || !handle.nodeId) return frames;
			const handleLayout = findLayoutNode(layoutNode, handle.nodeId);
			if (!handleLayout || !handleLayout.parent) return frames;
			const area = handleLayout.parent.frame;
			const direction = typeof scrollbar.direction === "string" ? scrollbar.direction : "leftToRight";
			const horizontal = isHorizontalDirection(direction);
			const fraction = horizontal
				? (direction === "rightToLeft" ? 1 - value : value)
				: (direction === "bottomToTop" ? 1 - value : value);
			const safeSize = clamp01(size);
			// Unity UpdateVisuals 只改写锚点、保留 Handle 自身 RectTransform 偏移：
			// 设计态 Handle 相对 Sliding Area 的内缩会在运行时保留（标准 Scrollbar 的 Handle 空隙）
			const design = handleLayout.frame;
			const insetL = Math.max(0, design.x - area.x);
			const insetT = Math.max(0, design.y - area.y);
			const insetR = Math.max(0, (area.x + area.width) - (design.x + design.width));
			const insetB = Math.max(0, (area.y + area.height) - (design.y + design.height));
			// Unity 无最小像素尺寸：handle 长度严格 = 轨道长度 × size
			if (horizontal) {
				const length = area.width * safeSize;
				const travel = Math.max(0, area.width - length);
				const spanX = fraction * travel;
				frames.set(handle.nodeId, { x: spanX + insetL, y: insetT, width: Math.max(0, length - insetL - insetR), height: Math.max(0, area.height - insetT - insetB) });
			} else {
				const length = area.height * safeSize;
				const travel = Math.max(0, area.height - length);
				const spanY = fraction * travel;
				frames.set(handle.nodeId, { x: insetL, y: spanY + insetT, width: Math.max(0, area.width - insetL - insetR), height: Math.max(0, length - insetT - insetB) });
			}
			return frames;
		}

		// Unity Scrollbar.ClickRepeat（uGUI 2019.3+）：按住轨道时每帧把 Handle「中心」移到指针处，
		// 指针进入 Handle 后停止。等效单次计算：value 使 Handle 中心落在指针位置；size>=1 不动。
		function scrollbarTrackPressValue(direction, horizontalBar, pointerFraction, size) {
			const positive = (horizontalBar ? direction === "rightToLeft" : direction === "bottomToTop") ? 1 - pointerFraction : pointerFraction;
			const safeSize = clamp01(size);
			if (safeSize >= 1) return null;
			return clamp01((positive - safeSize / 2) / (1 - safeSize));
		}

		// Unity ScrollRect.UpdateScrollbars：size = clamp01((view − |越界回弹量|) / content)；
		// content 为空时为 1。offset 超出 [-range,0] 的部分即回弹量，回弹时 Handle 同步变短。
		function scrollbarLinkedSize(viewportLength, contentLength, offset, range) {
			if (!(contentLength > 0)) return 1;
			const overscroll = Math.max(0, offset, -(range + offset));
			return clamp01((viewportLength - overscroll) / contentLength);
		}

		// Unity ScrollRect.OnScroll：单轴启用时另一轴的滚轮输入按绝对值较大者并入主轴。
		function scrollWheelDeltas(horizontal, vertical, deltaX, deltaY) {
			let dx = deltaX;
			let dy = deltaY;
			if (vertical && !horizontal) {
				if (Math.abs(dx) > Math.abs(dy)) dy = dx;
				dx = 0;
			} else if (horizontal && !vertical) {
				if (Math.abs(dy) > Math.abs(dx)) dx = dy;
				dy = 0;
			}
			return { dx, dy };
		}

		function scrollbarValueFromNorm(direction, horizontalBar, norm) {
			if (horizontalBar) return direction === "rightToLeft" ? 1 - norm : norm;
			return direction === "topToBottom" ? norm : 1 - norm;
		}

		function renderPlayNode(layoutNode, ctx, frameOverride) {
			const node = layoutNode.node;
			if (!node || typeof node !== "object") return null;
			const nodeId = typeof node.nodeId === "string" ? node.nodeId : "";
			if (nodeId && ctx.hiddenNodeIds.has(nodeId)) return null;
			let frame = frameOverride || layoutNode.frame;
			const contentOffset = nodeId ? ctx.contentOffsets.get(nodeId) : null;
			if (contentOffset) frame = { x: frame.x + contentOffset.x, y: frame.y + contentOffset.y, width: frame.width, height: frame.height };
			const image = componentOf(node, "Image");
			const mask = componentOf(node, "Mask");
			const showOwnGraphic = !mask || mask.showMaskGraphic !== false;
			const label = componentOf(node, "TMP_Text");
			const toggle = componentOf(node, "Toggle");
			const button = componentOf(node, "Button");
			const slider = componentOf(node, "Slider");
			const scrollbar = componentOf(node, "Scrollbar");
			const scroll = componentOf(node, "ScrollRect");
			const interactive = toggle || button || slider || scrollbar || null;
			const interactable = !interactive || interactive.interactable !== false;
			const flags = previewNodeFlags(node);
			const isHandle = nodeId !== "" && ctx.scrollbarHandles.has(nodeId);
			const spritePath = image && typeof image.spritePath === "string" ? image.spritePath : "";
			const style = {
				left: frame.x,
				top: frame.y,
				width: frame.width,
				height: frame.height,
				backgroundColor: showOwnGraphic && !spritePath && image && image.color ? image.color : "transparent",
				borderRadius: button ? Math.min(18, Math.max(5, frame.height * 0.12)) : 0,
				boxShadow: button ? "inset 0 0 0 2px rgba(255,255,255,.12)" : "none",
				overflow: flags.clipsChildren ? "hidden" : "visible",
				cursor: interactive && interactable ? "pointer" : isHandle ? "pointer" : scroll ? (ctx.scrollDraggingId === nodeId ? "grabbing" : "grab") : "default"
			};
			let graphicTransition = false;
			if (nodeId && ctx.toggleGraphics.has(nodeId)) {
				style.opacity = ctx.toggleGraphics.get(nodeId) ? 1 : 0;
				graphicTransition = true;
			}
			if (scrollbar && nodeId && ctx.hiddenScrollbars.has(nodeId)) style.opacity = 0;
			const handlers = {};
			if (scroll && nodeId) {
				handlers["data-scroll-id"] = nodeId;
				handlers.onPointerDown = (event) => ctx.beginScrollDrag(event, nodeId);
			}
			if (slider && interactable) {
				handlers.onPointerDown = (event) => ctx.beginSliderDrag(event, node, slider);
				handlers.onClick = (event) => event.stopPropagation();
			}
			if (scrollbar && interactable && !ctx.hiddenScrollbars.has(nodeId)) {
				handlers.onPointerDown = (event) => ctx.pressScrollbarTrack(event, node, scrollbar);
				handlers.onClick = (event) => event.stopPropagation();
			}
			if (isHandle) {
				handlers.onPointerDown = (event) => ctx.beginScrollbarHandleDrag(event, nodeId);
				handlers.onClick = (event) => event.stopPropagation();
			}
			if (toggle && interactable) {
				handlers.onClick = (event) => {
					event.stopPropagation();
					if (ctx.clickSuppressed()) return;
					ctx.handleToggleClick(node, toggle);
				};
			}
			if (button && interactable) {
				handlers.onClick = (event) => {
					event.stopPropagation();
					if (ctx.clickSuppressed()) return;
					ctx.handleButtonClick(node);
				};
			}
			const pressable = Boolean((interactive && interactable) || isHandle);
			const children = [];
			if (showOwnGraphic && spritePath) children.push(h(SpriteLayer, {
				key: "sprite",
				src: "/local/ugui-asset?spritePath=" + encodeURIComponent(spritePath),
				color: image.color || "#FFFFFFFF",
				preserveAspect: image.preserveAspect === true
			}));
			if (label) {
				const textOverride = nodeId ? ctx.textOverrides.get(nodeId) : undefined;
				children.push(h("div", { key: "text", className: "uguiSide_text", style: textStyle(label) }, String(textOverride !== undefined ? textOverride : label.text || "")));
			}
			let childOverrides = null;
			if (slider && nodeId) childOverrides = sliderChildFrames(ctx.root, layoutNode, slider, ctx.sliderNorm(nodeId, slider));
			if (scrollbar && nodeId) childOverrides = scrollbarChildFrames(ctx.root, layoutNode, scrollbar, ctx.scrollbarValue(nodeId, scrollbar), ctx.scrollbarSize(nodeId, scrollbar));
			for (let index = 0; index < layoutNode.children.length; index += 1) {
				const child = layoutNode.children[index];
				const childId = child.node && child.node.nodeId;
				children.push(renderPlayNode(child, ctx, childOverrides && childId ? childOverrides.get(childId) : undefined));
			}
			return h("div", Object.assign({
				key: layoutNode.key,
				className: "uguiPlay_node" + (graphicTransition ? " uguiPlay_graphic" : "") + (scrollbar ? " uguiPlay_scrollbar" : ""),
				"data-components": Array.isArray(node.components) ? node.components.map((component) => component && component.type).filter(Boolean).join(" ") : undefined,
				"data-interactive": pressable || undefined,
				"data-pstate": !interactable ? "disabled" : ctx.draggingId === nodeId ? "pressed" : undefined,
				style
			}, handlers), children);
		}

		function Previewer(props) {
			const dsl = props.dsl || null;
			const canvasId = typeof props.canvasId === "string" ? props.canvasId : "";
			const selectedPath = Array.isArray(props.selectedPath) ? props.selectedPath : [];
			const shellRef = react.useRef(null);
			const canvasRef = react.useRef(null);
			const logBodyRef = react.useRef(null);
			const [bounds, setBounds] = react.useState({ width: 440, height: 620 });
			const [background, setBackground] = react.useState(initialPreviewBackground);
			const [overlay, setOverlay] = react.useState({});
			const [draggingId, setDraggingId] = react.useState(null);
			const [scrollDraggingId, setScrollDraggingId] = react.useState(null);
			const [logEntries, setLogEntries] = react.useState([]);
			const [logOpen, setLogOpen] = react.useState(true);
			const [subtreeOnly, setSubtreeOnly] = react.useState(false);
			const overlayRef = react.useRef({});
			const animsRef = react.useRef(new Map());
			const scrollDataRef = react.useRef(new Map());
			const layoutIndexRef = react.useRef(new Map());
			const scaleRef = react.useRef(1);
			const suppressClickUntilRef = react.useRef(0);
			const applyWheelRef = react.useRef(() => {});
			const logIdRef = react.useRef(0);
			const busRef = react.useRef(null);
			if (busRef.current === null) {
				const listeners = new Set();
				busRef.current = {
					subscribe(listener) {
						listeners.add(listener);
						return () => listeners.delete(listener);
					},
					publish(event) {
						for (const listener of [...listeners]) {
							try { listener(event); } catch {}
						}
					}
				};
			}

			const emit = react.useCallback((text, coalesceKey) => {
				busRef.current.publish({ text, at: Date.now() });
				const time = formatPlayTime(new Date());
				setLogEntries((current) => {
					const id = ++logIdRef.current;
					if (coalesceKey && current.length > 0 && current[current.length - 1].coalesceKey === coalesceKey) {
						return current.slice(0, -1).concat({ id, time, text, coalesceKey });
					}
					return current.slice(-119).concat({ id, time, text, coalesceKey: coalesceKey || "" });
				});
			}, []);

			const setNodeState = react.useCallback((nodeId, patch) => {
				setOverlay((current) => {
					const previous = current[nodeId] || {};
					return Object.assign({}, current, { [nodeId]: Object.assign({}, previous, patch) });
				});
			}, []);

			const cancelScrollAnim = react.useCallback((scrollId) => {
				const cancel = animsRef.current.get(scrollId);
				if (cancel) {
					animsRef.current.delete(scrollId);
					cancel();
				}
			}, []);

			// ── 画布级逻辑模块（.logic.js）──────────────────────────────────
			const dslRef = react.useRef(null);
			const logicHandlersRef = react.useRef(new Map());
			const logicSourceRef = react.useRef(null);

			const publishInteraction = react.useCallback((type, payload) => {
				for (const entry of logicHandlersRef.current.values()) {
					if (entry.type !== type) continue;
					try {
						entry.handler(payload);
					} catch (error) {
						emit("⚠ 逻辑模块 " + type + " 处理出错：" + String(error && error.message ? error.message : error));
					}
				}
			}, [emit]);

			const resolveLogicTarget = react.useCallback((idOrName) => {
				const root = dslRef.current && dslRef.current.root;
				if (!root || typeof idOrName !== "string" || idOrName === "") return "";
				const byId = findPreviewNodeById(root, idOrName);
				if (byId && typeof byId.nodeId === "string" && byId.nodeId !== "") return byId.nodeId;
				if (root.name === idOrName && typeof root.nodeId === "string") return root.nodeId;
				const byName = findDescendantPreviewNode(root, idOrName);
				return byName && typeof byName.nodeId === "string" ? byName.nodeId : "";
			}, []);

			const loadLogic = react.useCallback((source) => {
				logicSourceRef.current = source;
				logicHandlersRef.current.clear();
				if (source === "") return;
				const api = {
					setVisible(idOrName, visible) {
						const nodeId = resolveLogicTarget(idOrName);
						if (nodeId !== "") setNodeState(nodeId, { hidden: visible !== true });
					},
					setText(idOrName, text) {
						const nodeId = resolveLogicTarget(idOrName);
						if (nodeId !== "") setNodeState(nodeId, { text: String(text) });
					},
					getToggle(nodeId) {
						const root = dslRef.current && dslRef.current.root;
						const node = root ? findPreviewNodeById(root, nodeId) : null;
						const toggle = node ? componentOf(node, "Toggle") : null;
						return toggle ? playToggleOn(overlayRef.current, nodeId, toggle) : undefined;
					},
					getSliderValue(nodeId) {
						const root = dslRef.current && dslRef.current.root;
						const node = root ? findPreviewNodeById(root, nodeId) : null;
						const slider = node ? componentOf(node, "Slider") : null;
						if (!slider) return undefined;
						const entry = overlayRef.current[nodeId];
						return entry && typeof entry.value === "number" ? entry.value : numberAt(slider.value, 0);
					},
					getScrollNorm(nodeId) {
						const info = scrollDataRef.current.get(nodeId);
						return info ? { x: info.normX, y: info.normY } : undefined;
					},
					log(text) {
						emit("逻辑 · " + String(text));
					}
				};
				const events = {
					on(type, handler) {
						if (typeof handler !== "function") return;
						const key = String(logicHandlersRef.current.size) + ":" + String(type);
						logicHandlersRef.current.set(key, { type: String(type), handler });
					}
				};
				try {
					const factory = new Function("module", "exports", "'use strict';\n" + source + "\n;return module.exports;");
					const moduleBox = { exports: {} };
					factory(moduleBox, moduleBox.exports);
					if (typeof moduleBox.exports === "function") moduleBox.exports({ events, api });
					emit("逻辑模块已加载（" + String(logicHandlersRef.current.size) + " 个监听）");
				} catch (error) {
					emit("⚠ 逻辑模块加载失败：" + String(error && error.message ? error.message : error));
				}
			}, [emit, resolveLogicTarget, setNodeState]);

			const selectBackground = react.useCallback((value) => {
				setBackground(value);
				try { localStorage.setItem("dsh.ugui.previewBackground", value); } catch {}
			}, []);

			react.useLayoutEffect(() => {
				const shell = shellRef.current;
				if (!shell) return;
				function measure() {
					const element = shellRef.current;
					if (!element) return;
					const rect = element.getBoundingClientRect();
					const width = Math.max(element.clientWidth || 0, rect.width || 0);
					const height = Math.max(element.clientHeight || 0, rect.height || 0);
					if (!Number.isFinite(width) || !Number.isFinite(height) || width < 120 || height < 120) return;
					setBounds((current) => Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5 ? current : { width, height });
				}
				measure();
				const frame = window.requestAnimationFrame(measure);
				const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
				if (observer) observer.observe(shell);
				window.addEventListener("resize", measure);
				return () => {
					window.cancelAnimationFrame(frame);
					if (observer) observer.disconnect();
					window.removeEventListener("resize", measure);
				};
			}, []);

			react.useEffect(() => () => {
				for (const cancel of animsRef.current.values()) cancel();
				animsRef.current.clear();
				logicHandlersRef.current.clear();
			}, []);

			react.useEffect(() => {
				let cancelled = false;
				const check = async () => {
					try {
						const url = "/local/ugui-logic" + (canvasId ? "?canvasId=" + encodeURIComponent(canvasId) : "");
						const response = await fetch(url, { cache: "no-store" });
						const result = await response.json().catch(() => null);
						if (cancelled) return;
						const source = result && result.ok === true && typeof result.source === "string" ? result.source : "";
						if (source !== logicSourceRef.current) loadLogic(source);
					} catch {
						// 旧版本 host 没有逻辑路由，或请求失败：保持无逻辑状态
					}
				};
				check();
				const timer = window.setInterval(check, 1500);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [canvasId, loadLogic]);

			const selectedPathToken = selectedPath.join(".");
			const subtreeAvailable = Boolean(dsl && dsl.root && selectedPath.length > 0 && nodeAtPath(dsl.root, selectedPath));
			const hiddenNodeIds = react.useMemo(() => {
				const hidden = new Set();
				// DSL active:false 与 Unity SetActive(false) 对齐：初始隐藏，可被逻辑的 setVisible(true) 恢复
				const collectInactive = (node) => {
					if (!node || typeof node !== "object") return;
					if (node.active === false && typeof node.nodeId === "string") hidden.add(node.nodeId);
					for (const child of Array.isArray(node.children) ? node.children : []) collectInactive(child);
				};
				if (dsl && dsl.root) collectInactive(dsl.root);
				for (const nodeId of Object.keys(overlay)) {
					if (overlay[nodeId] && overlay[nodeId].hidden === true) hidden.add(nodeId);
					else if (overlay[nodeId] && overlay[nodeId].hidden === false) hidden.delete(nodeId);
				}
				return hidden;
			}, [dsl, overlay]);
			const hiddenToken = react.useMemo(() => [...hiddenNodeIds].sort().join("|"), [hiddenNodeIds]);
			const textOverrides = react.useMemo(() => {
				const map = new Map();
				for (const nodeId of Object.keys(overlay)) if (overlay[nodeId] && typeof overlay[nodeId].text === "string") map.set(nodeId, overlay[nodeId].text);
				return map;
			}, [overlay]);
			const layoutRoot = react.useMemo(() => {
				if (!dsl || !dsl.root) return null;
				if (subtreeOnly && selectedPath.length > 0) {
					const meta = nodeMeta(dsl, selectedPath);
					if (meta && !meta.root && meta.frame.width > 0 && meta.frame.height > 0) {
						return buildPlayLayout(meta.node, meta.frame.width, meta.frame.height, { x: 0, y: 0, width: meta.frame.width, height: meta.frame.height }, "root", null, hiddenNodeIds);
					}
				}
				const resolution = canvasSize(dsl);
				return buildPlayLayout(dsl.root, resolution[0], resolution[1], { x: 0, y: 0, width: resolution[0], height: resolution[1] }, "root", null, hiddenNodeIds);
			}, [dsl, subtreeOnly, selectedPathToken, hiddenToken]);
			const layoutIndex = react.useMemo(() => layoutRoot ? buildLayoutIndex(layoutRoot) : new Map(), [layoutRoot]);
			const toggleGroups = react.useMemo(() => dsl && dsl.root ? collectToggleGroups(dsl.root) : new Map(), [dsl]);
			const linkage = react.useMemo(() => {
				const scrollbarLinks = new Map();
				const scrollbarHandles = new Map();
				if (dsl && dsl.root) {
					(function visit(node) {
						if (!node || typeof node !== "object") return;
						const nodeId = typeof node.nodeId === "string" ? node.nodeId : "";
						const scroll = componentOf(node, "ScrollRect");
						if (scroll && nodeId !== "") {
							const hBar = playResolveReference(dsl.root, node, scroll.horizontalScrollbarNodeId, ["Scrollbar Horizontal", "Horizontal Scrollbar"]);
							if (hBar && typeof hBar.nodeId === "string" && hBar.nodeId !== "") scrollbarLinks.set(hBar.nodeId, { scrollId: nodeId, axis: "horizontal" });
							const vBar = playResolveReference(dsl.root, node, scroll.verticalScrollbarNodeId, ["Scrollbar Vertical", "Vertical Scrollbar"]);
							if (vBar && typeof vBar.nodeId === "string" && vBar.nodeId !== "") scrollbarLinks.set(vBar.nodeId, { scrollId: nodeId, axis: "vertical" });
						}
						const scrollbar = componentOf(node, "Scrollbar");
						if (scrollbar && nodeId !== "") {
							const handle = playResolveReference(dsl.root, node, scrollbar.handleRectNodeId, ["Handle"]);
							if (handle && typeof handle.nodeId === "string" && handle.nodeId !== "") scrollbarHandles.set(handle.nodeId, nodeId);
						}
						if (Array.isArray(node.children)) node.children.forEach(visit);
					})(dsl.root);
				}
				return { scrollbarLinks, scrollbarHandles };
			}, [dsl]);
			const scrollData = react.useMemo(() => computeScrollData(layoutRoot, overlay, dsl ? dsl.root : null), [layoutRoot, overlay, dsl]);
			const toggleGraphics = react.useMemo(() => {
				const map = new Map();
				if (!dsl || !dsl.root) return map;
				(function visit(node) {
					if (!node || typeof node !== "object") return;
					const toggle = componentOf(node, "Toggle");
					if (toggle) {
						const graphic = playResolveReference(dsl.root, node, toggle.graphicNodeId, ["Checkmark"]);
						if (graphic && typeof graphic.nodeId === "string" && graphic.nodeId !== "") {
							map.set(graphic.nodeId, playToggleOn(overlay, typeof node.nodeId === "string" ? node.nodeId : "", toggle));
						}
					}
					if (Array.isArray(node.children)) node.children.forEach(visit);
				})(dsl.root);
				return map;
			}, [dsl, overlay]);
			const hiddenScrollbars = react.useMemo(() => {
				const hidden = new Set();
				for (const [barId, link] of linkage.scrollbarLinks) {
					const info = scrollData.get(link.scrollId);
					if (!info) continue;
					const visibility = link.axis === "horizontal" ? info.component.horizontalScrollbarVisibility : info.component.verticalScrollbarVisibility;
					const range = link.axis === "horizontal" ? info.rangeX : info.rangeY;
					if (typeof visibility === "string" && visibility !== "permanent" && range <= 0.01) hidden.add(barId);
				}
				return hidden;
			}, [scrollData, linkage]);
			const contentOffsets = react.useMemo(() => {
				const map = new Map();
				for (const info of scrollData.values()) if (info.contentId) map.set(info.contentId, info.offset);
				return map;
			}, [scrollData]);

			// 筛选或布局变化后，把越界的滚动偏移收回到新范围内
			react.useEffect(() => {
				setOverlay((current) => {
					let changed = false;
					const next = Object.assign({}, current);
					for (const [scrollId, info] of scrollData) {
						const entry = next[scrollId];
						if (!entry || !entry.offset) continue;
						const clamped = {
							x: clampNumber(entry.offset.x, -info.rangeX, 0),
							y: clampNumber(entry.offset.y, -info.rangeY, 0)
						};
						if (Math.abs(clamped.x - entry.offset.x) > 0.01 || Math.abs(clamped.y - entry.offset.y) > 0.01) {
							next[scrollId] = Object.assign({}, entry, { offset: clamped });
							changed = true;
						}
					}
					return changed ? next : current;
				});
			}, [hiddenToken, layoutRoot]);

			overlayRef.current = overlay;
			scrollDataRef.current = scrollData;
			layoutIndexRef.current = layoutIndex;
			dslRef.current = dsl;

			const currentScrollOffset = react.useCallback((scrollId) => {
				const entry = overlayRef.current[scrollId];
				return entry && entry.offset ? entry.offset : { x: 0, y: 0 };
			}, []);

			const scrollBounds = react.useCallback((info, raw, axis) => {
				const range = axis === "x" ? info.rangeX : info.rangeY;
				const movementType = info.component.movementType || "elastic";
				if (movementType === "unrestricted") return raw;
				if (movementType === "clamped") return clampNumber(raw, -range, 0);
				if (raw < -range) return -range + (raw + range) * 0.35;
				if (raw > 0) return raw * 0.35;
				return raw;
			}, []);

			const settleScroll = react.useCallback((scrollId, initialVx, initialVy) => {
				const emitEnd = () => {
					const info = scrollDataRef.current.get(scrollId);
					if (info) {
						emit("ScrollRect「" + info.name + "」拖动结束 · 位置 (" + info.normX.toFixed(2) + ", " + info.normY.toFixed(2) + ")");
						publishInteraction("scroll", { nodeId: scrollId, nodeName: info.name, phase: "end", x: info.normX, y: info.normY });
					}
				};
				const first = scrollDataRef.current.get(scrollId);
				if (!first) return;
				cancelScrollAnim(scrollId);
				const component = first.component;
				const movementType = component.movementType || "elastic";
				const inertia = component.inertia !== false;
				const deceleration = clampNumber(numberAt(component.decelerationRate, 0.135), 0.001, 0.999);
				const elasticity = Math.max(0.01, numberAt(component.elasticity, 0.1));
				let vx = inertia ? initialVx : 0;
				let vy = inertia ? initialVy : 0;
				const offsetNow = currentScrollOffset(scrollId);
				const outside = movementType !== "unrestricted" && (offsetNow.x < -first.rangeX - 0.5 || offsetNow.x > 0.5 || offsetNow.y < -first.rangeY - 0.5 || offsetNow.y > 0.5);
				if (Math.hypot(vx, vy) < 30 && !outside) {
					emitEnd();
					return;
				}
				let last = Date.now();
				let raf = 0;
				const step = () => {
					const info = scrollDataRef.current.get(scrollId);
					if (!info) {
						animsRef.current.delete(scrollId);
						return;
					}
					const now = Date.now();
					const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
					last = now;
					const decay = Math.pow(deceleration, dt);
					vx *= decay;
					vy *= decay;
					const offset = currentScrollOffset(scrollId);
					let x = offset.x + vx * dt;
					let y = offset.y + vy * dt;
					let settled = Math.hypot(vx, vy) < 8;
					if (movementType !== "unrestricted") {
						const spring = (position, range, velocity) => {
							const min = -range;
							if (position > 0 || position < min) {
								const bound = position > 0 ? 0 : min;
								const outward = (position > 0 && velocity > 0) || (position < min && velocity < 0);
								let nextVelocity = outward ? 0 : velocity;
								let nextPosition = position;
								if (movementType === "clamped") {
									nextPosition = bound;
									nextVelocity = 0;
								} else {
									nextPosition = position + (bound - position) * Math.min(1, dt * 10 * (elasticity / 0.1));
									if (Math.abs(bound - nextPosition) < 0.5) nextPosition = bound;
								}
								return { position: nextPosition, velocity: nextVelocity };
							}
							return { position, velocity };
						};
						const sx = spring(x, info.rangeX, vx);
						x = sx.position;
						vx = sx.velocity;
						const sy = spring(y, info.rangeY, vy);
						y = sy.position;
						vy = sy.velocity;
						const withinX = x <= 0.001 && x >= -info.rangeX - 0.001;
						const withinY = y <= 0.001 && y >= -info.rangeY - 0.001;
						settled = settled && withinX && withinY;
					}
					setNodeState(scrollId, { offset: { x, y } });
					if (settled) {
						animsRef.current.delete(scrollId);
						emitEnd();
						return;
					}
					raf = window.requestAnimationFrame(step);
					animsRef.current.set(scrollId, () => window.cancelAnimationFrame(raf));
				};
				animsRef.current.set(scrollId, () => window.cancelAnimationFrame(raf));
				raf = window.requestAnimationFrame(step);
			}, [cancelScrollAnim, currentScrollOffset, emit, publishInteraction, setNodeState]);

			const beginScrollDrag = react.useCallback((event, scrollId) => {
				if (event.button !== 0) return;
				const info = scrollDataRef.current.get(scrollId);
				if (!info) return;
				const component = info.component;
				if (component.horizontal === false && component.vertical === false) return;
				event.preventDefault();
				event.stopPropagation();
				cancelScrollAnim(scrollId);
				const startOffset = currentScrollOffset(scrollId);
				const startX = event.clientX;
				const startY = event.clientY;
				const scale = scaleRef.current || 1;
				const win = pointerOwnerWindow(event);
				let moved = false;
				let samples = [{ t: Date.now(), x: startX, y: startY }];
				const move = (pointerEvent) => {
					const rawDx = pointerEvent.clientX - startX;
					const rawDy = pointerEvent.clientY - startY;
					if (!moved && Math.hypot(rawDx, rawDy) < 4) return;
					if (!moved) {
						moved = true;
						setScrollDraggingId(scrollId);
						emit("ScrollRect「" + info.name + "」拖动开始");
						publishInteraction("scroll", { nodeId: scrollId, nodeName: info.name, phase: "begin", x: info.normX, y: info.normY });
					}
					const next = {
						x: component.horizontal === false ? startOffset.x : scrollBounds(info, startOffset.x + rawDx / scale, "x"),
						y: component.vertical === false ? startOffset.y : scrollBounds(info, startOffset.y + rawDy / scale, "y")
					};
					setNodeState(scrollId, { offset: next });
					samples.push({ t: Date.now(), x: pointerEvent.clientX, y: pointerEvent.clientY });
					const cutoff = Date.now() - 120;
					samples = samples.filter((sample) => sample.t >= cutoff);
				};
				const up = (pointerEvent) => {
					win.removeEventListener("pointermove", move);
					if (!moved) return;
					suppressClickUntilRef.current = Date.now() + 300;
					setScrollDraggingId(null);
					let vx = 0;
					let vy = 0;
					if (pointerEvent && samples.length > 0) {
						const first = samples[0];
						const dt = (Date.now() - first.t) / 1000;
						if (dt > 0.02) {
							vx = (pointerEvent.clientX - first.x) / dt / scale;
							vy = (pointerEvent.clientY - first.y) / dt / scale;
						}
					}
					if (component.horizontal === false) vx = 0;
					if (component.vertical === false) vy = 0;
					settleScroll(scrollId, vx, vy);
				};
				win.addEventListener("pointermove", move);
				win.addEventListener("pointerup", up, { once: true });
				win.addEventListener("pointercancel", up, { once: true });
			}, [cancelScrollAnim, currentScrollOffset, emit, publishInteraction, scrollBounds, setNodeState, settleScroll]);

			const applyWheel = react.useCallback((scrollId, deltaX, deltaY) => {
				const info = scrollDataRef.current.get(scrollId);
				if (!info) return;
				const component = info.component;
				cancelScrollAnim(scrollId);
				const scale = scaleRef.current || 1;
				const sensitivity = numberAt(component.scrollSensitivity, 1);
				const current = currentScrollOffset(scrollId);
				const movementType = component.movementType || "elastic";
				const horizontal = component.horizontal !== false;
				const vertical = component.vertical !== false;
				// Unity OnScroll：单轴启用时另一轴的滚轮输入按较大量并入主轴
				const { dx, dy } = scrollWheelDeltas(horizontal, vertical, deltaX, deltaY);
				const clampHard = (value, range) => movementType === "unrestricted" ? value : clampNumber(value, -range, 0);
				const next = {
					x: !horizontal ? current.x : clampHard(current.x - (dx * sensitivity) / scale, info.rangeX),
					y: !vertical ? current.y : clampHard(current.y - (dy * sensitivity) / scale, info.rangeY)
				};
				if (Math.abs(next.x - current.x) < 0.01 && Math.abs(next.y - current.y) < 0.01) return;
				setNodeState(scrollId, { offset: next });
				const normX = info.rangeX > 0 ? clamp01(-next.x / info.rangeX) : 0;
				const normY = info.rangeY > 0 ? clamp01(-next.y / info.rangeY) : 0;
				emit("ScrollRect「" + info.name + "」滚轮滚动 → (" + normX.toFixed(2) + ", " + normY.toFixed(2) + ")", "wheel:" + scrollId);
				publishInteraction("scroll", { nodeId: scrollId, nodeName: info.name, phase: "wheel", x: normX, y: normY });
			}, [cancelScrollAnim, currentScrollOffset, emit, publishInteraction, setNodeState]);
			applyWheelRef.current = applyWheel;

			react.useEffect(() => {
				const element = canvasRef.current;
				if (!element) return undefined;
				const onWheel = (event) => {
					const target = event.target && typeof event.target.closest === "function" ? event.target.closest("[data-scroll-id]") : null;
					if (!target) return;
					event.preventDefault();
					event.stopPropagation();
					applyWheelRef.current(target.getAttribute("data-scroll-id"), event.deltaX, event.deltaY);
				};
				element.addEventListener("wheel", onWheel, { passive: false });
				return () => element.removeEventListener("wheel", onWheel);
			}, [layoutRoot]);

			const canvasPointFromEvent = react.useCallback((event) => {
				const element = canvasRef.current;
				if (!element) return { x: 0, y: 0 };
				const rect = element.getBoundingClientRect();
				const scale = scaleRef.current || 1;
				return { x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale };
			}, []);

			const beginSliderDrag = react.useCallback((event, node, slider) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.stopPropagation();
				const nodeId = typeof node.nodeId === "string" ? node.nodeId : "";
				if (nodeId === "") return;
				setDraggingId(nodeId);
				const apply = (pointerEvent) => {
					const entry = layoutIndexRef.current.get(nodeId);
					if (!entry) return;
					const frame = entry.frame;
					const point = canvasPointFromEvent(pointerEvent);
					const direction = typeof slider.direction === "string" ? slider.direction : "leftToRight";
					const horizontal = isHorizontalDirection(direction);
					let fraction = horizontal
						? (point.x - frame.x) / Math.max(1, frame.width)
						: (point.y - frame.y) / Math.max(1, frame.height);
					fraction = clamp01(fraction);
					if (horizontal ? direction === "rightToLeft" : direction === "bottomToTop") fraction = 1 - fraction;
					const min = numberAt(slider.minValue, 0);
					const max = numberAt(slider.maxValue, 1);
					let value = min + fraction * (max - min);
					if (slider.wholeNumbers === true) value = Math.round(value);
					value = clampNumber(value, Math.min(min, max), Math.max(min, max));
					setNodeState(nodeId, { value });
					emit("Slider「" + playNodeName(node) + "」onValueChanged → " + displayNumber(value), "slider:" + nodeId);
					publishInteraction("slider", { nodeId, nodeName: playNodeName(node), value });
				};
				apply(event);
				const win = pointerOwnerWindow(event);
				const move = (pointerEvent) => apply(pointerEvent);
				const up = () => {
					win.removeEventListener("pointermove", move);
					setDraggingId(null);
				};
				win.addEventListener("pointermove", move);
				win.addEventListener("pointerup", up, { once: true });
				win.addEventListener("pointercancel", up, { once: true });
			}, [canvasPointFromEvent, emit, publishInteraction, setNodeState]);

			const effectiveScrollbarValue = react.useCallback((barId, scrollbar, link) => {
				if (link) {
					const info = scrollDataRef.current.get(link.scrollId);
					if (info) {
						const norm = link.axis === "horizontal" ? info.normX : info.normY;
						return clamp01(scrollbarValueFromNorm(scrollbar.direction, link.axis === "horizontal", norm));
					}
				}
				const entry = overlayRef.current[barId];
				return clamp01(entry && typeof entry.value === "number" ? entry.value : numberAt(scrollbar.value, 0));
			}, []);

			const effectiveScrollbarSize = react.useCallback((barId, scrollbar, link) => {
				if (link) {
					const info = scrollDataRef.current.get(link.scrollId);
					if (info) {
						const horizontal = link.axis === "horizontal";
						const contentLength = horizontal ? info.contentFrame.width : info.contentFrame.height;
						const viewportLength = horizontal ? info.viewportFrame.width : info.viewportFrame.height;
						const offset = horizontal ? info.offset.x : info.offset.y;
						const range = horizontal ? info.rangeX : info.rangeY;
						return scrollbarLinkedSize(viewportLength, contentLength, offset, range);
					}
				}
				return clamp01(numberAt(scrollbar.size, 0.2));
			}, []);

			const applyScrollbarValue = react.useCallback((node, scrollbar, rawValue, link) => {
				let value = clamp01(rawValue);
				const steps = Math.max(0, Math.round(numberAt(scrollbar.numberOfSteps, 0)));
				if (steps > 1) value = Math.round(value * (steps - 1)) / (steps - 1);
				if (link) {
					const info = scrollDataRef.current.get(link.scrollId);
					if (info) {
						cancelScrollAnim(link.scrollId);
						const norm = clamp01(scrollbarValueFromNorm(scrollbar.direction, link.axis === "horizontal", value));
						const current = currentScrollOffset(link.scrollId);
						setNodeState(link.scrollId, {
							offset: link.axis === "horizontal"
								? { x: -norm * info.rangeX, y: current.y }
								: { x: current.x, y: -norm * info.rangeY }
						});
					}
				} else {
					setNodeState(node.nodeId, { value });
				}
				emit("Scrollbar「" + playNodeName(node) + "」onValueChanged → " + value.toFixed(2), "scrollbar:" + node.nodeId);
				publishInteraction("scrollbar", { nodeId: typeof node.nodeId === "string" ? node.nodeId : "", nodeName: playNodeName(node), value });
			}, [cancelScrollAnim, currentScrollOffset, emit, publishInteraction, setNodeState]);

			const pressScrollbarTrack = react.useCallback((event, node, scrollbar) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.stopPropagation();
				const nodeId = typeof node.nodeId === "string" ? node.nodeId : "";
				const link = linkage.scrollbarLinks.get(nodeId);
				const entry = layoutIndexRef.current.get(nodeId);
				if (!entry) return;
				const frame = entry.frame;
				const point = canvasPointFromEvent(event);
				const direction = typeof scrollbar.direction === "string" ? scrollbar.direction : "leftToRight";
				const horizontal = isHorizontalDirection(direction);
				const fraction = horizontal
					? clamp01((point.x - frame.x) / Math.max(1, frame.width))
					: clamp01((point.y - frame.y) / Math.max(1, frame.height));
				const size = effectiveScrollbarSize(nodeId, scrollbar, link);
				// Unity ClickRepeat 语义：Handle 中心直接移到指针处（非逐页步进）
				const value = scrollbarTrackPressValue(direction, horizontal, fraction, size);
				if (value === null) return;
				applyScrollbarValue(node, scrollbar, value, link);
			}, [applyScrollbarValue, canvasPointFromEvent, effectiveScrollbarSize, linkage]);

			const beginScrollbarHandleDrag = react.useCallback((event, handleNodeId) => {
				if (event.button !== 0) return;
				const barId = linkage.scrollbarHandles.get(handleNodeId) || "";
				const barNode = barId && dsl && dsl.root ? findPreviewNodeById(dsl.root, barId) : null;
				const scrollbar = barNode ? componentOf(barNode, "Scrollbar") : null;
				if (!barNode || !scrollbar || scrollbar.interactable === false) return;
				event.preventDefault();
				event.stopPropagation();
				const link = linkage.scrollbarLinks.get(barId);
				const entry = layoutIndexRef.current.get(barId);
				if (!entry) return;
				const frame = entry.frame;
				const direction = typeof scrollbar.direction === "string" ? scrollbar.direction : "leftToRight";
				const horizontal = isHorizontalDirection(direction);
				const trackLength = Math.max(1, horizontal ? frame.width : frame.height);
				const size = effectiveScrollbarSize(barId, scrollbar, link);
				const handleLength = trackLength * clamp01(size);
				const travel = Math.max(1, trackLength - handleLength);
				const startValue = effectiveScrollbarValue(barId, scrollbar, link);
				const startX = event.clientX;
				const startY = event.clientY;
				const scale = scaleRef.current || 1;
				setDraggingId(handleNodeId);
				const win = pointerOwnerWindow(event);
				const move = (pointerEvent) => {
					const delta = horizontal ? (pointerEvent.clientX - startX) / scale : (pointerEvent.clientY - startY) / scale;
					let dValue = delta / travel;
					if (horizontal ? direction === "rightToLeft" : direction === "bottomToTop") dValue = -dValue;
					applyScrollbarValue(barNode, scrollbar, startValue + dValue, link);
				};
				const up = () => {
					win.removeEventListener("pointermove", move);
					setDraggingId(null);
				};
				win.addEventListener("pointermove", move);
				win.addEventListener("pointerup", up, { once: true });
				win.addEventListener("pointercancel", up, { once: true });
			}, [applyScrollbarValue, dsl, effectiveScrollbarSize, effectiveScrollbarValue, linkage]);

			const handleToggleClick = react.useCallback((node, toggle) => {
				const nodeId = typeof node.nodeId === "string" ? node.nodeId : "";
				const current = playToggleOn(overlayRef.current, nodeId, toggle);
				const nextOn = !current;
				const name = playNodeName(node);
				const groupNode = typeof toggle.toggleGroupNodeId === "string" && toggle.toggleGroupNodeId !== "" && dsl && dsl.root
					? findPreviewNodeById(dsl.root, toggle.toggleGroupNodeId)
					: null;
				const group = groupNode ? componentOf(groupNode, "ToggleGroup") : null;
				if (!nextOn && group && group.allowSwitchOff !== true) {
					emit("Toggle「" + name + "」属于 ToggleGroup 且 allowSwitchOff=false，保持选中");
					return;
				}
				if (nextOn && group && groupNode) {
					const members = toggleGroups.get(groupNode.nodeId) || [];
					for (const member of members) {
						const memberId = typeof member.nodeId === "string" ? member.nodeId : "";
						if (memberId === nodeId) continue;
						const memberToggle = componentOf(member, "Toggle");
						if (memberToggle && playToggleOn(overlayRef.current, memberId, memberToggle)) {
							setNodeState(memberId, { isOn: false });
							emit("Toggle「" + playNodeName(member) + "」onValueChanged → false");
							publishInteraction("toggle", { nodeId: memberId, nodeName: playNodeName(member), isOn: false });
						}
					}
				}
				setNodeState(nodeId, { isOn: nextOn });
				emit("Toggle「" + name + "」onValueChanged → " + String(nextOn));
				publishInteraction("toggle", { nodeId, nodeName: name, isOn: nextOn });
			}, [dsl, emit, publishInteraction, setNodeState, toggleGroups]);

			const handleButtonClick = react.useCallback((node) => {
				emit("Button「" + playNodeName(node) + "」onClick()");
				publishInteraction("button", { nodeId: typeof node.nodeId === "string" ? node.nodeId : "", nodeName: playNodeName(node) });
			}, [emit, publishInteraction]);

			const resetPreview = react.useCallback(() => {
				for (const cancel of animsRef.current.values()) cancel();
				animsRef.current.clear();
				setOverlay({});
				setDraggingId(null);
				setScrollDraggingId(null);
				if (logicSourceRef.current) loadLogic(logicSourceRef.current);
				emit("预览状态已重置为 DSL 初始值");
			}, [emit, loadLogic]);

			react.useEffect(() => {
				const element = logBodyRef.current;
				if (element) element.scrollTop = element.scrollHeight;
			}, [logEntries, logOpen]);

			const resolution = canvasSize(dsl);
			const canvasWidth = layoutRoot ? Math.max(1, layoutRoot.frame.width) : resolution[0];
			const canvasHeight = layoutRoot ? Math.max(1, layoutRoot.frame.height) : resolution[1];
			const measuredWidth = Number.isFinite(bounds.width) && bounds.width >= 120 ? bounds.width : 440;
			const measuredHeight = Number.isFinite(bounds.height) && bounds.height >= 120 ? bounds.height : 620;
			const scale = Math.max(0.03, Math.min(1, (measuredWidth - 24) / canvasWidth, (measuredHeight - 24) / canvasHeight));
			scaleRef.current = scale;

			const ctx = {
				root: dsl && dsl.root ? dsl.root : null,
				contentOffsets,
				toggleGraphics,
				hiddenScrollbars,
				hiddenNodeIds,
				textOverrides,
				scrollbarHandles: linkage.scrollbarHandles,
				draggingId,
				scrollDraggingId,
				clickSuppressed: () => Date.now() < suppressClickUntilRef.current,
				sliderNorm: (nodeId, slider) => {
					const entry = overlay[nodeId];
					const value = entry && typeof entry.value === "number" ? entry.value : numberAt(slider.value, 0);
					const min = numberAt(slider.minValue, 0);
					const max = numberAt(slider.maxValue, 1);
					return max === min ? 0 : clamp01((value - min) / (max - min));
				},
				scrollbarValue: (nodeId, scrollbar) => effectiveScrollbarValue(nodeId, scrollbar, linkage.scrollbarLinks.get(nodeId)),
				scrollbarSize: (nodeId, scrollbar) => effectiveScrollbarSize(nodeId, scrollbar, linkage.scrollbarLinks.get(nodeId)),
				beginScrollDrag,
				beginSliderDrag,
				beginScrollbarHandleDrag,
				pressScrollbarTrack,
				handleToggleClick,
				handleButtonClick
			};

			return h("div", { className: "uguiPlay_root" },
				h("div", { className: "uguiPlay_toolbar" },
					h("button", { type: "button", className: "uguiPlay_toolbarBtn", title: "清除全部交互状态，回到 DSL 初始值", onClick: resetPreview }, "重置状态"),
					h("button", {
						type: "button",
						className: "uguiPlay_toolbarBtn",
						"data-active": subtreeOnly || undefined,
						disabled: !subtreeAvailable,
						title: subtreeAvailable ? "只预览当前选中节点的子树" : "先在设计器中选择一个节点",
						onClick: () => setSubtreeOnly((value) => !value)
					}, "仅预览选中子树"),
					h("span", { className: "uguiPlay_hint" }, "交互仅模拟运行，不写入 DSL")),
				h("div", { ref: shellRef, className: "uguiPlay_shell", "data-background": background },
					h("div", { className: "uguiSide_previewModes", role: "group", "aria-label": "预览背景" },
						h("button", { type: "button", className: "uguiSide_previewMode", "data-active": background === "checker" || undefined, onClick: () => selectBackground("checker") }, "棋盘格"),
						h("button", { type: "button", className: "uguiSide_previewMode", "data-active": background === "dark" || undefined, onClick: () => selectBackground("dark") }, "深色")),
					h("div", { className: "uguiSide_canvasWrap", style: { width: canvasWidth * scale, height: canvasHeight * scale } },
						h("div", { ref: canvasRef, className: "uguiPlay_canvas", style: { width: canvasWidth, height: canvasHeight, transform: "scale(" + scale + ")" } },
							layoutRoot ? renderPlayNode(layoutRoot, ctx, null) : null))),
				h("div", { className: "uguiPlay_log" },
					h("div", {
						className: "uguiPlay_logHead",
						role: "button",
						tabIndex: 0,
						onClick: () => setLogOpen((value) => !value),
						onKeyDown: (event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								setLogOpen((value) => !value);
							}
						}
					},
						h("span", { "aria-hidden": true }, logOpen ? "▾" : "▸"),
						h("span", null, "事件日志"),
						h("span", { className: "uguiPlay_logCount" }, String(logEntries.length)),
						h("span", { style: { flex: 1 } }),
						h("button", { type: "button", className: "uguiPlay_logClear", onClick: (event) => { event.stopPropagation(); setLogEntries([]); } }, "清空")),
					logOpen ? h("div", { ref: logBodyRef, className: "uguiPlay_logBody" },
						logEntries.length === 0
							? h("div", { className: "uguiPlay_logEmpty" }, "与预览交互后，这里会显示 Unity 事件流。")
							: logEntries.map((entry) => h("div", { key: entry.id, className: "uguiPlay_logRow" },
								h("span", { className: "uguiPlay_logTime" }, entry.time),
								entry.text))) : null));
		}

		// 生成 Prefab 按钮旁的逻辑同步徽章：纯显示刷新（轻量 GET，不派子代理、不碰 Unity），
		// 1.5s 轮询保证「子代理核对中」进度实时可见；切换画布与点击生成后立即刷新一次。
		function LogicSyncBadge(props) {
			const canvasId = props.canvasId || "";
			const refreshToken = props.refreshToken || 0;
			const [sync, setSync] = react.useState(null);
			react.useEffect(() => {
				if (!canvasId) { setSync(null); return undefined; }
				let cancelled = false;
				const check = async () => {
					try {
						const response = await fetch("/local/ugui-sync?canvasId=" + encodeURIComponent(canvasId), { cache: "no-store" });
						const result = await response.json().catch(() => null);
						if (!cancelled && result && result.ok === true) setSync(result);
					} catch {
						// 旧版本 host 没有该路由：保持无徽章
					}
				};
				check();
				const timer = window.setInterval(check, 1500);
				return () => {
					cancelled = true;
					window.clearInterval(timer);
				};
			}, [canvasId, refreshToken]);
			if (!sync || typeof sync.logicMtimeMs !== "number" || sync.logicMtimeMs === null) return null;
			const reviewing = sync.review && sync.review.state === "reviewing";
			let state = "synced";
			let label = "逻辑已同步";
			let tip = "logic.js 与 view.cs 已同步（view.cs 不旧于 logic.js）";
			if (sync.needsReview === true && reviewing) {
				state = "reviewing";
				label = "子代理核对中…";
				tip = "逻辑同步子代理正在以 logic.js 为基准核对/修正 C# 脚本" + (sync.review.startedAt ? "，开始于 " + new Date(sync.review.startedAt).toLocaleTimeString() : "");
			} else if (sync.needsReview === true) {
				state = "pending";
				label = "逻辑待同步";
				tip = "logic.js 比 view.cs 新（或缺少 view.cs）：生成 Prefab 会被逻辑同步闸门拦下，需要先由子代理核对 Unity 侧脚本";
			} else if (sync.review && sync.review.state === "synced" && typeof sync.review.summary === "string" && sync.review.summary !== "") {
				tip = "最近同步：" + sync.review.summary;
			}
			return h("span", { className: "uguiSide_syncBadge", "data-state": state, title: tip }, label);
		}

		function DesignerAction(props) {
			const wide = props.wide === true;
			const sessionId = props.sessionId || "default";
			const [open, setOpen] = react.useState(false);
			const [popout, setPopout] = react.useState(null);
			const [tab, setTab] = react.useState("designer");
			const [payload, setPayload] = react.useState(null);
			const [workspace, setWorkspace] = react.useState({ workspaceVersion: 1, defaultCanvasId: null, canvases: [] });
			const [activeCanvasId, setActiveCanvasId] = react.useState(() => initialActiveCanvas(sessionId));
			const [error, setError] = react.useState("");
			const [loading, setLoading] = react.useState(false);
			const [overviewLoading, setOverviewLoading] = react.useState(false);
			const [status, setStatus] = react.useState("");
			const [building, setBuilding] = react.useState(false);
			const [syncRefreshToken, setSyncRefreshToken] = react.useState(0);
			const [selectedPath, setSelectedPath] = react.useState([]);
			const [panelSize] = react.useState(initialPanelSize);
			const rootRef = react.useRef(null);
			const popoutRef = react.useRef(null);
			const payloadRef = react.useRef(null);
			const activeCanvasIdRef = react.useRef(activeCanvasId);
			const loadRequestRef = react.useRef(0);
			const overviewRequestRef = react.useRef(0);
			const editingRef = react.useRef(false);
			const selectedNodeIdRef = react.useRef("");
			const undoHistoryRef = react.useRef(null);
			if (undoHistoryRef.current === null) undoHistoryRef.current = createGestureUndoHistory(50);

			const adoptPayload = react.useCallback((next) => {
				const current = payloadRef.current;
				if (current && current.canvasId === next.canvasId && Number.isFinite(current.version) && Number.isFinite(next.version) && next.version < current.version) return;
				payloadRef.current = next;
				setPayload(next);
				if (next && next.dsl && next.dsl.root) {
					const preservedPath = findNodePathById(next.dsl.root, selectedNodeIdRef.current);
					const resolvedPath = preservedPath === null ? [] : preservedPath;
					const resolvedNode = nodeAtPath(next.dsl.root, resolvedPath) || next.dsl.root;
					selectedNodeIdRef.current = typeof resolvedNode.nodeId === "string" ? resolvedNode.nodeId : "";
					setSelectedPath((currentPath) => pathKey(currentPath) === pathKey(resolvedPath) ? currentPath : resolvedPath);
				}
				if (next && next.workspace && Array.isArray(next.workspace.canvases)) setWorkspace((currentWorkspace) => mergeWorkspace(currentWorkspace, next.workspace));
			}, []);

			const loadWorkspaceOverview = react.useCallback(async (reportError) => {
				const requestId = ++overviewRequestRef.current;
				if (reportError) setOverviewLoading(true);
				try {
					const response = await fetch("/local/ugui-workspace", { method: "GET", cache: "no-store" });
					const result = await response.json().catch(() => null);
					if (!response.ok || !result || result.ok !== true || !result.workspace) {
						throw new Error(result && (result.message || result.error) ? (result.message || result.error) : "HTTP " + response.status);
					}
					if (requestId !== overviewRequestRef.current) return false;
					setWorkspace((currentWorkspace) => mergeWorkspace(currentWorkspace, result.workspace));
					if (reportError) setError("");
					return true;
				} catch (reason) {
					if (reportError && requestId === overviewRequestRef.current) setError("读取多 Canvas 总览失败：" + String(reason && reason.message ? reason.message : reason));
					return false;
				} finally {
					if (reportError) setOverviewLoading(false);
				}
			}, []);

			const loadDsl = react.useCallback(async (visibleLoading, force, targetCanvasId) => {
				if (editingRef.current && !force) return false;
				const requestId = ++loadRequestRef.current;
				const requestedId = targetCanvasId || activeCanvasIdRef.current || "";
				if (visibleLoading) setLoading(true);
				try {
					const request = async (canvasId) => {
						const url = "/local/ugui-dsl" + (canvasId ? "?canvasId=" + encodeURIComponent(canvasId) : "");
						const response = await fetch(url, { method: "GET", cache: "no-store" });
						const result = await response.json().catch(() => null);
						return { response, result };
					};
					let outcome = await request(requestedId);
					if (outcome.response.status === 404 && requestedId) outcome = await request("");
					if (!outcome.response.ok || !outcome.result || outcome.result.ok !== true) {
						throw new Error(outcome.result && (outcome.result.message || outcome.result.error) ? (outcome.result.message || outcome.result.error) : "HTTP " + outcome.response.status);
					}
					if (requestId !== loadRequestRef.current) return null;
					const resolvedId = outcome.result.canvasId || requestedId;
					activeCanvasIdRef.current = resolvedId;
					setActiveCanvasId(resolvedId);
					rememberActiveCanvas(sessionId, resolvedId);
					if (!editingRef.current || force) adoptPayload(outcome.result);
					setError("");
					return true;
				} catch (reason) {
					if (requestId !== loadRequestRef.current) return null;
					setError("读取 DSL 失败：" + String(reason && reason.message ? reason.message : reason));
					return false;
				} finally {
					if (visibleLoading && requestId === loadRequestRef.current) setLoading(false);
				}
			}, [adoptPayload, sessionId]);

			const switchCanvas = react.useCallback(async (canvasId) => {
				if (!canvasId || canvasId === activeCanvasIdRef.current) return true;
				if (editingRef.current || building) {
					setStatus(editingRef.current ? "请等待当前编辑保存完成" : "请等待当前 Prefab 构建完成");
					return false;
				}
				activeCanvasIdRef.current = canvasId;
				setActiveCanvasId(canvasId);
				rememberActiveCanvas(sessionId, canvasId);
				clearEditorTarget(sessionId);
				payloadRef.current = null;
				setPayload(null);
				selectedNodeIdRef.current = "";
				setSelectedPath([]);
				setStatus("正在切换 Canvas…");
				setError("");
				const loaded = await loadDsl(true, true, canvasId);
				if (loaded !== null) setStatus(loaded ? "已切换 Canvas" : "切换失败");
				return loaded === true;
			}, [building, loadDsl, sessionId]);

			const openCanvasFromOverview = react.useCallback(async (canvasId) => {
				if (canvasId === activeCanvasIdRef.current) {
					setTab("designer");
					return;
				}
				const loaded = await switchCanvas(canvasId);
				if (loaded) setTab("designer");
			}, [switchCanvas]);

			const buildPrefab = react.useCallback(async () => {
				if (building) return;
				setBuilding(true);
				setStatus("正在调用 Unity CLI 生成 Prefab…");
				setError("");
				try {
					const current = payloadRef.current;
					const buildUrl = current && current.canvasId ? "/local/ugui-build?canvasId=" + encodeURIComponent(current.canvasId) : "/local/ugui-build";
					const response = await fetch(buildUrl, { method: "POST" });
					const result = await response.json().catch(() => null);
					if (!response.ok || !result || result.ok !== true) {
						const message = result && result.error === "build-in-progress" ? "已有 Prefab 构建正在进行" : result && (result.error || (result.result && result.result.message)) ? (result.error || result.result.message) : "HTTP " + response.status;
						throw new Error(message);
					}
					const prefab = result.result && result.result.prefab;
					setStatus(prefab ? "已生成 " + prefab : "Prefab 已生成");
					setError("");
				} catch (reason) {
					setStatus("生成失败");
					setError("生成 Prefab 失败：" + String(reason && reason.message ? reason.message : reason));
				} finally {
					setBuilding(false);
					setSyncRefreshToken((token) => token + 1);
				}
			}, [building]);

			const sendPatch = react.useCallback(async (body) => {
				const current = payloadRef.current;
				const requestBody = body.canvasId || !current || !current.canvasId
					? body
					: Object.assign({}, body, { canvasId: current.canvasId });
				const response = await fetch("/local/ugui-dsl", {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(requestBody)
				});
				const result = await response.json().catch(() => null);
				if (response.status === 409) {
					setStatus("DSL 已被其他操作修改，正在刷新");
					setError("保存冲突：当前编辑未覆盖外部修改，请刷新后重试。");
					await loadDsl(true, true);
					throw new Error("version-conflict");
				}
				if (!response.ok || !result || result.ok !== true) throw new Error(result && (result.message || result.error) ? (result.message || result.error) : "HTTP " + response.status);
				adoptPayload(result);
				setError("");
				return result;
			}, [adoptPayload, loadDsl]);

			const selectTargetPath = react.useCallback((path) => {
				const nextPath = Array.isArray(path) ? path : [];
				if (pathKey(nextPath) === pathKey(selectedPath)) return;
				const currentDsl = payloadRef.current && payloadRef.current.dsl;
				const nextNode = currentDsl && currentDsl.root ? nodeAtPath(currentDsl.root, nextPath) : null;
				const nextNodeId = nextNode && typeof nextNode.nodeId === "string" ? nextNode.nodeId : "";
				if (nextNodeId !== selectedNodeIdRef.current) clearEditorTarget(sessionId);
				selectedNodeIdRef.current = nextNodeId;
				setSelectedPath([...nextPath]);
			}, [selectedPath, sessionId]);

			const dropImage = react.useCallback(async (path, dataTransfer) => {
				const files = dataTransfer && dataTransfer.files ? Array.from(dataTransfer.files) : [];
				const file = files.find((item) => item && (/^image\/(png|jpeg)$/i.test(item.type) || /\.(png|jpe?g)$/i.test(item.name || "")));
				if (!file) {
					setStatus("图片拖入失败");
					setError("请拖入本地 PNG/JPG 文件；网页中的图片请先下载后再拖入。");
					return;
				}
				selectTargetPath(path);
				setStatus("正在暂存图片 " + file.name + "…");
				setError("");
				editingRef.current = true;
				try {
					const current = payloadRef.current;
					if (!current) throw new Error("DSL 尚未加载");
					const uploadUrl = "/local/ugui-asset?" + (current.canvasId ? "canvasId=" + encodeURIComponent(current.canvasId) + "&" : "") + "name=" + encodeURIComponent(file.name || "image");
					const upload = await fetch(uploadUrl, {
						method: "POST",
						headers: { "content-type": file.type || "application/octet-stream" },
						body: file
					});
					const uploaded = await upload.json().catch(() => null);
					if (!upload.ok || !uploaded || uploaded.ok !== true || !uploaded.asset) {
						throw new Error(uploaded && uploaded.error ? uploaded.error : "HTTP " + upload.status);
					}
					const targetNode = nodeAtPath(current.dsl.root, path);
					await sendPatch({
						kind: "node-image",
						nodeId: targetNode && targetNode.nodeId,
						nodePath: path,
						expectedVersion: current.version,
						spritePath: uploaded.asset.spritePath,
						sourceName: uploaded.asset.sourceName
					});
					setStatus("图片已暂存；只有主动生成 Prefab 才会导入 Unity");
					setError("");
				} catch (reason) {
					if (String(reason && reason.message) !== "version-conflict") {
						setStatus("图片拖入失败");
						setError("图片拖入失败：" + String(reason && reason.message ? reason.message : reason));
					}
				} finally {
					editingRef.current = false;
				}
			}, [selectTargetPath, sendPatch]);

			const updateLocalRect = react.useCallback((path, rect) => {
				const current = payloadRef.current;
				if (!current || !current.dsl) return;
				const next = Object.assign({}, current, { dsl: replaceNodeRect(current.dsl, path, rect) });
				payloadRef.current = next;
				setPayload(next);
			}, []);

			const persistRect = react.useCallback(async (path, rect) => {
				const current = payloadRef.current;
				if (!current) return;
				setStatus("保存中…");
				try {
					const targetNode = current.dsl && current.dsl.root ? nodeAtPath(current.dsl.root, path) : null;
					const result = await sendPatch({ kind: "node-rect", nodeId: targetNode && targetNode.nodeId, nodePath: path, expectedVersion: current.version, rect });
					setStatus("已保存");
					return result;
				} catch (reason) {
					if (String(reason && reason.message) !== "version-conflict") {
						setError("保存失败：" + String(reason && reason.message ? reason.message : reason));
						setStatus("保存失败");
					}
					return null;
				}
			}, [sendPatch]);

			const commitFrame = react.useCallback(async (field, value) => {
				const current = payloadRef.current;
				const meta = current && nodeMeta(current.dsl, selectedPath);
				if (!meta || meta.root) return;
				const frame = Object.assign({}, meta.frame, { [field]: value });
				const rect = rectFromFrame(meta.node.rect, frame, meta.parentWidth, meta.parentHeight);
				editingRef.current = true;
				updateLocalRect(selectedPath, rect);
				try {
					await persistRect(selectedPath, rect);
				} finally {
					editingRef.current = false;
				}
			}, [persistRect, selectedPath, updateLocalRect]);

			const commitAnchor = react.useCallback(async (anchorName) => {
				const current = payloadRef.current;
				const meta = current && nodeMeta(current.dsl, selectedPath);
				if (!meta || meta.root || String(meta.node.rect && meta.node.rect.anchor || "center") === anchorName) return;
				const rect = rectForAnchor(anchorName, meta.frame, meta.parentWidth, meta.parentHeight, meta.node.rect);
				editingRef.current = true;
				updateLocalRect(selectedPath, rect);
				try {
					await persistRect(selectedPath, rect);
				} finally {
					editingRef.current = false;
				}
			}, [persistRect, selectedPath, updateLocalRect]);

			const commitCanvas = react.useCallback(async (resolution) => {
				const current = payloadRef.current;
				if (!current || !current.dsl) return;
				const nextDsl = JSON.parse(JSON.stringify(current.dsl));
				nextDsl.canvas = nextDsl.canvas && typeof nextDsl.canvas === "object" ? nextDsl.canvas : {};
				nextDsl.canvas.referenceResolution = resolution;
				const next = Object.assign({}, current, { dsl: nextDsl });
				payloadRef.current = next;
				setPayload(next);
				editingRef.current = true;
				setStatus("保存中…");
				try {
					await sendPatch({ kind: "canvas", expectedVersion: current.version, referenceResolution: resolution });
					setStatus("已保存");
				} catch (reason) {
					if (String(reason && reason.message) !== "version-conflict") {
						setError("保存失败：" + String(reason && reason.message ? reason.message : reason));
						setStatus("保存失败");
					}
				} finally {
					editingRef.current = false;
				}
			}, [sendPatch]);

			const beginGesture = react.useCallback((event, path, mode, startFrame, parentWidth, parentHeight, startRect, scale, deferredSelection) => {
				if (event.button !== 0 || editingRef.current || building) return;
				event.preventDefault();
				const gestureWindow = pointerOwnerWindow(event);
				selectTargetPath(path);
				editingRef.current = true;
				const startX = event.clientX;
				const startY = event.clientY;
				const startPayload = payloadRef.current;
				const startNode = startPayload && startPayload.dsl && startPayload.dsl.root ? nodeAtPath(startPayload.dsl.root, path) : null;
				const undoBase = startPayload && Number.isSafeInteger(startPayload.version) && startNode && typeof startNode.nodeId === "string" ? {
					canvasId: startPayload.canvasId,
					nodeId: startNode.nodeId,
					beforeRect: JSON.parse(JSON.stringify(startRect || {})),
					beforeVersion: startPayload.version,
					mode
				} : null;
				let latestRect = startRect;
				let changed = false;
				function move(pointerEvent) {
					const screenDx = pointerEvent.clientX - startX;
					const screenDy = pointerEvent.clientY - startY;
					if (Math.hypot(screenDx, screenDy) < 3) return;
					const dx = screenDx / scale;
					const dy = screenDy / scale;
					changed = true;
					const frame = mode === "resize"
						? Object.assign({}, startFrame, { width: Math.max(1, startFrame.width + dx), height: Math.max(1, startFrame.height + dy) })
						: Object.assign({}, startFrame, { x: startFrame.x + dx, y: startFrame.y + dy });
					latestRect = rectFromFrame(startRect, frame, parentWidth, parentHeight);
					updateLocalRect(path, latestRect);
				}
				async function finish(pointerEvent) {
					gestureWindow.removeEventListener("pointermove", move);
					gestureWindow.removeEventListener("pointerup", finish);
					gestureWindow.removeEventListener("pointercancel", finish);
					if (pointerEvent) move(pointerEvent);
					try {
						if (changed) {
							const result = await persistRect(path, latestRect);
							if (result && undoBase && Number.isSafeInteger(result.version)) {
								undoHistoryRef.current.record({
									canvasId: undoBase.canvasId,
									nodeId: undoBase.nodeId,
									beforeRect: undoBase.beforeRect,
									afterVersion: result.version,
									mode: undoBase.mode
								}, undoBase.beforeVersion);
							}
						} else if (Array.isArray(deferredSelection) && pointerEvent && pointerEvent.type !== "pointercancel") selectTargetPath(deferredSelection);
					} finally {
						editingRef.current = false;
					}
				}
				gestureWindow.addEventListener("pointermove", move);
				gestureWindow.addEventListener("pointerup", finish, { once: true });
				gestureWindow.addEventListener("pointercancel", finish, { once: true });
			}, [building, persistRect, selectTargetPath, updateLocalRect]);

			const undoLastGesture = react.useCallback(async () => {
				const current = payloadRef.current;
				if (!current || !current.canvasId || !Number.isSafeInteger(current.version)) {
					setStatus("暂无可撤销的拖动");
					return false;
				}
				if (editingRef.current || building) {
					setStatus(editingRef.current ? "请等待当前编辑保存完成" : "请等待当前 Prefab 构建完成");
					return false;
				}
				const available = undoHistoryRef.current.peek(current.canvasId, current.version);
				if (!available.ok) {
					if (available.reason === "version-conflict") {
						undoHistoryRef.current.clear(current.canvasId);
						setError("Canvas 已有其他修改，拖动撤销历史已清空。");
						setStatus("无法安全撤销");
					} else {
						setStatus("暂无可撤销的拖动");
					}
					return false;
				}
				const action = available.action;
				editingRef.current = true;
				setStatus("正在撤销拖动…");
				setError("");
				try {
					const result = await sendPatch({
						kind: "node-rect",
						canvasId: action.canvasId,
						nodeId: action.nodeId,
						expectedVersion: current.version,
						rect: action.beforeRect
					});
					undoHistoryRef.current.commit(action.canvasId, result.version);
					const restoredPath = result.dsl && result.dsl.root ? findNodePathById(result.dsl.root, action.nodeId) : null;
					if (restoredPath !== null) selectTargetPath(restoredPath);
					setStatus(action.mode === "resize" ? "已撤销缩放" : "已撤销拖动");
					return true;
				} catch (reason) {
					undoHistoryRef.current.clear(action.canvasId);
					if (String(reason && reason.message) !== "version-conflict") {
						setError("撤销失败：" + String(reason && reason.message ? reason.message : reason));
					}
					setStatus("撤销失败");
					return false;
				} finally {
					editingRef.current = false;
				}
			}, [building, selectTargetPath, sendPatch]);

			const openPopout = react.useCallback(() => {
				if (popoutRef.current && !popoutRef.current.window.closed) {
					popoutRef.current.window.focus();
					return true;
				}
				const width = Math.max(760, Math.round(panelSize.width));
				const height = Math.max(560, Math.round(panelSize.height));
				const name = "dsh-ugui-" + String(sessionId).replace(/[^a-z0-9_-]/gi, "-");
				const child = window.open("", name, "popup=yes,resizable=yes,scrollbars=no,width=" + width + ",height=" + height);
				if (!child) {
					const message = "浏览器阻止了独立窗口，请允许此页面弹出窗口后重试。";
					setError(message);
					setStatus("弹出窗口被阻止");
					if (typeof window.alert === "function") window.alert(message);
					return false;
				}
				try {
					const mount = preparePopoutDocument(child, (payloadRef.current && payloadRef.current.uiName ? payloadRef.current.uiName + " · " : "") + "UGUI制作模式", document, rootRef.current);
					const next = { window: child, mount };
					popoutRef.current = next;
					setPopout(next);
					setOpen(true);
					setError("");
					setStatus("已弹出独立窗口");
					child.focus();
					return true;
				} catch (reason) {
					try { child.close(); } catch {}
					const message = "打开独立窗口失败：" + String(reason && reason.message ? reason.message : reason);
					setError(message);
					setStatus("弹出窗口失败");
					if (typeof window.alert === "function") window.alert(message);
					return false;
				}
			}, [panelSize.height, panelSize.width, sessionId]);

			const closeDesigner = react.useCallback(() => {
				const current = popoutRef.current;
				popoutRef.current = null;
				setPopout(null);
				setOpen(false);
				if (current && current.window && !current.window.closed) {
					window.setTimeout(() => {
						try { current.window.close(); } catch {}
					}, 0);
				}
			}, []);

			react.useEffect(() => {
				if (!popout || !popout.window) return;
				const child = popout.window;
				const closeStandalone = () => {
					if (!popoutRef.current || popoutRef.current.window !== child) return;
					popoutRef.current = null;
					setPopout(null);
					setOpen(false);
					setStatus("独立窗口已关闭");
				};
				const syncTheme = () => {
					if (!child.closed) synchronizePopoutTheme(child.document, document, rootRef.current);
				};
				child.addEventListener("beforeunload", closeStandalone);
				const timer = window.setInterval(() => {
					if (child.closed) closeStandalone();
				}, 500);
				let observer = null;
				if (typeof MutationObserver !== "undefined") {
					observer = new MutationObserver(syncTheme);
					observer.observe(document.documentElement, { attributes: true });
					if (document.body) observer.observe(document.body, { attributes: true });
					const sourceStyle = document.querySelector("style[data-plugin=" + JSON.stringify(tagId) + "]");
					if (sourceStyle) observer.observe(sourceStyle, { childList: true, subtree: true, characterData: true });
				}
				syncTheme();
				return () => {
					try { child.removeEventListener("beforeunload", closeStandalone); } catch {}
					window.clearInterval(timer);
					if (observer) observer.disconnect();
				};
			}, [popout]);

			react.useEffect(() => () => {
				const current = popoutRef.current;
				popoutRef.current = null;
				if (current && current.window && !current.window.closed) {
					try { current.window.close(); } catch {}
				}
			}, []);

			react.useEffect(() => {
				if (payloadRef.current === null) loadDsl(false, false);
			}, [loadDsl]);

			react.useEffect(() => {
				if (!open) return;
				loadDsl(payloadRef.current === null, false);
				const timer = window.setInterval(() => loadDsl(false, false), 1500);
				return () => window.clearInterval(timer);
			}, [open, loadDsl]);

			react.useEffect(() => {
				if (!open || tab !== "overview") return;
				loadWorkspaceOverview(true);
				const timer = window.setInterval(() => loadWorkspaceOverview(false), 2000);
				return () => window.clearInterval(timer);
			}, [open, tab, loadWorkspaceOverview]);

			react.useEffect(() => {
				if (!open || tab !== "designer") return;
				const eventDocument = popout && popout.window && !popout.window.closed ? popout.window.document : document;
				const keydown = (event) => {
					if (!shouldHandleGestureUndo(event)) return;
					event.preventDefault();
					undoLastGesture();
				};
				eventDocument.addEventListener("keydown", keydown);
				return () => eventDocument.removeEventListener("keydown", keydown);
			}, [open, popout, tab, undoLastGesture]);

			react.useEffect(() => {
				if (!open) return;
				const eventDocument = popout && popout.window && !popout.window.closed ? popout.window.document : document;
				const escape = (event) => {
					if (event.key === "Escape") closeDesigner();
				};
				eventDocument.addEventListener("keydown", escape);
				return () => eventDocument.removeEventListener("keydown", escape);
			}, [closeDesigner, open, popout]);

			react.useEffect(() => {
				const dsl = payload && payload.dsl;
				if (dsl && !nodeAtPath(dsl.root, selectedPath)) selectTargetPath([]);
			}, [payload, selectedPath, selectTargetPath]);

			const dsl = payload && payload.dsl;
			const name = dsl && (dsl.name || (dsl.root && dsl.root.name));
			const canvases = workspace && Array.isArray(workspace.canvases) ? workspace.canvases : [];
			const selectedNode = dsl && dsl.root ? nodeAtPath(dsl.root, selectedPath) : null;
			const targetPath = selectedNode ? selectedPath : [];
			const targetNode = selectedNode || (dsl && dsl.root) || null;
			const targetNodeId = targetNode && typeof targetNode.nodeId === "string" ? targetNode.nodeId : "";
			const targetBreadcrumb = dsl && dsl.root ? nodeBreadcrumb(dsl.root, targetPath) : [];
			const targetNodeLabel = targetPath.length > 0 ? targetBreadcrumb.slice(1).join(" / ") : "整个 Canvas";
			const targetTitle = (payload && payload.canvasId ? "canvasId=" + payload.canvasId + " · " : "") + (targetBreadcrumb.length > 0 ? targetBreadcrumb.join(" / ") : "等待 Canvas") + (targetNodeId ? " · nodeId=" + targetNodeId : "") + (targetPath.length > 0 ? " · path=[" + targetPath.join(",") + "]" : "");
			const targetPathToken = targetPath.join(".");
			const targetBreadcrumbToken = targetBreadcrumb.join("\u0000");
			const targetCanvasId = payload && payload.canvasId ? payload.canvasId : "";
			const targetCanvasVersion = payload && Number.isFinite(payload.version) ? payload.version : -1;
			const meta = loading ? "读取中…" : name ? name + (payload.canvasId ? " · " + payload.canvasId : "") + " · 版本 " + String(payload.version || 0) : "等待 DSL";

			react.useEffect(() => {
				if (!targetCanvasId || targetCanvasVersion < 0 || !targetNodeId || targetBreadcrumb.length === 0) return;
				synchronizeEditorTarget(sessionId, {
					canvasId: targetCanvasId,
					uiName: name || targetCanvasId,
					canvasVersion: targetCanvasVersion,
					nodeId: targetNodeId,
					nodePath: targetPath,
					breadcrumb: targetBreadcrumb
				});
			}, [sessionId, targetCanvasId, targetCanvasVersion, targetNodeId, targetPathToken, targetBreadcrumbToken]);

			const popoutActive = Boolean(popout && popout.window && !popout.window.closed && popout.mount);
			const panel = !open || !popoutActive ? null : h("section", {
				className: "uguiSide_panel",
				style: popoutPanelStyle(),
				"data-ugui-panel": true,
				"data-popout": true,
				"aria-label": "UGUI制作模式独立窗口"
			},
				h("header", { className: "uguiSide_header", title: "拖动系统窗口标题栏移动独立窗口" },
					h("span", { className: "uguiSide_titleWrap" },
						h("span", { className: "uguiSide_title" }, "UGUI制作模式"),
						h("span", { className: "uguiSide_meta" }, meta)),
					h("button", { type: "button", className: "uguiSide_buildBtn", disabled: building || !dsl, title: "主动调用 Unity CLI；此时才导入暂存图片并生成 Prefab", onClick: buildPrefab }, building ? "生成中…" : "生成 Prefab"),
					h(LogicSyncBadge, { canvasId: activeCanvasId || "", refreshToken: syncRefreshToken }),
					status ? h("span", { className: "uguiSide_status", "data-error": status === "保存失败" || status === "生成失败" || status === "切换失败" || undefined, title: status }, status) : null,
					h("button", { type: "button", className: "uguiSide_iconBtn", title: tab === "overview" ? "刷新多 Canvas 总览" : "刷新当前 Canvas", "aria-label": tab === "overview" ? "刷新多 Canvas 总览" : "刷新当前 uGUI Canvas", onClick: () => tab === "overview" ? loadWorkspaceOverview(true) : loadDsl(true, true) }, refreshIcon()),
					h("button", { type: "button", className: "uguiSide_iconBtn", title: "关闭独立窗口", "aria-label": "关闭 UGUI制作模式独立窗口", onClick: closeDesigner }, closeIcon())),
				h("nav", { className: "uguiSide_canvasTabs", role: "tablist", "aria-label": "Canvas 文档" },
					canvases.length > 0 ? canvases.map((entry) => h("button", {
						key: entry.id,
						type: "button",
						role: "tab",
						className: "uguiSide_canvasTab",
						"data-active": activeCanvasId === entry.id || undefined,
						"aria-selected": activeCanvasId === entry.id,
						disabled: building || loading,
						title: entry.uiName + " · " + entry.id + " · " + entry.dslPath,
						onClick: () => switchCanvas(entry.id)
					},
						h("span", { className: "uguiSide_canvasTabName" }, entry.uiName),
						h("span", { className: "uguiSide_canvasTabVersion" }, "v" + String(entry.version || 0))))
						: h("span", { className: "uguiSide_canvasEmpty" }, "Workspace 中暂无 Canvas")),
				h("div", { className: "uguiSide_targetBar", title: targetTitle, "aria-label": "当前编辑目标" },
					h("span", { className: "uguiSide_targetLabel" }, "当前目标"),
					h("span", { className: "uguiSide_targetCanvas", title: payload && payload.canvasId ? name + " · " + payload.canvasId : "等待 Canvas" }, name || activeCanvasId || "未选择 Canvas"),
					h("span", { className: "uguiSide_targetSeparator", "aria-hidden": true }, "›"),
					h("span", { className: "uguiSide_targetNode", "data-root": targetPath.length === 0 || undefined }, targetNodeLabel),
					targetPath.length > 0 ? h("button", { type: "button", className: "uguiSide_targetReset", title: "把当前目标重置为整个 Canvas", onClick: () => selectTargetPath([]) }, "整个 Canvas") : null),
				h("div", { className: "uguiSide_tabs", role: "tablist", "aria-label": "Canvas 视图" },
					h("button", { type: "button", role: "tab", className: "uguiSide_tab", "data-active": tab === "overview" || undefined, "aria-selected": tab === "overview", onClick: () => setTab("overview") }, "总览"),
					h("button", { type: "button", role: "tab", className: "uguiSide_tab", "data-active": tab === "designer" || undefined, "aria-selected": tab === "designer", onClick: () => setTab("designer") }, "设计器"),
					h("button", { type: "button", role: "tab", className: "uguiSide_tab", "data-active": tab === "previewer" || undefined, "aria-selected": tab === "previewer", onClick: () => setTab("previewer") }, "预览器"),
					h("button", { type: "button", role: "tab", className: "uguiSide_tab", "data-active": tab === "dsl" || undefined, "aria-selected": tab === "dsl", onClick: () => setTab("dsl") }, "DSL")),
				h("div", { className: "uguiSide_body" },
					tab === "overview" ? h(WorkspaceOverview, {
						workspace,
						activeCanvasId,
						targetLabel: targetNodeLabel,
						targetTitle,
						loading: overviewLoading,
						disabled: building || loading,
						onOpen: openCanvasFromOverview
					}) : tab === "designer" ? h("div", { className: "uguiSide_designer" },
						h("aside", { className: "uguiSide_column" },
							h("div", { className: "uguiSide_columnTitle" }, "组件树"),
							dsl && dsl.root ? h(Tree, { key: activeCanvasId || "default", root: dsl.root, selectedPath, canvasId: activeCanvasId, onSelect: selectTargetPath }) : h("p", { className: "uguiSide_note", style: { padding: 8 } }, "暂无 DSL")),
						h("main", { className: "uguiSide_column uguiSide_previewColumn" },
							h(Preview, { dsl, selectedPath, onSelect: selectTargetPath, onBeginGesture: beginGesture, onImageDrop: dropImage })),
						h("aside", { className: "uguiSide_column uguiSide_inspectorColumn" },
							h("div", { className: "uguiSide_columnTitle" }, "属性"),
							h(Inspector, { dsl, selectedPath, onFrameCommit: commitFrame, onCanvasCommit: commitCanvas, onAnchorCommit: commitAnchor, onImageDrop: dropImage })))
						: tab === "previewer" ? h(Previewer, { key: activeCanvasId || "default", canvasId: activeCanvasId || "", dsl, selectedPath })
						: h("pre", { className: "uguiSide_json" }, dsl ? JSON.stringify(dsl, null, 2) : "暂无 DSL")),
				error ? h("div", { className: "uguiSide_error", role: "alert", style: { position: "absolute", left: 210, bottom: 26, background: "var(--dsw-specific-menu,#fff)", padding: "5px 8px", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,.2)" } }, error) : null,
				h("footer", { className: "uguiSide_footer" },
					h("span", null, "图片拖入后只暂存；点击生成 Prefab 才导入 Unity。"),
					h("span", null, tab === "designer" ? "Ctrl/⌘+Z 撤销拖动/缩放；拖系统标题栏移动窗口" : tab === "previewer" ? "预览器交互仅模拟运行，不写入 DSL；「重置状态」可还原初始值" : "拖系统标题栏移动独立窗口")));

			const renderedPanel = panel && popoutActive ? reactDom.createPortal(panel, popout.mount) : null;
			return h("div", { ref: rootRef, className: wide ? "uguiSide_root" : "uguiSide_root uguiSide_rail" },
				renderedPanel,
				h("button", {
					type: "button",
					className: "uguiSide_trigger",
					"data-active": popoutActive || undefined,
					"aria-label": "UGUI制作模式",
					"aria-expanded": popoutActive,
					title: popoutActive ? "聚焦 UGUI制作模式独立窗口" : "打开 UGUI制作模式独立窗口",
					onClick: () => {
						if (popoutActive) popout.window.focus();
						else openPopout();
					}
				}, designerIcon(wide ? 17 : 19), wide ? h("span", { className: "uguiSide_label" }, "UGUI制作模式") : null, wide && payload && !error ? h("span", { className: "uguiSide_live", title: "DSL 已连接" }) : null));
		}

		function apply(ctx) {
			const slots = ctx.get("slots");
			if (slots === undefined) return;
			slots.inject("sidebar.footer.action", () => slots.register(
				{ name: "sidebar.footer.action", id: "ugui-designer", order: 80, label: "UGUI制作模式" },
				(owner) => h(PresetScopedDesignerAction, { wide: owner.wide, useSessions: owner.useSessions })
			));
			slots.inject("conversation.input.dock", () => slots.register(
				{ name: "conversation.input.dock", id: "ugui-target-snapshot", order: -20, label: "UGUI 目标" },
				(owner) => h(PresetScopedComposerTarget, { sessionId: owner.sessionId, useSessions: owner.useSessions })
			));
		}

		exports.apply = apply;
		return module.exports;
	}
});
