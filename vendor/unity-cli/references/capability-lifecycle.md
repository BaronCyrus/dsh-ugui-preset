# Capability Lifecycle

Use this reference only after catalog discovery and nearby schemas fail to expose a suitable operation.

## Exhaust Supported Surfaces

Retry `find` with user-facing, Unity API, Pipeline, and repository vocabulary. Inspect nearby schemas, and check whether the generic `menu` command reaches an existing Editor entry point. Continue with an existing supported surface whenever it provides the required mutation and readback contract.

## Classify the Gap

Choose one lifecycle before writing code:

### Diagnostic probe

Use `eval` for one compact, one-off, read-only question. Follow the target project's C# and runtime constraints and return a serializable result. Persistent asset, scene, package, or project-setting changes belong to a task-scoped job or durable command.

### Task-scoped job

Use the generic runner described in [Durable Unity jobs](durable-jobs.md) when the operation is task-scoped, synchronous, idempotent, and does not need persistent Worker types. Keep Worker source in the owning workflow's skill or repository and keep business transactions outside the runner. Treat its validated completion signal—not queue acceptance—as the transport boundary.

Use a durable command instead when behavior must remain catalog-discoverable, execute asynchronously beyond one call, register callbacks, or persist a Worker type in Unity assets.

### Durable command

Add a registered `[CliCommand]` for repeatable behavior that must remain discoverable outside the current workflow. Its only ordinary project write location is `Assets/Editor/UnityCli/Commands/<CommandName>.cs`; use one stable command name and file name. Do not choose another `Assets` directory or a project-owned package in a later conversation.

Treat registry, Git-installed, built-in, and `Library/PackageCache` package contents as immutable dependencies. Moving an accepted command upstream or into a shared package is a separate, explicitly authorized refactor rather than an alternative installation choice. Embedding or pinning an installed package changes dependency ownership and requires explicit user authorization.

## Define the Contract

Make the selected job or command self-describing:

- expose structured arguments and required/default values;
- state preconditions, side effects, Editor-mode needs, compilation, and domain-reload behavior;
- return stable object identities and outcomes that an independent read command can verify;
- provide `dry_run` plus explicit confirmation for destructive or overwriting work;
- validate caller paths against project-owned roots and register Undo where Unity supports it;
- expose queued, running, succeeded, failed, and cancelled states for asynchronous work;
- make retry behavior and idempotency explicit when execution can resume after reload or disconnection.

Follow the authorization already granted for the user's task. Request direction before changing product behavior, expanding scope, embedding a dependency, targeting ambiguous destructive data, or introducing separately authorized risk.

## Preserve Capability Memory

Use code and machine-readable contracts as memory:

- a diagnostic probe retains no capability;
- a task-scoped job is reproducible from its owning workflow's source and protocol, while its job directory is execution evidence rather than the only source copy;
- a durable command is retained in source control with tests and rediscovered through the dynamic catalog.

Conversation history and hand-written command inventories are not capability authorities. Remove task artifacts only through the owning workflow's cleanup policy; retain or remove durable code through normal source review rather than automatic post-task cleanup.

## Verify the Lifecycle

For a new durable command, add direct tests and a client or transport-level test when the repository provides one. Recompile or reload, then prove registration and contract shape with `find` and `schema`.

Return to the main tight loop for execution. Require terminal success, independently read back the changed state, restore Editor readiness, and compare Console errors with the pre-change baseline. Complete only when a fresh session can find the durable command or reproduce the task-scoped job from its owning workflow without relying on the conversation that created it.
