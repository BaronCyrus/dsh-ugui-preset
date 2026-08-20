#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Unity.Pipeline.Commands;
using Unity.Pipeline.Compilation;
using UnityEditor;
using UnityEngine;

namespace Codex.UnityCli.Editor
{
    /// <summary>
    /// Project-owned entry point for integrity-pinned, synchronous Editor Workers stored under
    /// Library/UnityCli/Jobs. Business transactions remain the responsibility of the caller.
    /// </summary>
    [InitializeOnLoad]
    public static class UnityCliJobBootstrap
    {
        private const string SubmitCommandName = "unity_cli_submit_job";
        private const string Protocol = "unity-cli-job-v1";
        private const int ManifestSchemaVersion = 1;
        private const int CompletionSchemaVersion = 1;
        private const int MaximumManifestBytes = 64 * 1024;
        private const int MaximumConfigBytes = 16 * 1024 * 1024;
        private const int MaximumSourceBytes = 4 * 1024 * 1024;
        private const int MaximumSourceBundleBytes = 16 * 1024 * 1024;
        private const int MaximumInputBytes = 64 * 1024 * 1024;
        private const long MaximumInputBundleBytes = 256L * 1024L * 1024L;
        private const int MaximumResultBytes = 64 * 1024 * 1024;
        private const double PollIntervalSeconds = 0.1d;

        private static readonly UTF8Encoding StrictUtf8 = new UTF8Encoding(false, true);
        private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);
        private static readonly Regex JobIdPattern = new Regex(
            "^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$",
            RegexOptions.CultureInvariant);
        private static readonly Regex InputNamePattern = new Regex(
            "^[A-Za-z][A-Za-z0-9_]{0,63}$",
            RegexOptions.CultureInvariant);
        private static readonly HashSet<string> ReservedConfigFields = new HashSet<string>(
            new[]
            {
                "jobId", "projectRoot", "action", "resultPath", "bootstrapCompletionPath",
                "compilerDiagnosticsPath", "workerAssemblyPath", "runnerLogPath",
                "workerSourcePaths", "workerSourceBundleSha256", "inputBundleSha256"
            },
            StringComparer.Ordinal);
        private static double NextPollTime;

        static UnityCliJobBootstrap()
        {
            EditorApplication.update -= PollQueue;
            EditorApplication.update += PollQueue;
        }

        [CliCommand(
            SubmitCommandName,
            "Validate and queue one integrity-pinned Library/UnityCli/Jobs Worker. Returns immediately; wait for completion.json.",
            MainThreadRequired = true)]
        public static SubmitResult SubmitJob(
            [CliArg("job_id", "Direct job directory name under Library/UnityCli/Jobs.", Required = true)] string jobId,
            [CliArg("job_protocol", "Must exactly match unity-cli-job-v1.", Required = true)] string jobProtocol,
            [CliArg("confirm", "Must be true to execute the Worker.")] bool confirm = false,
            [CliArg("dry_run", "Validate immutable job files without compiling or executing.")] bool dryRun = false)
        {
            if (!string.Equals(jobProtocol, Protocol, StringComparison.Ordinal))
                throw new ArgumentException("Unsupported job_protocol. Reinstall the Unity CLI runner and retry.");

            JobContext job = LoadAndValidateJob(jobId);
            if (dryRun)
                return CreateSubmitResult("dry_run", job, false, false);
            if (!confirm)
                throw new ArgumentException("Dynamic Worker execution requires confirm=true or dry_run=true.");

            if (File.Exists(job.CompletionPath))
            {
                ValidateCompletion(job);
                return CreateSubmitResult("already_completed", job, false, true);
            }
            if (File.Exists(job.ResultPath))
            {
                CompleteFromResult(job);
                return CreateSubmitResult("already_completed", job, false, true);
            }

            bool alreadyQueued = File.Exists(job.MarkerPath);
            EnsureQueueMarker(job);
            NextPollTime = 0d;
            return CreateSubmitResult(alreadyQueued ? "already_queued" : "queued", job, true, true);
        }

