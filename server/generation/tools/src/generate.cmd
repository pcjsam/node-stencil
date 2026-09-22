@echo off
REM Builds the CLI if needed, then generates from tools/code-generator.config.xml
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0generate.ps1" %*
