# Legacy wrapper. Canonical script is .\build.ps1
& "$PSScriptRoot\build.ps1" -FrameworkDependent @args
exit $LASTEXITCODE