        private static void PollQueue()
        {
            if (EditorApplication.timeSinceStartup < NextPollTime)
                return;
            NextPollTime = EditorApplication.timeSinceStartup + PollIntervalSeconds;

            string queueRoot = QueueRoot();
            if (!Directory.Exists(queueRoot))
                return;

            string marker = null;
            try
            {
                RejectReparsePoint(queueRoot, "queue root");
                marker = Directory.GetFiles(queueRoot, "*.ready", SearchOption.TopDirectoryOnly)
                    .OrderBy(path => path, StringComparer.Ordinal)
                    .FirstOrDefault();
                if (string.IsNullOrEmpty(marker))
                    return;

                JobContext job = LoadFromMarker(marker);
                if (File.Exists(job.CompletionPath))
                {
                    ValidateCompletion(job);
                    File.Delete(job.MarkerPath);
                    return;
                }
                if (File.Exists(job.ResultPath))
                {
                    CompleteFromResult(job);
                    return;
                }

                try
                {
                    CompileAndInvoke(job);
                }
                catch (Exception exception)
                {
                    Exception unwrapped = UnwrapInvocationException(exception);
                    Debug.LogError("Unity CLI durable job failed: " + unwrapped);
                    WriteFailureResult(job, unwrapped);
                }
                CompleteFromResult(job);
            }
            catch (Exception exception)
            {
                NextPollTime = EditorApplication.timeSinceStartup + 5d;
                string rejectedMarker;
                try
                {
                    rejectedMarker = QuarantineMarker(marker);
                }
                catch (Exception quarantineException)
                {
                    rejectedMarker = "<quarantine failed: " + quarantineException.Message + ">";
                }
                Debug.LogError(
                    "Unity CLI durable queue rejected a marker so later jobs can proceed: " +
                    marker + " -> " + rejectedMarker + "\n" + exception);
            }
        }

        private static string QuarantineMarker(string markerPath)
        {
            if (string.IsNullOrEmpty(markerPath) || !File.Exists(markerPath))
                return "<marker unavailable>";
            string rejectedRoot = Path.Combine(QueueRoot(), "Rejected");
            Directory.CreateDirectory(rejectedRoot);
            RejectReparsePoint(rejectedRoot, "rejected queue root");
            string rejectedPath = Path.Combine(
                rejectedRoot,
                Path.GetFileName(markerPath) + "." + Guid.NewGuid().ToString("N") + ".rejected");
            File.Move(markerPath, rejectedPath);
            return rejectedPath;
        }

        private static void CompileAndInvoke(JobContext job)
        {
            string combinedSource = BuildCombinedSource(job);
            CompilationRequest request = new CompilationRequest
            {
                SourceCode = combinedSource,
                AssemblyName = "UnityCliJob_" + SanitizeAssemblyName(job.JobId) + "_" +
                    job.SourceBundleSha256.Substring(0, 12),
                EmitDebugInformation = true,
                DocumentPath = job.ManifestPath
            };
            CompilationResult result = RoslynCompilationService.Compile(request);
            WriteReplaceJson(job.DiagnosticsPath, new DiagnosticsEnvelope
            {
                schemaVersion = 1,
                success = result != null && result.Success,
                sourceBundleSha256 = job.SourceBundleSha256,
                messages = result != null ? result.Diagnostics : null
            });
            if (result == null || !result.Success || result.Assembly == null || result.AssemblyBytes == null)
                throw new InvalidOperationException("Roslyn compilation failed; inspect compiler_diagnostics.json.");

            WriteReplaceBytes(job.AssemblyPath, result.AssemblyBytes);
            if (result.PdbBytes != null && result.PdbBytes.Length > 0)
                WriteReplaceBytes(job.PdbPath, result.PdbBytes);

            Type workerType = result.Assembly.GetType(job.Manifest.entryType, true, false);
            MethodInfo method = workerType.GetMethod(
                job.Manifest.entryMethod,
                BindingFlags.Public | BindingFlags.Static,
                null,
                new[] { typeof(string) },
                null);
            if (method == null || method.ReturnType != typeof(void))
            {
                throw new MissingMethodException(
                    job.Manifest.entryType,
                    "public static void " + job.Manifest.entryMethod + "(string configPath)");
            }
            method.Invoke(null, new object[] { job.ConfigPath });
            if (!File.Exists(job.ResultPath))
                throw new InvalidDataException("Worker returned without publishing the fixed result.json.");
        }

