# Runs the generator CLI from tools/ (builds it first if missing).
# AI should use this, not the GUI.

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
)

$ErrorActionPreference = "Stop"
$SrcDir = $PSScriptRoot
$ToolsDir = Split-Path -Parent $SrcDir
$BuildScript = Join-Path $SrcDir "build.ps1"

function Get-CliPath {
    $exe = Join-Path $ToolsDir "code-generator-cli.exe"
    $unix = Join-Path $ToolsDir "code-generator-cli"
    if (Test-Path $exe) { return $exe }
    if (Test-Path $unix) { return $unix }
    return $null
}

$cli = Get-CliPath
if (-not $cli) {
    Write-Host "Generator CLI not found - building once (this needs the .NET SDK)..." -ForegroundColor Yellow
    & $BuildScript
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
    $cli = Get-CliPath
}
if (-not $cli) {
    Write-Host "Build finished but CLI is still missing in $ToolsDir" -ForegroundColor Red
    exit 1
}

Set-Location $ToolsDir
if ($CliArgs -and $CliArgs.Count -gt 0) {
    & $cli @CliArgs
} else {
    & $cli
}
exit $LASTEXITCODE
