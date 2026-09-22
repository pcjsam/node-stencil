# Builds the Stencil code generator into the parent tools/ folder
# (next to code-generator.config.xml). CLI is for AI; GUI is Windows-only, for humans.
#
# Run from anywhere:
#   .\server\generation\tools\src\build.ps1
#   ./server/generation/tools/src/build.sh

[CmdletBinding()]
param(
    [string]$Configuration = "Release",
    [string]$Runtime,
    [switch]$FrameworkDependent
)

$ErrorActionPreference = "Stop"

$SrcDir = $PSScriptRoot
$ToolsDir = Split-Path -Parent $SrcDir
$CliProject = Join-Path $SrcDir "CodeGenerator.Cli\CodeGenerator.Cli.csproj"
$GuiProject = Join-Path $SrcDir "CodeGenerator.Gui\CodeGenerator.Gui.csproj"

function Get-NativeRid {
    if ($Runtime) {
        return $Runtime
    }
    $arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    if ($arch -eq "x64") { $archRid = "x64" }
    elseif ($arch -eq "arm64") { $archRid = "arm64" }
    elseif ($arch -eq "x86") { $archRid = "x86" }
    else { $archRid = "x64" }

    if ($env:OS -eq "Windows_NT") {
        return "win-$archRid"
    }
    if ($IsMacOS) {
        return "osx-$archRid"
    }
    if ($IsLinux) {
        return "linux-$archRid"
    }
    throw 'Could not detect OS. Pass -Runtime (win-x64, osx-arm64, linux-x64, ...).'
}

function Test-DotnetSdk {
    $dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
    if (-not $dotnet) {
        Write-Host "The .NET SDK is not installed (or not on PATH)." -ForegroundColor Red
        Write-Host "Install the .NET 8 SDK or newer, then re-run this script:" -ForegroundColor Yellow
        Write-Host "  https://dotnet.microsoft.com/download/dotnet/8.0"
        exit 1
    }
    $sdks = & dotnet --list-sdks 2>$null
    if (-not $sdks) {
        Write-Host "dotnet was found but no SDK is installed (runtime-only is not enough)." -ForegroundColor Red
        Write-Host "Install the .NET 8 SDK or newer:" -ForegroundColor Yellow
        Write-Host "  https://dotnet.microsoft.com/download/dotnet/8.0"
        exit 1
    }
}

function Invoke-Publish {
    param(
        [string]$Project,
        [string]$Rid,
        [bool]$SelfContained,
        [string]$StagingDir,
        [string[]]$BinaryNames
    )
    if (Test-Path $StagingDir) {
        Remove-Item -Recurse -Force $StagingDir
    }
    New-Item -ItemType Directory -Path $StagingDir | Out-Null
    $self = if ($SelfContained) { "true" } else { "false" }
    & dotnet publish $Project `
        -c $Configuration `
        -r $Rid `
        --self-contained $self `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -p:EnableCompressionInSingleFile=true `
        -p:DebugType=None `
        -p:DebugSymbols=false `
        -o $StagingDir
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        Write-Host "dotnet publish failed with exit code $code" -ForegroundColor Red
        $script:PublishExit = $code
        return
    }
    $copied = $false
    foreach ($name in $BinaryNames) {
        $from = Join-Path $StagingDir $name
        if (Test-Path $from) {
            Copy-Item -Force $from (Join-Path $ToolsDir $name)
            $copied = $true
        }
    }
    if (-not $copied) {
        Write-Host "Publish succeeded but none of these files were produced: $($BinaryNames -join ', ')" -ForegroundColor Red
        $script:PublishExit = 1
        return
    }
    $script:PublishExit = 0
}

function Get-CliPath {
    $exe = Join-Path $ToolsDir "code-generator-cli.exe"
    $unix = Join-Path $ToolsDir "code-generator-cli"
    if (Test-Path $exe) { return $exe }
    if (Test-Path $unix) { return $unix }
    return $null
}

Test-DotnetSdk
$rid = Get-NativeRid
$selfContained = -not $FrameworkDependent

Write-Host "Stencil code generator - build" -ForegroundColor Green
Write-Host "CLI is for AI. GUI is Windows-only and is for humans exploring the generator." -ForegroundColor DarkGray
Write-Host "Configuration : $Configuration"
Write-Host "Runtime       : $rid"
Write-Host "Self-contained: $selfContained"
Write-Host "Output        : $ToolsDir"
Write-Host ""

if (!(Test-Path $CliProject)) {
    Write-Host "CLI project not found: $CliProject" -ForegroundColor Red
    exit 1
}

Write-Host "Building CLI..." -ForegroundColor Cyan
$cliStaging = Join-Path $SrcDir "artifacts\cli"
$script:PublishExit = 1
Invoke-Publish -Project $CliProject -Rid $rid -SelfContained $selfContained -StagingDir $cliStaging -BinaryNames @("code-generator-cli.exe", "code-generator-cli")
if ($script:PublishExit -ne 0) {
    Write-Host "CLI build failed." -ForegroundColor Red
    exit $script:PublishExit
}

$cliPath = Get-CliPath
if (-not $cliPath) {
    Write-Host "CLI publish succeeded but code-generator-cli was not found in $ToolsDir" -ForegroundColor Red
    exit 1
}
if ($env:OS -ne "Windows_NT") {
    try { & chmod +x $cliPath 2>$null } catch { }
}
$cliSize = [math]::Round((Get-Item $cliPath).Length / 1MB, 2)
Write-Host ('CLI built: ' + $cliPath + ' (' + $cliSize.ToString() + ' MB)') -ForegroundColor Green

$guiOk = $false
if ($rid.StartsWith("win-")) {
    Write-Host ""
    Write-Host "Building GUI for humans (Windows only)..." -ForegroundColor Cyan
    $guiStaging = Join-Path $SrcDir "artifacts\gui"
    $script:PublishExit = 1
    Invoke-Publish -Project $GuiProject -Rid $rid -SelfContained $selfContained -StagingDir $guiStaging -BinaryNames @("code-generator.exe")
    if ($script:PublishExit -eq 0 -and (Test-Path (Join-Path $ToolsDir "code-generator.exe"))) {
        $guiOk = $true
        $guiPath = Join-Path $ToolsDir "code-generator.exe"
        $guiSize = [math]::Round((Get-Item $guiPath).Length / 1MB, 2)
        Write-Host ('GUI built: ' + $guiPath + ' (' + $guiSize.ToString() + ' MB)') -ForegroundColor Green
    }
    else {
        Write-Host "GUI build skipped or failed. CLI is enough for AI and XML generation." -ForegroundColor Yellow
    }
}
else {
    Write-Host ""
    Write-Host "Skipping GUI. WinForms is Windows-only. Use the CLI on this OS." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Cleaning leftover publish files from tools/..." -ForegroundColor Cyan
@(
    "*.pdb",
    "*.dll",
    "*.deps.json",
    "*.runtimeconfig.json",
    "createdump"
) | ForEach-Object {
    Get-ChildItem -Path $ToolsDir -Filter $_ -File -ErrorAction SilentlyContinue | Remove-Item -Force
}

Write-Host ""
Write-Host "Done. tools/ should now contain the binaries and code-generator.config.xml" -ForegroundColor Green
Write-Host ('  AI CLI    : ' + (Split-Path $cliPath -Leaf))
if ($guiOk) {
    Write-Host "  Human GUI : code-generator.exe"
}
Write-Host ""
Write-Host "Run (no args; uses the XML config beside the exe):" -ForegroundColor Yellow
Write-Host ('  ' + $cliPath)
