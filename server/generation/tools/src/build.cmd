@echo off
REM Windows entrypoint. PowerShell execution policy does not matter.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*