        private static string BuildCombinedSource(JobContext job)
        {
            StringBuilder builder = new StringBuilder();
            builder.AppendLine("#define UNITY_EDITOR");
            int unityMajor;
            string unityMajorText = (Application.unityVersion ?? string.Empty).Split('.')[0];
            if (int.TryParse(unityMajorText, out unityMajor) && unityMajor >= 6000)
                builder.AppendLine("#define UNITY_6000_0_OR_NEWER");
            if (Application.platform == RuntimePlatform.WindowsEditor)
                builder.AppendLine("#define UNITY_EDITOR_WIN");
            else if (Application.platform == RuntimePlatform.OSXEditor)
                builder.AppendLine("#define UNITY_EDITOR_OSX");
            else if (Application.platform == RuntimePlatform.LinuxEditor)
                builder.AppendLine("#define UNITY_EDITOR_LINUX");
            foreach (SourceContext source in job.Sources)
            {
                string text = StrictUtf8.GetString(File.ReadAllBytes(source.Path));
                string linePath = source.Path.Replace('\\', '/').Replace("\"", "\\\"");
                builder.Append("#line 1 \"").Append(linePath).Append("\"\n");
                builder.Append(text);
                if (!text.EndsWith("\n", StringComparison.Ordinal))
                    builder.Append('\n');
                builder.Append("#line default\n#line hidden\n");
            }
            return builder.ToString();
        }

        private static JobContext LoadFromMarker(string markerPath)
        {
            RejectReparsePoint(markerPath, "queue marker");
            string fileName = Path.GetFileName(markerPath);
            if (!fileName.EndsWith(".ready", StringComparison.Ordinal))
                throw new InvalidDataException("Queue marker suffix is invalid.");
            string jobId = fileName.Substring(0, fileName.Length - ".ready".Length);
            JobContext job = LoadAndValidateJob(jobId);
            string markerConfig = StrictUtf8.GetString(ReadBoundedFile(markerPath, 4096, "queue marker")).Trim();
            if (!PathEquals(markerConfig, job.ManifestPath))
                throw new InvalidDataException("Queue marker does not identify the immutable job manifest.");
            return job;
        }

