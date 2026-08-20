# Runtime Targeting and Hot Reload

Use this reference for development Players and for hot reload against Editor Play Mode. Bind and verify one live target before inspecting its catalog.

## Bind the Target

For Editor Play Mode, use the ordinary Editor target and require `status.playMode: playing` for the intended project.

For a standalone development Player, require a running `RuntimePipelineManager` with its build server enabled. Prefer the descriptor location for modifying work:

```text
{skillRoot}/scripts/unity-cli --target runtime --runtime-path <player-directory-or-app-bundle> status
```

The wrapper verifies that `runtime_status` reports a playing Player and that its build GUID, platform, and Unity version match `.unity-pipeline-runtime-port`. Use `--runtime <process-name>` for read-only discovery when that process name identifies one intended Player; record the returned build GUID before relying on later results.

Complete binding when the target kind, project or build identity, Unity version, platform, and live play state match the intended instance.

## Gate Hot Reload

Confirm the target is Editor Play Mode or a Mono standalone development Player. Discover `reload_file` and `reload_file_override` in the selected target's catalog, then inspect only the chosen schema.

Prefer `reload_file_override` when the repository has no passing evidence for in-place transformation. Keep the replacement in a separate source file, expose a `public static` method tagged with `HotReloadOverrideMethod`, take the target instance first, and match the original return type and remaining parameters. Keep the target type in its original source file.

Use `reload_file` only when the target build was compiled with a supported `[HotReload]` method and repository or package tests prove the in-place weaving path. The method must satisfy the live package contract; current implementations commonly require a public `void` instance method.

Complete the gate when the selected file exists inside a target-allowed root, the live schema accepts every argument, and the requested behavioral change is narrow enough to verify independently.

## Apply and Verify

Invoke the selected command through the same bound target and require a structured successful result with the expected registered method identities. Preserve compiler diagnostics on failure.

When the Runtime catalog exposes `hotreload_status`, read it back and confirm the intended override is active. Editor catalogs may omit this Runtime-only status command; in that case verify the command result plus the observable Play Mode behavior. For a Player failure, use its `Player.log` or another target-specific log surface because the wrapper's Console helper is Editor-only.

Treat hot reload as an in-memory experiment: exiting the Player, leaving Play Mode, or reloading the domain can remove it. Complete only when the same target identity remains bound and the requested live behavior is observed. Move accepted permanent behavior into ordinary project source, then use the Editor compile-and-test branch to validate it.
