#!/usr/bin/env python3
"""Cross-platform port of the unity-cli bash wrapper (Windows/macOS/Linux).

Usage:
  unity-cli.py [--unity PATH] [--target editor] [--project PATH] status
  unity-cli.py [--unity PATH] [--target editor] [--project PATH] wait-ready [--timeout N] [--interval N]
  unity-cli.py [--unity PATH] [--target editor] [--project PATH] errors [--limit N] [--snapshot FILE | --diff FILE]
  unity-cli.py [--unity PATH] [--target editor] [--project PATH] find TERM [TERM ...]
  unity-cli.py [--unity PATH] [--target editor] [--project PATH] schema COMMAND [--require NAME[:TYPE[:required|optional]]] ...
  unity-cli.py [--unity PATH] [--target editor] [--project PATH] run COMMAND [--PARAM VALUE ...]
  unity-cli.py [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) status
  unity-cli.py [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) find TERM [TERM ...]
  unity-cli.py [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) schema COMMAND [--require NAME[:TYPE[:required|optional]]] ...
  unity-cli.py [--unity PATH] --target runtime (--runtime NAME | --runtime-path PATH) run COMMAND [--PARAM VALUE ...]
"""

from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

USAGE = __doc__.strip()


def fail(message: str) -> "SystemExit":
    print(f"unity-cli: {message}", file=sys.stderr)
    return SystemExit(2)


def is_unity_project(candidate: Path) -> bool:
    return (candidate / "Assets").is_dir() and (candidate / "ProjectSettings").is_dir() and (candidate / "Packages" / "manifest.json").is_file()


def find_project_upward(start: Path) -> Path | None:
    candidate = start.resolve()
    while True:
        if is_unity_project(candidate):
            return candidate
        if candidate.parent == candidate:
            return None
        candidate = candidate.parent