        private static JobContext LoadAndValidateJob(string jobId)
        {
            if (string.IsNullOrWhiteSpace(jobId) || !JobIdPattern.IsMatch(jobId))
                throw new ArgumentException("job_id must match [A-Za-z0-9][A-Za-z0-9._-]{0,127}.");

            string jobsRoot = JobsRoot();
            if (!Directory.Exists(jobsRoot))
                throw new DirectoryNotFoundException("Durable jobs root is missing: " + jobsRoot);
            RejectReparsePoint(jobsRoot, "jobs root");
            string jobDirectory = Path.GetFullPath(Path.Combine(jobsRoot, jobId));
            EnsureDirectChild(jobsRoot, jobDirectory, "job directory");
            if (!Directory.Exists(jobDirectory))
                throw new DirectoryNotFoundException("Durable job directory is missing: " + jobDirectory);
            RejectReparsePoint(jobDirectory, "job directory");

            string manifestPath = Path.Combine(jobDirectory, "job.json");
            RejectReparsePoint(manifestPath, "job manifest");
            JobManifest manifest = JsonConvert.DeserializeObject<JobManifest>(
                StrictUtf8.GetString(ReadBoundedFile(manifestPath, MaximumManifestBytes, "job manifest")));
            if (manifest == null || manifest.schemaVersion != ManifestSchemaVersion ||
                !string.Equals(manifest.protocol, Protocol, StringComparison.Ordinal) ||
                !string.Equals(manifest.jobId, jobId, StringComparison.Ordinal) ||
                !string.Equals(manifest.configRelativePath, "config.json", StringComparison.Ordinal) ||
                string.IsNullOrWhiteSpace(manifest.entryType) || string.IsNullOrWhiteSpace(manifest.entryMethod))
            {
                throw new InvalidDataException("Job manifest identity, protocol, or entry point is invalid.");
            }

            string configPath = Path.Combine(jobDirectory, "config.json");
            byte[] configBytes = ReadBoundedFile(configPath, MaximumConfigBytes, "job config");
            if (!HashEquals(Sha256(configBytes), manifest.configSha256))
                throw new InvalidDataException("Job config hash changed.");
            JObject config;
            try
            {
                config = JObject.Parse(StrictUtf8.GetString(configBytes));
            }
            catch (Exception exception)
            {
                throw new InvalidDataException("Job config is not valid UTF-8 JSON.", exception);
            }

            if (manifest.sources == null || manifest.sources.Length == 0)
                throw new InvalidDataException("Job manifest has no Worker sources.");
            List<SourceContext> sources = new List<SourceContext>();
            long totalSourceBytes = 0;
            foreach (SourceEntry entry in manifest.sources)
            {
                if (entry == null || string.IsNullOrWhiteSpace(entry.relativePath) ||
                    Path.IsPathRooted(entry.relativePath))
                    throw new InvalidDataException("Job source entry is invalid.");
                string sourcePath = Path.GetFullPath(Path.Combine(jobDirectory, entry.relativePath));
                string sourceRoot = Path.Combine(jobDirectory, "sources");
                RejectReparsePoint(sourceRoot, "Worker source root");
                EnsureDirectChild(sourceRoot, sourcePath, "Worker source");
                RejectReparsePoint(sourcePath, "Worker source");
                byte[] sourceBytes = ReadBoundedFile(sourcePath, MaximumSourceBytes, "Worker source");
                if (entry.length != sourceBytes.LongLength || !HashEquals(Sha256(sourceBytes), entry.sha256))
                    throw new InvalidDataException("Worker source hash/length changed: " + sourcePath);
                totalSourceBytes += sourceBytes.LongLength;
                if (totalSourceBytes > MaximumSourceBundleBytes)
                    throw new InvalidDataException("Worker source bundle exceeds its size limit.");
                sources.Add(new SourceContext(entry.relativePath, sourcePath, sourceBytes));
            }
            string bundleHash = ComputeBundleHash(sources);
            if (!HashEquals(bundleHash, manifest.sourceBundleSha256))
                throw new InvalidDataException("Worker source bundle hash changed.");

            if (manifest.inputs == null)
                throw new InvalidDataException("Job manifest inputs must be an array.");
            List<SourceContext> inputs = new List<SourceContext>();
            HashSet<string> inputNames = new HashSet<string>(StringComparer.Ordinal);
            long totalInputBytes = 0;
            foreach (InputEntry entry in manifest.inputs)
            {
                if (entry == null || string.IsNullOrWhiteSpace(entry.name) ||
                    !InputNamePattern.IsMatch(entry.name) || ReservedConfigFields.Contains(entry.name) ||
                    !inputNames.Add(entry.name) || string.IsNullOrWhiteSpace(entry.relativePath) ||
                    Path.IsPathRooted(entry.relativePath))
                {
                    throw new InvalidDataException("Job input entry is invalid, repeated, or reserved.");
                }
                string inputPath = Path.GetFullPath(Path.Combine(jobDirectory, entry.relativePath));
                string inputRoot = Path.Combine(jobDirectory, "inputs");
                RejectReparsePoint(inputRoot, "job input root");
                EnsureDirectChild(inputRoot, inputPath, "job input");
                RejectReparsePoint(inputPath, "job input");
                byte[] inputBytes = ReadBoundedFile(inputPath, MaximumInputBytes, "job input");
                if (entry.length != inputBytes.LongLength || !HashEquals(Sha256(inputBytes), entry.sha256))
                    throw new InvalidDataException("Job input hash/length changed: " + inputPath);
                string configInputPath = (string)config[entry.name];
                if (string.IsNullOrWhiteSpace(configInputPath) || !PathEquals(configInputPath, inputPath))
                    throw new InvalidDataException("Job config input path changed: " + entry.name);
                totalInputBytes += inputBytes.LongLength;
                if (totalInputBytes > MaximumInputBundleBytes)
                    throw new InvalidDataException("Job input bundle exceeds its size limit.");
                inputs.Add(new SourceContext(entry.relativePath, inputPath, inputBytes));
            }
            string inputBundleHash = ComputeBundleHash(inputs);
            if (!HashEquals(inputBundleHash, manifest.inputBundleSha256))
                throw new InvalidDataException("Job input bundle hash changed.");

            string queueRoot = QueueRoot();
            return new JobContext
            {
                JobId = jobId,
                JobDirectory = jobDirectory,
                Manifest = manifest,
                ManifestPath = manifestPath,
                ConfigPath = configPath,
                Sources = sources,
                SourceBundleSha256 = bundleHash,
                InputBundleSha256 = inputBundleHash,
                ResultPath = Path.Combine(jobDirectory, "result.json"),
                CompletionPath = Path.Combine(jobDirectory, "completion.json"),
                DiagnosticsPath = Path.Combine(jobDirectory, "compiler_diagnostics.json"),
                AssemblyPath = Path.Combine(jobDirectory, "worker.dll"),
                PdbPath = Path.Combine(jobDirectory, "worker.pdb"),
                MarkerPath = Path.Combine(queueRoot, jobId + ".ready"),
                QueueRoot = queueRoot
            };
        }

