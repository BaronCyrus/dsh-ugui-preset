---
name: unity-cli
description: Control a running Unity Editor or development Player through the official Unity CLI and Pipeline. Use for Editor or Player inspection and mutation, Console diagnosis, runtime hot reload, or schema-gated Unity operations required by another skill.
---

# Unity CLI

Resolve bundled paths relative to the directory containing this loaded `SKILL.md`, never relative to the workspace or current shell directory. Before the first command, replace `{skillRoot}` below with that skill directory's absolute path and verify `{skillRoot}/scripts/unity-cli` exists. Do not probe or invoke a workspace-relative `scripts/unity-cli` first.

Use the bundled `{skillRoot}/scripts/unity-cli` wrapper as a tight loop over the selected target's dynamic Pipeline catalog. Keep that catalog as the single source of truth: bind one target, then discover current commands and one schema at a time. Resolve referenced Markdown files and `scripts/unity-job` from the same `{skillRoot}`.

> **Windows**: the bash wrapper and `jq` are POSIX-only. Use the Python port instead — `python {skillRoot}/scripts/unity-cli.py ...`（参数完全一致）；`unity-job` 内部会自动切换。

## Editor Tight Loop

1. Bind the intended Editor.
   - Resolve the absolute Unity project root.
   - Run `{skillRoot}/scripts/unity-cli --project <root> status`.
   - For modifying work, write a baseline with `{skillRoot}/scripts/unity-cli --project <root> errors --snapshot <baseline.json> --limit 100`.
   - Treat an already-running Editor as required. Leave launching, reopening, or restarting Unity to an explicit user request.
   - When compilation or domain reload is active, run `{skillRoot}/scripts/unity-cli --project <root> wait-ready --timeout <seconds>`.
   - Complete when the wrapper verifies `projectPath` and returns `status: ready`, `compiling: false`, and `domainReloadInProgress: false`.

2. Discover the narrow command.
   - If the exact name is unknown, run `{skillRoot}/scripts/unity-cli --project <root> find <term> [term ...]`. Retry with Pipeline vocabulary when no match is returned.
   - Run `{skillRoot}/scripts/unity-cli --project <root> schema <command>` before the first use of an unfamiliar or modifying command.
   - When another workflow requires a fixed contract, append one `--require NAME[:TYPE[:required|optional]]` assertion per required parameter.
   - Complete when one exact command is selected and every required schema property has a value or an intentional default.

3. Clear the gate.
   - Apply repository instructions and the command's current description before execution.
   - Immediately before any command that can compile or domain-reload, rerun `status` and require `status: ready`, `compiling: false`, and `domainReloadInProgress: false`.
   - For commands exposing `dry_run` and `confirm`, validate with `dry_run` first and pass `confirm` only when the user's request authorizes that exact mutation.
   - Complete when every required gate passes and the command scope matches the user's authorization. On a blocked gate, stop and report its blocking reasons.

4. Execute and settle.
   - Before modifying C# source or running Unity tests, read [Edit, compile, and test](references/edit-compile-test.md).
   - Run `{skillRoot}/scripts/unity-cli --project <root> run <command> [--parameter value ...]`.
   - Pass strings, numbers, and booleans as ordinary values. Pass arrays and JSON objects as one shell-quoted JSON value after their parameter flag.
   - Execute one narrow mutation at a time so its result can be attributed and verified.
   - When the command description names a status command, poll that command until it reaches its documented terminal state.
   - Complete when the command and every asynchronous follow-up report terminal success. Preserve and report structured errors on failure.

5. Read back the outcome.
   - Query the changed object, asset, scene, or setting with the narrowest read command.
   - After modifying work, rerun `wait-ready` and `errors --diff <baseline.json> --limit 100`.
   - Complete when the requested state is visible, the Editor is ready, and no new Console errors were introduced. Report any failed criterion instead of declaring success.

## Runtime Target

Before inspecting or mutating a development Player, or applying hot reload in Editor Play Mode, read [Runtime targeting and hot reload](references/runtime-hot-reload.md). Use its target-specific binding and verification criteria; the Editor readiness and Console helpers above do not model Player state.

## Wrapper Interface

```text
# Editor target (default)
{skillRoot}/scripts/unity-cli [--unity PATH] [--target editor] [--project PATH] status
{skillRoot}/scripts/unity-cli [--unity PATH] [--target editor] [--project PATH] wait-ready [--timeout N] [--interval N]
{skillRoot}/scripts/unity-cli [--unity PATH] [--target editor] [--project PATH] find TERM [TERM ...]
{skillRoot}/scripts/unity-cli [--unity PATH] [--target editor] [--project PATH] schema COMMAND [--require NAME[:TYPE[:required|optional]]] ...
{skillRoot}/scripts/unity-cli [--unity PATH] [--target editor] [--project PATH] run COMMAND [--PARAM VALUE ...]
{skillRoot}/scripts/unity-cli [--unity PATH] [--target editor] [--project PATH] errors [--limit N] [--snapshot FILE | --diff FILE]

# Runtime Player target
{skillRoot}/scripts/unity-cli [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) status
{skillRoot}/scripts/unity-cli [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) find TERM [TERM ...]
{skillRoot}/scripts/unity-cli [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) schema COMMAND [--require NAME[:TYPE[:required|optional]]] ...
{skillRoot}/scripts/unity-cli [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) run COMMAND [--PARAM VALUE ...]
```

The wrapper filters discovery before output reaches the model, emits only the command result on success, and preserves the structured failure envelope. It routes Editor calls through `--project-path`; Runtime calls require exactly one official Player selector. Runtime `status` verifies Player fields, and `--runtime-path` additionally binds `buildGuid`, platform, and Unity version to the protected runtime descriptor. `wait-ready` and `errors` remain Editor-only.

## Task-Scoped Jobs

When a missing Editor operation is suitable for a temporary, synchronous C# Worker, read [Durable Unity jobs](references/durable-jobs.md) and use `{skillRoot}/scripts/unity-job`. Keep domain transactions, rollback, and output verification in the calling workflow.

## Missing Capability

When discovery finds no suitable command, read [Capability lifecycle](references/capability-lifecycle.md) before using `eval`, installing Editor code, or authoring a registered command. Put every project-owned durable command under the fixed root `Assets/Editor/UnityCli/Commands/`; never select another project path ad hoc. Complete when the gap is classified as diagnostic, task-scoped, or durable; its implementation has an authoritative owner outside immutable package caches; and a fresh session can rediscover or reproduce it without conversation history.
