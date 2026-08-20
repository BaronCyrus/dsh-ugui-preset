from __future__ import annotations

import importlib.machinery
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
import subprocess


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "unity-job"
LOADER = importlib.machinery.SourceFileLoader("unity_job_under_test", str(SCRIPT_PATH))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
assert SPEC is not None
unity_job = importlib.util.module_from_spec(SPEC)
LOADER.exec_module(unity_job)


class UnityJobProtocolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.project = Path(self.temporary.name).resolve() / "UnityProject"
        (self.project / "Assets").mkdir(parents=True)
        (self.project / "ProjectSettings").mkdir()
        (self.project / "ProjectSettings" / "ProjectVersion.txt").write_text(
            "m_EditorVersion: 6000.3.15f1\n", encoding="utf-8"
        )
        (self.project / "Packages").mkdir()
        (self.project / "Packages" / "manifest.json").write_text(
            "{}\n", encoding="utf-8"
        )
        self.source_a = Path(self.temporary.name) / "WorkerA.cs"
        self.source_b = Path(self.temporary.name) / "WorkerB.cs"
        self.source_a.write_text(
            "public static class WorkerA { public const int Value = 1; }\n",
            encoding="utf-8",
        )
        self.source_b.write_text(
            "public static class WorkerB { public static void Run(string path) {} }\n",
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def prepare(self, job_id: str = "test_job") -> dict:
        return unity_job.prepare_job(
            self.project,
            source_paths=[self.source_a, self.source_b],
            entry_type="WorkerB",
            entry_method="Run",
            action="test",
            config_source=None,
            job_id=job_id,
        )

    def write_successful_completion(self, job_id: str) -> None:
        job = unity_job.validate_job(self.project, job_id)
        result = {"success": True, "action": "test", "data": {"value": 1}}
        unity_job.atomic_write_json(job["resultPath"], result)
        completion = {
            "schemaVersion": unity_job.COMPLETION_SCHEMA_VERSION,
            "protocol": unity_job.PROTOCOL,
            "status": "settled",
            "jobId": job_id,
            "action": "test",
            "manifestSha256": unity_job.sha256_file(job["manifestPath"]),
            "configSha256": unity_job.sha256_file(job["configPath"]),
            "sourceBundleSha256": job["sourceBundleSha256"],
            "inputBundleSha256": job["inputBundleSha256"],
            "resultSha256": unity_job.sha256_file(job["resultPath"]),
            "resultLength": job["resultPath"].stat().st_size,
        }
        unity_job.atomic_write_json(job["completionPath"], completion)

    def test_prepare_freezes_config_and_multiple_sources(self) -> None:
        prepared = self.prepare()

        job = unity_job.validate_job(self.project, prepared["jobDirectory"])
        config = json.loads(job["configPath"].read_text(encoding="utf-8"))

        self.assertEqual(job["manifest"]["protocol"], unity_job.PROTOCOL)
        self.assertEqual(len(job["manifest"]["sources"]), 2)
        self.assertEqual(config["jobId"], "test_job")
        self.assertEqual(config["resultPath"], str(job["resultPath"]))
        self.assertEqual(
            config["workerSourceBundleSha256"], job["sourceBundleSha256"]
        )

    def test_source_tampering_fails_validation(self) -> None:
        prepared = self.prepare()
        job = unity_job.validate_job(self.project, prepared["jobDirectory"])
        source = job["jobDirectory"] / job["manifest"]["sources"][0]["relativePath"]
        source.write_text("changed\n", encoding="utf-8")

        with self.assertRaisesRegex(ValueError, "hash/length changed"):
            unity_job.validate_job(self.project, prepared["jobDirectory"])

    def test_failed_prepare_leaves_no_partial_job(self) -> None:
        missing_source = Path(self.temporary.name) / "Missing.cs"

        with self.assertRaisesRegex(ValueError, "not a regular file"):
            unity_job.prepare_job(
                self.project,
                source_paths=[self.source_a, missing_source],
                entry_type="WorkerB",
                entry_method="Run",
                action="test",
                config_source=None,
                job_id="incomplete_job",
            )

        root = self.project / unity_job.JOBS_RELATIVE
        self.assertEqual(list(root.iterdir()), [])

    def test_named_input_is_frozen_bound_and_injected_into_config(self) -> None:
        input_path = Path(self.temporary.name) / "plan.json"
        input_path.write_text('{"value": 1}\n', encoding="utf-8")
        prepared = unity_job.prepare_job(
            self.project,
            source_paths=[self.source_b],
            entry_type="WorkerB",
            entry_method="Run",
            action="test",
            config_source=None,
            job_id="input_job",
            input_paths=[("flatTreePlanPath", input_path)],
        )

        job = unity_job.validate_job(self.project, prepared["jobDirectory"])
        config = json.loads(job["configPath"].read_text(encoding="utf-8"))
        frozen_input = Path(config["flatTreePlanPath"])

        self.assertEqual(frozen_input.parent, job["jobDirectory"] / "inputs")
        self.assertEqual(frozen_input.read_bytes(), input_path.read_bytes())
        frozen_input.write_text('{"value": 2}\n', encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "input hash/length changed"):
            unity_job.validate_job(self.project, "input_job")

    def test_completion_binds_result_and_immutable_inputs(self) -> None:
        self.prepare()
        self.write_successful_completion("test_job")

        settled = unity_job.validate_completion(self.project, "test_job")
        self.assertTrue(settled["result"]["success"])

        result_path = self.project / unity_job.JOBS_RELATIVE / "test_job" / "result.json"
        result_path.write_text(
            json.dumps({"success": True, "action": "test", "data": {"value": 2}}),
            encoding="utf-8",
        )
        with self.assertRaisesRegex(ValueError, "does not bind"):
            unity_job.validate_completion(self.project, "test_job")

    def test_submit_uses_fixed_protocol_and_validates_completion(self) -> None:
        self.prepare()
        submitted: list[str] = []

        def fake_run_json(command: list[str], timeout: int) -> dict:
            if "unity_cli_submit_job" in command:
                submitted.extend(command)
                self.write_successful_completion("test_job")
                return {"accepted": True, "jobId": "test_job"}
            return {"status": "ready"}

        with mock.patch.object(unity_job, "run_json", side_effect=fake_run_json), mock.patch.object(
            unity_job,
            "wait_for_runner_schema",
            return_value={"name": unity_job.SUBMIT_COMMAND},
        ):
            exit_code, settled = unity_job.submit_or_recover(
                self.project,
                raw_job="test_job",
                unity=Path("/fake/unity"),
                timeout=5,
                confirm=True,
                dry_run=False,
            )

        self.assertEqual(exit_code, 0)
        self.assertTrue(settled["result"]["success"])
        protocol_index = submitted.index("--job_protocol")
        self.assertEqual(submitted[protocol_index + 1], unity_job.PROTOCOL)

    def test_install_recompiles_when_unchanged_live_schema_is_missing(self) -> None:
        destination = self.project / unity_job.BOOTSTRAP_RELATIVE
        destination.parent.mkdir(parents=True)
        destination.write_bytes(unity_job.BOOTSTRAP_SOURCE.read_bytes())
        commands: list[list[str]] = []

        def fake_run_json(command: list[str], timeout: int) -> dict:
            commands.append(command)
            return {"status": "ready"}

        with mock.patch.object(unity_job, "run_json", side_effect=fake_run_json), mock.patch.object(
            unity_job,
            "wait_for_runner_schema",
            side_effect=[ValueError("missing"), {"name": unity_job.SUBMIT_COMMAND}],
        ):
            installed = unity_job.install_runner(
                self.project,
                unity=Path("/fake/unity"),
                timeout=10,
                verify_live=True,
            )

        self.assertFalse(installed["changed"])
        self.assertEqual(installed["liveVerification"]["status"], "verified")
        self.assertTrue(any("recompile" in command for command in commands))

    def test_install_dry_run_reports_without_writing(self) -> None:
        installed = unity_job.install_runner(
            self.project,
            unity=None,
            timeout=10,
            verify_live=False,
            dry_run=True,
        )

        self.assertTrue(installed["dryRun"])
        self.assertTrue(installed["wouldChange"])
        self.assertFalse(installed["changed"])
        self.assertFalse((self.project / unity_job.BOOTSTRAP_RELATIVE).exists())

    def test_transport_timeout_is_an_explicit_unknown_outcome(self) -> None:
        with mock.patch.object(
            unity_job.subprocess,
            "run",
            side_effect=subprocess.TimeoutExpired(["unity"], 1),
        ):
            with self.assertRaises(unity_job.UnityJobOutcomeUnknown):
                unity_job.run_json(["unity", "command"], timeout=1)


if __name__ == "__main__":
    unittest.main()
