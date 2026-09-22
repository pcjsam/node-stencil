@echo off
REM Legacy wrapper. Framework-dependent builds are optional; default is self-contained.
call "%~dp0build.cmd" %*
