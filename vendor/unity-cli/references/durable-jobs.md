# Durable Unity Jobs

Use this reference only when the dynamic catalog has no suitable command and the missing operation is a task-scoped Editor job. Prefer an existing command for durable, reusable product behavior.

## Ownership Boundary

The Unity CLI skill owns only the generic execution protocol:

- one project-owned bootstrap at `Assets/Editor/UnityCli/UnityCliJobBootstrap.cs`;
- immutable job inputs under `Library/UnityCli/Jobs/<job-id>/`;
- source/config integrity checks, Roslyn compilation, dispatch, and completion validation;
- recovery of the exact same job after a timeout, disconnect, or domain reload.

The calling workflow owns Worker source, authorization, domain validation, asset transactions, rollback, readback, and cleanup policy. Never treat this runner as a substitute for a business transaction.

## Worker Contract

Provide one or more complete C# source files and one exact entry point:

```csharp
public static void Run(string configPath)
```

The method must finish synchronously, be safe to retry, and atomically publish UTF-8 JSON to `resultPath` from the supplied config. The result must contain:

```json
{
  "success": true,
  "action": "the-prepared-action"
}
```

Add domain fields as needed. Do not depend on the in-memory assembly after `Run` returns, register callbacks from it, or serialize its types into assets. Put recurring CLI commands in `Assets/Editor/UnityCli/Commands/<CommandName>.cs`. Persistent runtime types are outside this runner and require a separately authorized project-architecture decision.

Execution is at-least-once: if the Worker writes `result.json` but the client disconnects before receiving completion, recovery validates and completes the same job. Make retries idempotent and let the caller's transaction distinguish commit from rollback.

## Prepare and Execute

1. Capture a Console baseline with `{skillRoot}/scripts/unity-cli ... errors --snapshot`.
2. Install or verify the project-owned bootstrap:

   ```text
   {skillRoot}/scripts/unity-job install --project <root> [--unity <path>] --verify-live
   ```

3. Prepare immutable inputs. Repeat `--source` for multiple files. Use `--input FIELD=PATH` for each domain file the Worker must read; the runner copies it into the job and sets `FIELD` in config to that frozen path:

   ```text
   {skillRoot}/scripts/unity-job prepare --project <root> \
     --source <Worker.cs> [--source <More.cs>] \
     [--config <config.json>] \
     [--input <configField>=<inputFile>] \
     --entry-type <Namespace.Worker> --entry-method Run \
     --action <action>
   ```

4. Submit a validation-only pass when appropriate:

   ```text
   {skillRoot}/scripts/unity-job submit --project <root> --job <job-id> --dry-run
   ```

5. Execute only when the task authorizes the mutation:

   ```text
   {skillRoot}/scripts/unity-job submit --project <root> --job <job-id> --confirm
   ```

6. If the client times out or disconnects, recover the same job. Never prepare a replacement for an unknown outcome:

   ```text
   {skillRoot}/scripts/unity-job recover --project <root> --job <job-id>
   ```

7. Independently read back domain state, wait for Editor readiness, and compare Console errors with the baseline.

The runner submits `unity_cli_submit_job` with protocol `unity-cli-job-v1`. Treat `completion.json`, not queue acceptance or `result.json` alone, as the transport boundary. Completion binds the manifest, config, Worker source bundle, named input bundle, result hash, and result length.

## Failure and Cleanup

A settled result with `success: false` is an executed job failure, not a transport failure. Inspect `compiler_diagnostics.json`, `result.json`, and the caller's transaction evidence before deciding whether to retry.

Exit code `4` with `outcomeKnown: false` means the client lost the transport/completion boundary after submission may have started. Preserve domain outputs and recover the exact job. Ordinary validation/schema errors use exit code `2` and mean no modifying Worker was submitted by that invocation.

Keep job directories while they are needed for recovery or audit. Remove them only through the owning workflow's explicit cleanup policy and only after terminal completion. Updating the bootstrap changes project-owned Editor source and may compile/domain-reload the Editor; the install command verifies the live command schema when requested.