        private static void EnsureQueueMarker(JobContext job)
        {
            Directory.CreateDirectory(job.QueueRoot);
            RejectReparsePoint(job.QueueRoot, "queue root");
            if (File.Exists(job.MarkerPath))
            {
                RejectReparsePoint(job.MarkerPath, "queue marker");
                string existing = StrictUtf8.GetString(ReadBoundedFile(job.MarkerPath, 4096, "queue marker")).Trim();
                if (!PathEquals(existing, job.ManifestPath))
                    throw new IOException("Queue marker already exists with different contents.");
                return;
            }
            WriteNewFile(job.MarkerPath, Utf8NoBom.GetBytes(job.ManifestPath + Environment.NewLine));
        }

        private static void WriteFailureResult(JobContext job, Exception exception)
        {
            if (File.Exists(job.ResultPath))
            {
                try
                {
                    ValidateResult(job);
                    return;
                }
                catch
                {
                    string quarantine = job.ResultPath + ".invalid-" + Guid.NewGuid().ToString("N");
                    File.Move(job.ResultPath, quarantine);
                }
            }
            WriteNewJson(job.ResultPath, new FailureEnvelope
            {
                success = false,
                action = job.Manifest.action,
                error = exception.Message,
                stackTrace = exception.ToString()
            });
        }

        private static void CompleteFromResult(JobContext job)
        {
            ValidateResult(job);
            CompletionEnvelope expected = CreateCompletion(job);
            if (File.Exists(job.CompletionPath))
                ValidateCompletion(job);
            else
                WriteNewJson(job.CompletionPath, expected);
            if (File.Exists(job.MarkerPath))
                File.Delete(job.MarkerPath);
        }

        private static void ValidateResult(JobContext job)
        {
            byte[] bytes = ReadBoundedFile(job.ResultPath, MaximumResultBytes, "job result");
            JObject value;
            try
            {
                value = JObject.Parse(StrictUtf8.GetString(bytes));
            }
            catch (Exception exception)
            {
                throw new InvalidDataException("Job result is not valid UTF-8 JSON.", exception);
            }
            if (value["success"] == null || value["success"].Type != JTokenType.Boolean)
                throw new InvalidDataException("Job result must contain a boolean success field.");
            if (!string.IsNullOrEmpty(job.Manifest.action) &&
                !string.Equals((string)value["action"], job.Manifest.action, StringComparison.Ordinal))
                throw new InvalidDataException("Job result action does not match the manifest.");
        }

        private static CompletionEnvelope CreateCompletion(JobContext job)
        {
            FileInfo result = new FileInfo(job.ResultPath);
            return new CompletionEnvelope
            {
                schemaVersion = CompletionSchemaVersion,
                protocol = Protocol,
                status = "settled",
                jobId = job.JobId,
                action = job.Manifest.action ?? string.Empty,
                manifestSha256 = Sha256(File.ReadAllBytes(job.ManifestPath)),
                configSha256 = Sha256(File.ReadAllBytes(job.ConfigPath)),
                sourceBundleSha256 = job.SourceBundleSha256,
                inputBundleSha256 = job.InputBundleSha256,
                resultSha256 = Sha256(File.ReadAllBytes(job.ResultPath)),
                resultLength = result.Length
            };
        }

        private static void ValidateCompletion(JobContext job)
        {
            CompletionEnvelope actual = JsonConvert.DeserializeObject<CompletionEnvelope>(
                StrictUtf8.GetString(ReadBoundedFile(job.CompletionPath, MaximumManifestBytes, "job completion")));
            CompletionEnvelope expected = CreateCompletion(job);
            if (actual == null || actual.schemaVersion != expected.schemaVersion ||
                !string.Equals(actual.protocol, expected.protocol, StringComparison.Ordinal) ||
                !string.Equals(actual.status, expected.status, StringComparison.Ordinal) ||
                !string.Equals(actual.jobId, expected.jobId, StringComparison.Ordinal) ||
                !string.Equals(actual.action ?? string.Empty, expected.action, StringComparison.Ordinal) ||
                !HashEquals(actual.manifestSha256, expected.manifestSha256) ||
                !HashEquals(actual.configSha256, expected.configSha256) ||
                !HashEquals(actual.sourceBundleSha256, expected.sourceBundleSha256) ||
                !HashEquals(actual.inputBundleSha256, expected.inputBundleSha256) ||
                !HashEquals(actual.resultSha256, expected.resultSha256) ||
                actual.resultLength != expected.resultLength)
            {
                throw new InvalidDataException("Job completion does not bind the immutable job and result.");
            }
        }

