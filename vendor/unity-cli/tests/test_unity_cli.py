from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


SKILL_ROOT = Path(__file__).resolve().parents[1]
WRAPPER = SKILL_ROOT / "scripts" / "unity-cli"


FAKE_UNITY = r'''#!/usr/bin/env python3
import json
import os
from pathlib import Path
import sys

fixture = Path(os.environ["FAKE_UNITY_FIXTURE"])
arguments = sys.argv[1:]
command_index = arguments.index("command")
command_arguments = arguments[command_index + 1:]
if len(command_arguments) < 2:
    raise SystemExit("missing target selector")
selector = command_arguments[0]
selector_value = command_arguments[1]
if selector not in {"--project-path", "--runtime", "--runtime-path"}:
    raise SystemExit("invalid target selector")
project = selector_value if selector == "--project-path" else None
operation = command_arguments[2:]
(fixture / "last-invocation.json").write_text(json.dumps({
    "selector": selector,
    "selectorValue": selector_value,
    "operation": operation,
}), encoding="utf-8")

def emit_result(result):
    print(json.dumps({"success": True, "data": {"success": True, "result": result}}))

if not operation:
    catalog = json.loads((fixture / "catalog.json").read_text(encoding="utf-8"))
    print(json.dumps({"success": True, "data": {"success": True, "commands": catalog}}))
elif operation == ["editor_status"]:
    statuses = json.loads((fixture / "statuses.json").read_text(encoding="utf-8"))
    counter_path = fixture / "status-counter.txt"
    counter = int(counter_path.read_text(encoding="utf-8")) if counter_path.exists() else 0
    status = dict(statuses[min(counter, len(statuses) - 1)])
    status.setdefault("projectPath", project)
    counter_path.write_text(str(counter + 1), encoding="utf-8")
    emit_result(status)
elif operation == ["runtime_status"]:
    emit_result(json.loads((fixture / "runtime-status.json").read_text(encoding="utf-8")))
elif operation and operation[0] == "get_console_logs":
    emit_result(json.loads((fixture / "errors.json").read_text(encoding="utf-8")))
else:
    emit_result({"operation": operation})
'''


class UnityCliWrapperTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.project = self.root / "UnityProject"
        (self.project / "Assets").mkdir(parents=True)
        (self.project / "ProjectSettings").mkdir()
        (self.project / "Packages").mkdir()
        (self.project / "Packages" / "manifest.json").write_text("{}\n", encoding="utf-8")
        self.fixture = self.root / "fixture"
        self.fixture.mkdir()
        self.runtime_root = self.root / "MyGame.app"
        self.runtime_root.mkdir()
        self.fake_unity = self.root / "unity"
        self.fake_unity.write_text(FAKE_UNITY, encoding="utf-8")
        self.fake_unity.chmod(0o755)
        self.write_json("statuses.json", [{
            "status": "ready",
            "compiling": False,
            "domainReloadInProgress": False,
        }])
        self.write_json("errors.json", {"total": 0, "returned": 0, "logs": []})
        self.write_json("runtime-status.json", {
            "unityVersion": "6000.0.50f1",
            "platform": "OSXPlayer",
            "buildGuid": "build-guid-1",
            "isPlaying": True,
        })
        self.write_runtime_descriptor(build_guid="build-guid-1")
        self.write_json("catalog.json", [{
            "name": "example_job",
            "description": "Example task",
            "mainThreadRequired": True,
            "runtimeOnly": False,
            "parameters": [
                {"name": "job_id", "type": "String", "required": True},
                {"name": "confirm", "type": "Boolean", "required": False},
            ],
            "schema": "{}",
        }])

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, name: str, value: object) -> None:
        (self.fixture / name).write_text(
            json.dumps(value, ensure_ascii=False), encoding="utf-8"
        )

    def write_runtime_descriptor(self, *, build_guid: str) -> None:
        (self.runtime_root / ".unity-pipeline-runtime-port").write_text(
            json.dumps({
                "pid": 4321,
                "port": 7900,
                "unityVersion": "6000.0.50f1",
                "platform": "OSXPlayer",
                "buildGuid": build_guid,
                "workingDirectory": str(self.runtime_root),
                "evalToken": "test-token",
            }),
            encoding="utf-8",
        )

    def run_wrapper(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        environment = dict(os.environ)
        environment["FAKE_UNITY_FIXTURE"] = str(self.fixture)
        return subprocess.run(
            [
                str(WRAPPER),
                "--project",
                str(self.project),
                "--unity",
                str(self.fake_unity),
                *arguments,
            ],
            cwd=SKILL_ROOT,
            env=environment,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=10,
        )

    def run_runtime_wrapper(
        self, selector: str, selector_value: str, *arguments: str
    ) -> subprocess.CompletedProcess[str]:
        environment = dict(os.environ)
        environment["FAKE_UNITY_FIXTURE"] = str(self.fixture)
        return subprocess.run(
            [
                str(WRAPPER),
                "--unity",
                str(self.fake_unity),
                "--target",
                "runtime",
                selector,
                selector_value,
                *arguments,
            ],
            cwd=SKILL_ROOT,
            env=environment,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=10,
        )

    def run_raw_wrapper(self, *arguments: str) -> subprocess.CompletedProcess[str]:
        environment = dict(os.environ)
        environment["FAKE_UNITY_FIXTURE"] = str(self.fixture)
        return subprocess.run(
            [str(WRAPPER), "--unity", str(self.fake_unity), *arguments],
            cwd=SKILL_ROOT,
            env=environment,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=10,
        )

    def test_wait_ready_polls_until_compilation_settles(self) -> None:
        self.write_json("statuses.json", [
            {
                "status": "compiling",
                "compiling": True,
                "domainReloadInProgress": False,
            },
            {
                "status": "ready",
                "compiling": False,
                "domainReloadInProgress": False,
            },
        ])

        completed = self.run_wrapper("wait-ready", "--timeout", "3", "--interval", "1")

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(json.loads(completed.stdout)["status"], "ready")
        self.assertGreaterEqual(
            int((self.fixture / "status-counter.txt").read_text(encoding="utf-8")), 2
        )

    def test_status_rejects_another_project_identity(self) -> None:
        self.write_json("statuses.json", [{
            "status": "ready",
            "compiling": False,
            "domainReloadInProgress": False,
            "projectPath": str(self.root / "AnotherProject"),
        }])

        completed = self.run_wrapper("status")

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("Editor status project mismatch", completed.stderr)

    def test_schema_requirements_fail_closed(self) -> None:
        compatible = self.run_wrapper(
            "schema",
            "example_job",
            "--require",
            "job_id:String:required",
            "--require",
            "confirm:Boolean:optional",
        )
        self.assertEqual(compatible.returncode, 0, compatible.stderr)

        incompatible = self.run_wrapper(
            "schema", "example_job", "--require", "protocol:String:required"
        )
        self.assertNotEqual(incompatible.returncode, 0)
        self.assertIn("schema requirement failed", incompatible.stderr)

    def test_error_snapshot_and_diff_report_only_new_logs(self) -> None:
        first_log = {
            "type": "Error",
            "message": "existing",
            "stackTrace": "Existing()",
            "timestampUtc": "2026-07-22T10:00:00Z",
        }
        second_log = {
            "type": "Error",
            "message": "new",
            "stackTrace": "New()",
            "timestampUtc": "2026-07-22T10:01:00Z",
        }
        self.write_json("errors.json", {"total": 1, "returned": 1, "logs": [first_log]})
        baseline = self.root / "console-baseline.json"

        snapshot = self.run_wrapper("errors", "--snapshot", str(baseline), "--limit", "100")
        self.assertEqual(snapshot.returncode, 0, snapshot.stderr)
        self.assertTrue(baseline.is_file())
        self.assertEqual(json.loads(snapshot.stdout)["schemaVersion"], 1)

        self.write_json(
            "errors.json",
            {"total": 2, "returned": 2, "logs": [first_log, second_log]},
        )
        difference = self.run_wrapper("errors", "--diff", str(baseline), "--limit", "100")

        self.assertEqual(difference.returncode, 0, difference.stderr)
        payload = json.loads(difference.stdout)
        self.assertFalse(payload["ready"])
        self.assertEqual(payload["newCount"], 1)
        self.assertEqual(payload["newLogs"], [second_log])

    def test_runtime_path_status_validates_descriptor_identity(self) -> None:
        completed = self.run_runtime_wrapper(
            "--runtime-path", str(self.runtime_root), "status"
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(json.loads(completed.stdout)["buildGuid"], "build-guid-1")
        invocation = json.loads(
            (self.fixture / "last-invocation.json").read_text(encoding="utf-8")
        )
        self.assertEqual(invocation["selector"], "--runtime-path")
        self.assertEqual(invocation["selectorValue"], str(self.runtime_root.resolve()))
        self.assertEqual(invocation["operation"], ["runtime_status"])

    def test_runtime_path_status_rejects_another_build_identity(self) -> None:
        self.write_runtime_descriptor(build_guid="another-build")

        completed = self.run_runtime_wrapper(
            "--runtime-path", str(self.runtime_root), "status"
        )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("Runtime status build GUID mismatch", completed.stderr)

    def test_runtime_process_selector_is_forwarded(self) -> None:
        completed = self.run_runtime_wrapper(
            "--runtime", "MyGame", "schema", "example_job"
        )

        self.assertEqual(completed.returncode, 0, completed.stderr)
        invocation = json.loads(
            (self.fixture / "last-invocation.json").read_text(encoding="utf-8")
        )
        self.assertEqual(invocation["selector"], "--runtime")
        self.assertEqual(invocation["selectorValue"], "MyGame")

    def test_runtime_target_rejects_editor_only_action(self) -> None:
        completed = self.run_runtime_wrapper(
            "--runtime-path", str(self.runtime_root), "wait-ready"
        )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("wait-ready is only available for the editor target", completed.stderr)

    def test_runtime_target_requires_exactly_one_selector(self) -> None:
        missing = self.run_raw_wrapper("--target", "runtime", "status")
        self.assertNotEqual(missing.returncode, 0)
        self.assertIn("requires --runtime NAME or --runtime-path PATH", missing.stderr)

        repeated = self.run_raw_wrapper(
            "--target",
            "runtime",
            "--runtime",
            "MyGame",
            "--runtime-path",
            str(self.runtime_root),
            "status",
        )
        self.assertNotEqual(repeated.returncode, 0)
        self.assertIn("are mutually exclusive", repeated.stderr)

    def test_editor_target_rejects_runtime_selector(self) -> None:
        completed = self.run_raw_wrapper(
            "--project",
            str(self.project),
            "--runtime",
            "MyGame",
            "status",
        )

        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("require --target runtime", completed.stderr)


if __name__ == "__main__":
    unittest.main()
