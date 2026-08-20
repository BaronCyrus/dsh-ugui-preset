# Edit, Compile, and Test

Use this reference for Editor script compilation and Unity Test Framework execution. Keep Player instance selection and runtime hot reload in a separate target-specific workflow.

## Gate the Live Contract

Discover and inspect the live schemas for `recompile`, `recompile_status`, `list_tests`, `run_tests`, and, for asynchronous runs, `test_status`. Inspect `cancel_tests` only when a run may need to be aborted. Use only parameters exposed by the connected Editor. Complete this gate when the compile pair and the commands required by the selected test mode are present with compatible schemas.

## Recompile

1. Save the intended C# edits, then invoke `recompile` through the wrapper.
2. Treat a disconnect during the trigger or domain reload as an unknown outcome. Reconnect and poll `recompile_status` for the same compilation instead of triggering another recompile.
3. Accept compilation only when the status is `up_to_date`, or when it is `completed` with `failed: false` and no reported errors. Preserve reported compiler errors and stop before testing when compilation fails.
4. Run `wait-ready` before issuing commands that depend on the compiled types.

Rely on normal server and watchdog progress first. If an unfocused Editor observably stops progressing and the live schema exposes `set_autotick`, invoke it with `enable: true` and its default interval, then resume polling. After a reload, repeat this recovery only if progress stalls again.

Complete recompilation when its durable status proves success and the intended Editor is ready after the domain reload.

## Select Tests

Choose one explicit mode, `editor` or `playmode`, and use `list_tests` for that mode before execution. Select the narrowest `testName`, `assembly`, or `category` filter that covers the intended regression surface. Confirm that the selection contains at least one leaf test unless an empty selection is itself the expected assertion.

Run EditMode and PlayMode separately when both are required. Use synchronous execution only when the selected mode can return across one request. For PlayMode, use `async_tests: true` and poll `test_status`; entering Play Mode can reload the domain and drop a synchronous request.

## Verify Tests

For a synchronous run, inspect the complete structured response. For an asynchronous run, poll `test_status` until its documented terminal state. Treat the run as successful only when:

- execution reached a successful terminal state;
- the result accounts for every selected test;
- the summary reports zero failed tests; and
- per-test results contain no failed outcome.

If a compatible Pipeline returns incomplete failure details, rerun the smallest failing filter and inspect the Console delta. Use `cancel_tests` only to terminate an in-progress run; cancellation is not a successful verification result.

After the selected tests pass, return to the main tight loop for independent state readback, final Editor readiness, and Console comparison.