        private static string ComputeBundleHash(IEnumerable<SourceContext> sources)
        {
            using (SHA256 hash = SHA256.Create())
            {
                foreach (SourceContext source in sources)
                {
                    byte[] pathBytes = Encoding.UTF8.GetBytes(source.RelativePath);
                    Transform(hash, Int64BigEndian(pathBytes.LongLength));
                    Transform(hash, pathBytes);
                    Transform(hash, Int64BigEndian(source.Bytes.LongLength));
                    Transform(hash, source.Bytes);
                }
                hash.TransformFinalBlock(Array.Empty<byte>(), 0, 0);
                return BytesToHex(hash.Hash);
            }
        }

        private static void Transform(HashAlgorithm hash, byte[] bytes)
        {
            hash.TransformBlock(bytes, 0, bytes.Length, bytes, 0);
        }

        private static byte[] Int64BigEndian(long value)
        {
            byte[] bytes = BitConverter.GetBytes(value);
            if (BitConverter.IsLittleEndian)
                Array.Reverse(bytes);
            return bytes;
        }

        private static byte[] ReadBoundedFile(string path, int maximumBytes, string label)
        {
            RejectReparsePoint(path, label);
            FileInfo info = new FileInfo(path);
            if (!info.Exists || info.Length <= 0 || info.Length > maximumBytes)
                throw new InvalidDataException(label + " size is invalid: " + path);
            return File.ReadAllBytes(path);
        }

        private static string Sha256(byte[] bytes)
        {
            using (SHA256 hash = SHA256.Create())
                return BytesToHex(hash.ComputeHash(bytes));
        }

        private static string BytesToHex(byte[] bytes)
        {
            return string.Concat(bytes.Select(value => value.ToString("x2")));
        }

        private static bool HashEquals(string left, string right)
        {
            return !string.IsNullOrEmpty(left) && !string.IsNullOrEmpty(right) &&
                string.Equals(left, right, StringComparison.OrdinalIgnoreCase);
        }

        private static void WriteNewJson(string path, object value)
        {
            WriteNewFile(path, Utf8NoBom.GetBytes(JsonConvert.SerializeObject(value, Formatting.Indented) + "\n"));
        }

        private static void WriteReplaceJson(string path, object value)
        {
            WriteReplaceBytes(path, Utf8NoBom.GetBytes(JsonConvert.SerializeObject(value, Formatting.Indented) + "\n"));
        }

        private static void WriteNewFile(string path, byte[] bytes)
        {
            if (File.Exists(path))
                throw new IOException("Refusing to replace durable file: " + path);
            WriteTemporaryAndMove(path, bytes, false);
        }

        private static void WriteReplaceBytes(string path, byte[] bytes)
        {
            WriteTemporaryAndMove(path, bytes, true);
        }