def json_dumps_compact(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def parse_args(argv: list[str]):
    project = None
    unity = None
    target = "editor"
    runtime = None
    runtime_path = None
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg in ("--project", "--project-path"):
            if i + 1 >= len(argv):
                raise fail(f"{arg} requires a path")
            project = argv[i + 1]
            i += 2
        elif arg == "--unity":
            if i + 1 >= len(argv):
                raise fail("--unity requires a path")
            unity = argv[i + 1]
            i += 2
        elif arg == "--target":
            if i + 1 >= len(argv):
                raise fail("--target requires editor or runtime")
            target = argv[i + 1]
            i += 2
        elif arg == "--runtime":
            if i + 1 >= len(argv):
                raise fail("--runtime requires a Player process name")
            runtime = argv[i + 1]
            i += 2
        elif arg == "--runtime-path":
            if i + 1 >= len(argv):
                raise fail("--runtime-path requires a Player directory or app bundle")
            runtime_path = argv[i + 1]
            i += 2
        elif arg in ("-h", "--help"):
            print(USAGE)
            sys.exit(0)
        else:
            break
    return project, unity, target, runtime, runtime_path, argv[i:]


def main() -> int:
    project_argument, unity_argument, target_argument, runtime_argument, runtime_path_argument, rest = parse_args(sys.argv[1:])
    if not rest:
        print(USAGE, file=sys.stderr)
        return 2
    if target_argument not in ("editor", "runtime"):
        raise fail("--target requires editor or runtime")

    skill_script_dir = Path(__file__).resolve().parent
    runtime_descriptor_json = None

    if target_argument == "editor":
        if runtime_argument or runtime_path_argument:
            raise fail("--runtime and --runtime-path require --target runtime")
        if project_argument:
            project_path = Path(project_argument).resolve()
            if not project_path.is_dir():
                raise fail(f"project path does not exist: {project_argument}")
            if not is_unity_project(project_path):
                raise fail(f"not a Unity project root: {project_path}")
        else:
            project_path = find_project_upward(Path.cwd()) or find_project_upward(skill_script_dir)
            if project_path is None:
                raise fail("could not find a Unity project; pass --project PATH")
        target_selector = ["--project-path", str(project_path)]
    else:
        if project_argument:
            raise fail("--project cannot be combined with --target runtime")
        if runtime_argument and runtime_path_argument:
            raise fail("--runtime and --runtime-path are mutually exclusive")
        if not runtime_argument and not runtime_path_argument:
            raise fail("--target runtime requires --runtime NAME or --runtime-path PATH")
        if runtime_argument:
            if runtime_argument.startswith("--"):
                raise fail("--runtime requires a Player process name")
            target_selector = ["--runtime", runtime_argument]
        else:
            runtime_path = Path(runtime_path_argument).resolve()
            if not runtime_path.is_dir():
                raise fail(f"runtime path is not a directory: {runtime_path_argument}")
            descriptor = runtime_path / ".unity-pipeline-runtime-port"
            if not descriptor.is_file() or descriptor.is_symlink():
                raise fail(f"runtime descriptor is not a regular file: {descriptor}")
            try:
                candidate = json.loads(descriptor.read_text(encoding="utf-8"))
                if not (isinstance(candidate, dict) and candidate.get("buildGuid") and candidate.get("unityVersion") and candidate.get("platform")):
                    raise ValueError("missing fields")
                runtime_descriptor_json = candidate
            except (ValueError, OSError):
                raise fail(f"runtime descriptor is invalid: {descriptor}")
            target_selector = ["--runtime-path", str(runtime_path)]

    if unity_argument:
        unity_executable = Path(unity_argument).resolve()
        if not unity_executable.is_file():
            raise fail(f"Unity CLI is not an executable file: {unity_argument}")
        unity_executable = str(unity_executable)
    else:
        unity_executable = shutil.which("unity")
        if not unity_executable:
            raise fail("official Unity CLI was not found on PATH; pass --unity PATH")

    def run_unity(*arguments: str) -> str:
        completed = subprocess.run(
            [unity_executable, "--format", "json", "--no-banner", "--non-interactive", "command", *target_selector, *arguments],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        if completed.returncode != 0:
            print(completed.stdout, file=sys.stderr, end="")
            raise SystemExit(completed.returncode)
        return completed.stdout

    def require_success(response: str) -> dict:
        try:
            value = json.loads(response)
        except ValueError:
            print(response, file=sys.stderr)
            raise SystemExit(1)
        if not isinstance(value, dict):
            print(response, file=sys.stderr)
            raise SystemExit(1)
        if value.get("success") is True and value.get("data", {}).get("success", True) is True:
            return value
        print(json_dumps_compact({k: value.get(k) for k in ("success", "command", "errors", "warnings", "data")}), file=sys.stderr)
        raise SystemExit(1)

    def print_result(response: str) -> str:
        value = require_success(response)
        result = value.get("data", {}).get("result")
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except ValueError:
                pass
        return json_dumps_compact(result)

    def command_metadata(catalog_response: str, command_name: str) -> dict:
        catalog = require_success(catalog_response)
        for command in catalog.get("data", {}).get("commands", []):
            if command.get("name") == command_name:
                return command
        raise SystemExit(3)

    def validate_status_project(status_json: str):
        status = json.loads(status_json)
        reported = status.get("projectPath") or ""
        if not reported:
            raise fail("Editor status did not report projectPath")
        if os.path.normcase(os.path.normpath(reported)) != os.path.normcase(os.path.normpath(str(project_path))):
            raise fail(f"Editor status project mismatch: expected {project_path}, got {reported}")

    def validate_status_runtime(status_json: str):
        status = json.loads(status_json)
        playing = status.get("isPlaying", status.get("IsPlaying", False))
        if playing is not True:
            raise fail("Runtime status did not identify a playing Player")
        build_guid = status.get("buildGuid") or status.get("BuildGuid") or ""
        platform = status.get("platform") or status.get("Platform") or ""
        unity_version = status.get("unityVersion") or status.get("UnityVersion") or ""
        if not build_guid:
            raise fail("Runtime status did not report buildGuid")
        if not platform:
            raise fail("Runtime status did not report platform")
        if not unity_version:
            raise fail("Runtime status did not report unityVersion")
        if runtime_descriptor_json is not None:
            if build_guid != runtime_descriptor_json["buildGuid"]:
                raise fail(f"Runtime status build GUID mismatch: expected {runtime_descriptor_json['buildGuid']}, got {build_guid}")
            if platform != runtime_descriptor_json["platform"]:
                raise fail(f"Runtime status platform mismatch: expected {runtime_descriptor_json['platform']}, got {platform}")
            if unity_version != runtime_descriptor_json["unityVersion"]:
                raise fail(f"Runtime status Unity version mismatch: expected {runtime_descriptor_json['unityVersion']}, got {unity_version}")

    def read_runtime_status() -> str:
        status = print_result(run_unity("runtime_status"))
        validate_status_runtime(status)
        return status

    def validate_runtime_target():
        read_runtime_status()

    def validate_run_arguments(metadata: dict, arguments: list[str]):
        valid_parameters = ", ".join(p.get("name", "") for p in metadata.get("parameters", []))
        seen: set[str] = set()
        i = 0
        while i < len(arguments):
            flag = arguments[i]
            i += 1
            if not flag.startswith("--"):
                raise fail(f"command arguments must use --PARAM VALUE pairs: {flag}")
            if "=" in flag:
                raise fail(f"use separate arguments instead of --PARAM=VALUE: {flag}")
            parameter_name = flag[2:]
            if not parameter_name:
                raise fail("empty parameter name")
            if not any(p.get("name") == parameter_name for p in metadata.get("parameters", [])):
                raise fail(f"unknown parameter --{parameter_name}; valid parameters: {valid_parameters or '<none>'}")
            if parameter_name in seen:
                raise fail(f"duplicate parameter: --{parameter_name}")
            if i >= len(arguments):
                raise fail(f"missing value for --{parameter_name}")
            value = arguments[i]
            i += 1
            if value == "":
                raise fail(f"empty values are not preserved by this Unity CLI; omit optional --{parameter_name}")
            if value.startswith("--"):
                raise fail(f"values beginning with -- are not preserved by this Unity CLI: --{parameter_name}")
            seen.add(parameter_name)
        for parameter in metadata.get("parameters", []):
            if parameter.get("required") is True and parameter.get("name") not in seen:
                raise fail(f"missing required parameter: --{parameter.get('name')}")

    def validate_schema_requirement(metadata: dict, requirement: str):
        parts = requirement.split(":")
        if len(parts) > 3 or not parts[0]:
            raise fail(f"invalid schema requirement: {requirement}")
        parameter_name = parts[0]
        expected_type = parts[1] if len(parts) >= 2 else ""
        expected_required = parts[2] if len(parts) >= 3 else ""
        if expected_required and expected_required not in ("required", "optional"):
            raise fail(f"schema requirement must end in required or optional: {requirement}")
        parameter = next((p for p in metadata.get("parameters", []) if p.get("name") == parameter_name), None)
        if parameter is None:
            print(f"unity-cli: schema requirement failed: missing parameter {parameter_name}", file=sys.stderr)
            raise SystemExit(4)
        if expected_type:
            actual_type = parameter.get("type") or ""
            if actual_type != expected_type:
                print(f"unity-cli: schema requirement failed: {parameter_name} type is {actual_type or '<missing>'}, expected {expected_type}", file=sys.stderr)
                raise SystemExit(4)
        if expected_required:
            actual_required = "required" if parameter.get("required") is True else "optional"
            if actual_required != expected_required:
                print(f"unity-cli: schema requirement failed: {parameter_name} is {actual_required}, expected {expected_required}", file=sys.stderr)
                raise SystemExit(4)

    def write_error_snapshot(target: str, errors_json: str):
        target_path = Path(target)
        if not target_path.parent.is_dir():
            raise fail(f"snapshot parent directory does not exist: {target_path.parent}")
        if target_path.is_symlink() or target_path.is_dir():
            raise fail(f"snapshot path must be a regular file path: {target}")
        snapshot = json_dumps_compact({
            "schemaVersion": 1,
            "projectPath": str(project_path),
            "capturedAtUtc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "errors": json.loads(errors_json),
        })
        fd, temporary = tempfile.mkstemp(prefix=f".{target_path.name}.tmp.", dir=str(target_path.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(snapshot + "\n")
            os.replace(temporary, target_path)
        except OSError:
            try:
                os.unlink(temporary)
            except OSError:
                pass
            raise fail(f"could not write error snapshot: {target}")
        print(snapshot)

    def diff_error_snapshot(target: str, current_json: str):
        target_path = Path(target)
        if not target_path.is_file() or target_path.is_symlink():
            raise fail(f"error snapshot is not a regular file: {target}")
        try:
            baseline = json.loads(target_path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            raise fail(f"error snapshot is invalid or belongs to another project: {target}")
        if not (
            isinstance(baseline, dict)
            and baseline.get("schemaVersion") == 1
            and os.path.normcase(os.path.normpath(str(baseline.get("projectPath", "")))) == os.path.normcase(os.path.normpath(str(project_path)))
            and isinstance(baseline.get("errors"), dict)
        ):
            raise fail(f"error snapshot is invalid or belongs to another project: {target}")
        current = json.loads(current_json)
        seen = {json_dumps_compact(log) for log in baseline["errors"].get("logs", [])}
        new_logs = [log for log in current.get("logs", []) if json_dumps_compact(log) not in seen]
        before_total = baseline["errors"].get("total", len(baseline["errors"].get("logs", [])))
        after_total = current.get("total", len(current.get("logs", [])))
        count_delta = max(0, after_total - before_total)
        new_count = max(len(new_logs), count_delta)
        print(json_dumps_compact({
            "ready": new_count == 0,
            "beforeTotal": before_total,
            "afterTotal": after_total,
            "newCount": new_count,
            "newLogs": new_logs,
        }))

    action, arguments = rest[0], rest[1:]

    if action == "status":
        if arguments:
            raise fail("status takes no arguments")
        if target_argument == "editor":
            status_result = print_result(run_unity("editor_status"))
            validate_status_project(status_result)
            print(status_result)
        else:
            print(read_runtime_status())
        return 0

    if action == "wait-ready":
        if target_argument != "editor":
            raise fail("wait-ready is only available for the editor target")
        wait_timeout = 60
        wait_interval = 1
        i = 0
        while i < len(arguments):
            if arguments[i] == "--timeout" and i + 1 < len(arguments):
                wait_timeout = arguments[i + 1]
                i += 2
            elif arguments[i] == "--interval" and i + 1 < len(arguments):
                wait_interval = arguments[i + 1]
                i += 2
            else:
                raise fail(f"unknown wait-ready argument: {arguments[i]}")
        if not (isinstance(wait_timeout, str) and wait_timeout.isdigit() and int(wait_timeout) > 0):
            raise fail("--timeout requires a positive integer")
        if not (isinstance(wait_interval, str) and wait_interval.isdigit() and int(wait_interval) > 0):
            raise fail("--interval requires a positive integer")
        deadline = time.monotonic() + int(wait_timeout)
        last = "Editor status was not queried"
        while time.monotonic() < deadline:
            try:
                wait_status = print_result(run_unity("editor_status"))
                validate_status_project(wait_status)
                last = wait_status
                status = json.loads(wait_status)
                if status.get("status") == "ready" and status.get("compiling", False) is False and status.get("domainReloadInProgress", False) is False:
                    print(wait_status)
                    return 0
            except SystemExit as outcome:
                last = f"(exit {outcome.code})"
            time.sleep(int(wait_interval))
        print(f"unity-cli: Editor did not become ready within {wait_timeout} seconds: {last}", file=sys.stderr)
        return 4

    if action == "errors":
        if target_argument != "editor":
            raise fail("errors is only available for the editor target")
        error_limit = "100"
        error_snapshot = None
        error_diff = None
        i = 0
        while i < len(arguments):
            if arguments[i] == "--limit" and i + 1 < len(arguments):
                error_limit = arguments[i + 1]
                i += 2
            elif arguments[i] == "--snapshot" and i + 1 < len(arguments):
                error_snapshot = arguments[i + 1]
                i += 2
            elif arguments[i] == "--diff" and i + 1 < len(arguments):
                error_diff = arguments[i + 1]
                i += 2
            else:
                raise fail(f"unknown errors argument: {arguments[i]}")
        if not (error_limit.isdigit() and int(error_limit) > 0):
            raise fail("--limit requires a positive integer")
        if error_snapshot and error_diff:
            raise fail("--snapshot and --diff are mutually exclusive")
        errors_result = print_result(run_unity("get_console_logs", "--severity", "error", "--limit", error_limit))
        if error_snapshot:
            write_error_snapshot(error_snapshot, errors_result)
        elif error_diff:
            diff_error_snapshot(error_diff, errors_result)
        else:
            print(errors_result)
        return 0

    if action in ("find", "schema", "run"):
        if target_argument != "editor":
            validate_runtime_target()
        if action == "find":
            if not arguments:
                raise fail("find requires at least one search term")
            terms = [term for term in " ".join(arguments).lower().split(" ") if term]
            catalog = require_success(run_unity())
            matches = [
                {"name": command.get("name"), "description": command.get("description")}
                for command in catalog.get("data", {}).get("commands", [])
                if all(term in ((command.get("name", "") + " " + (command.get("description") or "")).lower()) for term in terms)
            ]
            if not matches:
                print(f"unity-cli: no commands matched: {' '.join(arguments)}", file=sys.stderr)
                return 3
            for match in matches:
                print(json_dumps_compact(match))
            return 0
        if action == "schema":
            if not arguments:
                raise fail("schema requires a command name")
            schema_command = arguments[0]
            requirements: list[str] = []
            i = 1
            while i < len(arguments):
                if arguments[i] == "--require" and i + 1 < len(arguments):
                    requirements.append(arguments[i + 1])
                    i += 2
                else:
                    raise fail(f"unknown schema argument: {arguments[i]}")
            catalog_response = run_unity()
            try:
                metadata = command_metadata(catalog_response, schema_command)
            except SystemExit:
                print(f"unity-cli: command not found: {schema_command}", file=sys.stderr)
                return 3
            for requirement in requirements:
                validate_schema_requirement(metadata, requirement)
            schema_raw = metadata.get("schema")
            if isinstance(schema_raw, str):
                try:
                    schema_raw = json.loads(schema_raw)
                except ValueError:
                    pass
            print(json_dumps_compact({
                "name": metadata.get("name"),
                "description": metadata.get("description"),
                "mainThreadRequired": metadata.get("mainThreadRequired"),
                "runtimeOnly": metadata.get("runtimeOnly"),
                "parameters": metadata.get("parameters"),
                "schema": schema_raw,
            }))
            return 0
        # run
        if not arguments:
            raise fail("run requires a command name")
        pipeline_command = arguments[0]
        run_arguments = arguments[1:]
        catalog_response = run_unity()
        try:
            metadata = command_metadata(catalog_response, pipeline_command)
        except SystemExit:
            print(f"unity-cli: command not found: {pipeline_command}", file=sys.stderr)
            return 3
        validate_run_arguments(metadata, run_arguments)
        print(print_result(run_unity(pipeline_command, *run_arguments)))
        return 0

    if action in ("-h", "--help", "help"):
        print(USAGE)
        return 0

    raise fail(f"unknown action: {action}")


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except BrokenPipeError:
        sys.exit(0)
