/*
 * Vibe Coded from legacy code 100% by Cursor and William Mansfield
 */

using CodeGenerator.Core;

namespace CodeGenerator.Cli;

public static class Program
{
    public static int Main(string[] args)
    {
        try
        {
            if (IsHelp(args))
            {
                ShowUsage();
                return 0;
            }

            if (args.Length == 0)
            {
                FileInfo configFile = FindConfigFile(extraDirectory: null);
                if (configFile == null)
                {
                    Console.WriteLine("[ERROR] No code-generator.config.xml found next to the CLI or in the current directory.");
                    ShowUsage();
                    return 1;
                }
                return RunFromConfig(configFile, dataFileOverride: null);
            }

            if (args.Length == 1)
            {
                FileInfo dataFile = new FileInfo(args[0]);
                if (!dataFile.Exists)
                {
                    Console.WriteLine($"[ERROR] Data file not found: {dataFile.FullName}");
                    return 1;
                }

                FileInfo configFile = FindConfigFile(dataFile.DirectoryName);
                if (configFile == null)
                {
                    Console.WriteLine("[ERROR] Single XML file provided, but code-generator.config.xml was not found.");
                    Console.WriteLine("Provide output folder and template files, or place the config next to the CLI.");
                    ShowUsage();
                    return 1;
                }
                return RunFromConfig(configFile, dataFile);
            }

            if (args.Length < 3)
            {
                ShowUsage();
                return 1;
            }

            FileInfo dataFileArg = new FileInfo(args[0]);
            DirectoryInfo outputFolderArg = new DirectoryInfo(args[1]);
            FileInfo[] templateFilesArg = args.Skip(2).Select(arg => new FileInfo(arg)).ToArray();

            if (!dataFileArg.Exists)
            {
                Console.WriteLine($"[ERROR] Data file not found: {dataFileArg.FullName}");
                return 1;
            }

            if (!outputFolderArg.Exists)
            {
                try
                {
                    outputFolderArg.Create();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ERROR] Cannot create output folder: {ex.Message}");
                    return 1;
                }
            }

            foreach (FileInfo template in templateFilesArg)
            {
                if (!template.Exists)
                {
                    Console.WriteLine($"[ERROR] Template file not found: {template.FullName}");
                    return 1;
                }
            }

            GenerateCode(false, dataFileArg, templateFilesArg, outputFolderArg);
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Unexpected error: {ex.Message}");
            return 1;
        }
    }

    static bool IsHelp(string[] args)
    {
        if (args.Length != 1)
        {
            return false;
        }
        string a = args[0];
        return a == "-h" || a == "--help" || a == "-?" || string.Equals(a, "help", StringComparison.OrdinalIgnoreCase);
    }

    static FileInfo FindConfigFile(string extraDirectory)
    {
        List<string> configPaths = new List<string>
        {
            Path.Combine(AppContext.BaseDirectory, "code-generator.config.xml"),
            Path.Combine(Environment.CurrentDirectory, "code-generator.config.xml")
        };
        if (!string.IsNullOrWhiteSpace(extraDirectory))
        {
            configPaths.Add(Path.Combine(extraDirectory, "code-generator.config.xml"));
        }

        foreach (string configPath in configPaths.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            FileInfo testConfig = new FileInfo(configPath);
            if (testConfig.Exists)
            {
                Console.WriteLine($"[INFO] Found config file: {testConfig.FullName}");
                return testConfig;
            }
        }
        return null;
    }

    static string ResolveFrom(string baseDir, string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return path;
        }
        if (Path.IsPathRooted(path))
        {
            return Path.GetFullPath(path);
        }
        return Path.GetFullPath(Path.Combine(baseDir, path));
    }

    static int RunFromConfig(FileInfo configFile, FileInfo dataFileOverride)
    {
        Options options = Utility.DeserializeFromXml<Options>(configFile);
        if (options == null || string.IsNullOrWhiteSpace(options.OutputFolder) || options.SelectedFiles == null || options.SelectedFiles.Count == 0)
        {
            Console.WriteLine("[ERROR] Config file found but missing required fields (OutputFolder or SelectedFiles).");
            return 1;
        }

        string configDir = configFile.DirectoryName ?? ".";
        string dataPath = dataFileOverride != null
            ? dataFileOverride.FullName
            : ResolveFrom(configDir, options.DataFile);
        FileInfo dataFile = new FileInfo(dataPath);
        if (!dataFile.Exists)
        {
            Console.WriteLine($"[ERROR] Data file not found: {dataFile.FullName}");
            return 1;
        }

        string outputFolderPath = ResolveFrom(configDir, options.OutputFolder);
        DirectoryInfo outputFolder = new DirectoryInfo(outputFolderPath);
        if (!outputFolder.Exists)
        {
            outputFolder.Create();
        }

        string[] templatePaths = options.SelectedFiles.Select(t => ResolveFrom(configDir, t)).ToArray();
        foreach (string templatePath in templatePaths)
        {
            if (!File.Exists(templatePath))
            {
                Console.WriteLine($"[ERROR] Template file not found: {templatePath}");
                return 1;
            }
        }

        Console.WriteLine("[INFO] Using config settings:");
        Console.WriteLine($"[INFO]   Data file: {dataFile.FullName}");
        Console.WriteLine($"[INFO]   Output folder: {outputFolderPath}");
        Console.WriteLine($"[INFO]   Templates: {string.Join(", ", templatePaths.Select(Path.GetFileName))}");

        GenerateCode(options.WindowsLineEndings, dataFile, templatePaths, outputFolder, outputFolderPath);
        return 0;
    }

    static void ShowUsage()
    {
        string version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0.0";
        Console.WriteLine($"CodeGenerator CLI v{version}");
        Console.WriteLine("==================");
        Console.WriteLine("Usage: code-generator-cli");
        Console.WriteLine("       code-generator-cli <data-file>");
        Console.WriteLine("       code-generator-cli <data-file> <output-folder> <template1> [template2] ...");
        Console.WriteLine();
        Console.WriteLine("With no arguments, the CLI reads code-generator.config.xml next to the executable");
        Console.WriteLine("(server/generation/tools/) and generates from that config.");
        Console.WriteLine();
        Console.WriteLine("This CLI is the AI/automation entrypoint. The Windows GUI (code-generator) is for humans.");
    }

    static void GenerateCode(bool windowsLineEndings, FileInfo dataFile, object templates, DirectoryInfo outputFolder, string outputFolderPath = null)
    {
        string version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0.0";
        Console.WriteLine($"Code Generator CLI v{version}");
        Console.WriteLine("==================");
        Console.WriteLine($"Data file: {dataFile.FullName}");
        Console.WriteLine($"Templates: {string.Join(", ", GetTemplateNames(templates))}");
        Console.WriteLine($"Output folder: {outputFolder.FullName}");
        Console.WriteLine();

        Translator translator = new Translator();
        translator.Notice += (sender, e) => Console.WriteLine($"[INFO] {e.Message}");
        translator.Error += (sender, e) => Console.WriteLine($"[ERROR] {e.Message}");
        translator.Progress += (sender, e) =>
        {
            int percentage = (int)e.Progress;
            Console.Write($"\r[PROGRESS] {percentage}%");
            if (percentage >= 100)
            {
                Console.WriteLine();
            }
        };

        translator.WindowsLineEndings = windowsLineEndings;
        translator.DataFile = dataFile.FullName;
        translator.OutputFolder = outputFolderPath ?? outputFolder.FullName;

        if (templates is FileInfo[] fileInfos)
        {
            foreach (FileInfo template in fileInfos)
            {
                translator.Templates.Add(new Template(template.Name, template.FullName, true));
            }
        }
        else if (templates is string[] templatePaths)
        {
            foreach (string templatePath in templatePaths)
            {
                string templateName = Path.GetFileName(templatePath);
                translator.Templates.Add(new Template(templateName, templatePath, true));
            }
        }

        translator.GenFiles();
        Console.WriteLine("\nCode generation completed successfully!");
    }

    static string[] GetTemplateNames(object templates)
    {
        if (templates is FileInfo[] fileInfos)
        {
            return fileInfos.Select(t => t.Name).ToArray();
        }
        if (templates is string[] templatePaths)
        {
            return templatePaths.Select(t => Path.GetFileName(t)).ToArray();
        }
        return Array.Empty<string>();
    }
}
