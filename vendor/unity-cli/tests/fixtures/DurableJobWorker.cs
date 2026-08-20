using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace UnityCli.Tests.Dynamic
{
    public static class DurableJobWorker
    {
        public static void Run(string configPath)
        {
            JObject config = JObject.Parse(File.ReadAllText(configPath, Encoding.UTF8));
            string resultPath = (string)config["resultPath"];
            string temporary = resultPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
            JObject result = new JObject
            {
                ["success"] = true,
                ["action"] = (string)config["action"],
                ["data"] = new JObject
                {
                    ["message"] = (string)config["message"],
                    ["projectRoot"] = (string)config["projectRoot"]
                }
            };
            File.WriteAllText(temporary, result.ToString(Formatting.Indented) + "\n", new UTF8Encoding(false));
            File.Move(temporary, resultPath);
        }
    }
}