        private static void WriteTemporaryAndMove(string path, byte[] bytes, bool replace)
        {
            string directory = Path.GetDirectoryName(path);
            Directory.CreateDirectory(directory);
            string temporary = Path.Combine(directory, "." + Path.GetFileName(path) + "." + Guid.NewGuid().ToString("N") + ".tmp");
            try
            {
                using (FileStream stream = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                {
                    stream.Write(bytes, 0, bytes.Length);
                    stream.Flush(true);
                }
                if (replace && File.Exists(path))
                    File.Replace(temporary, path, null);
                else
                    File.Move(temporary, path);
            }
            finally
            {
                if (File.Exists(temporary))
                    File.Delete(temporary);
            }
        }

        private static void RejectReparsePoint(string path, string label)
        {
            if (File.Exists(path) || Directory.Exists(path))
            {
                if ((File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0)
                    throw new InvalidDataException(label + " cannot be a link/reparse point: " + path);
            }
        }

        private static void EnsureDirectChild(string parent, string child, string label)
        {
            string parentFull = Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            string childFull = Path.GetFullPath(child);
            if (!string.Equals(Path.GetDirectoryName(childFull), parentFull, PathComparison))
                throw new InvalidDataException(label + " must be a direct child of " + parentFull + ": " + childFull);
        }

        private static bool PathEquals(string left, string right)
        {
            return string.Equals(Path.GetFullPath(left), Path.GetFullPath(right), PathComparison);
        }

        private static StringComparison PathComparison
        {
            get
            {
                return Application.platform == RuntimePlatform.WindowsEditor
                    ? StringComparison.OrdinalIgnoreCase
                    : StringComparison.Ordinal;
            }
        }

        private static string ProjectRoot()
        {
            return Path.GetFullPath(Path.Combine(Application.dataPath, ".."));
        }

        private static string JobsRoot()
        {
            return Path.Combine(ProjectRoot(), "Library", "UnityCli", "Jobs");
        }

        private static string QueueRoot()
        {
            return Path.Combine(ProjectRoot(), "Library", "UnityCli", "Queue");
        }

        private static string SanitizeAssemblyName(string value)
        {
            return Regex.Replace(value, "[^A-Za-z0-9_]", "_");
        }

        private static Exception UnwrapInvocationException(Exception exception)
        {
            TargetInvocationException invocation = exception as TargetInvocationException;
            return invocation != null && invocation.InnerException != null ? invocation.InnerException : exception;
        }

        private static SubmitResult CreateSubmitResult(string status, JobContext job, bool queued, bool accepted)
        {
            return new SubmitResult
            {
                status = status,
                protocol = Protocol,
                jobId = job.JobId,
                accepted = accepted,
                queued = queued,
                jobDirectory = job.JobDirectory,
                resultPath = job.ResultPath,
                completionPath = job.CompletionPath,
                compilerDiagnosticsPath = job.DiagnosticsPath
            };
        }

        [Serializable]
        private sealed class JobManifest
        {
            public int schemaVersion;
            public string protocol;
            public string jobId;
            public string action;
            public string entryType;
            public string entryMethod;
            public string configRelativePath;
            public string configSha256;
            public string sourceBundleSha256;
            public SourceEntry[] sources;
            public string inputBundleSha256;
            public InputEntry[] inputs;
        }

        [Serializable]
        private sealed class SourceEntry
        {
            public string relativePath;
            public string sha256;
            public long length;
        }

        [Serializable]
        private sealed class InputEntry
        {
            public string name;
            public string relativePath;
            public string sha256;
            public long length;
        }

        private sealed class SourceContext
        {
            public readonly string RelativePath;
            public readonly string Path;
            public readonly byte[] Bytes;

            public SourceContext(string relativePath, string path, byte[] bytes)
            {
                RelativePath = relativePath;
                Path = path;
                Bytes = bytes;
            }
        }

        private sealed class JobContext
        {
            public string JobId;
            public string JobDirectory;
            public JobManifest Manifest;
            public string ManifestPath;
            public string ConfigPath;
            public List<SourceContext> Sources;
            public string SourceBundleSha256;
            public string InputBundleSha256;
            public string ResultPath;
            public string CompletionPath;
            public string DiagnosticsPath;
            public string AssemblyPath;
            public string PdbPath;
            public string MarkerPath;
            public string QueueRoot;
        }

        [Serializable]
        private sealed class DiagnosticsEnvelope
        {
            public int schemaVersion;
            public bool success;
            public string sourceBundleSha256;
            public object messages;
        }

        [Serializable]
        private sealed class FailureEnvelope
        {
            public bool success;
            public string action;
            public string error;
            public string stackTrace;
        }

        [Serializable]
        private sealed class CompletionEnvelope
        {
            public int schemaVersion;
            public string protocol;
            public string status;
            public string jobId;
            public string action;
            public string manifestSha256;
            public string configSha256;
            public string sourceBundleSha256;
            public string inputBundleSha256;
            public string resultSha256;
            public long resultLength;
        }

        [Serializable]
        public sealed class SubmitResult
        {
            public string status;
            public string protocol;
            public string jobId;
            public bool accepted;
            public bool queued;
            public string jobDirectory;
            public string resultPath;
            public string completionPath;
            public string compilerDiagnosticsPath;
        }
    }
}
#endif
