@echo off
title EVICS Official Local Launcher
color 0A
cd /d "%~dp0"

echo =====================================
echo   EVICS OFFICIAL LOCAL LAUNCHER
echo =====================================
echo Starting stable-port runtime and opening primary local routes...
echo.

call "%~dp0START_EVICS_ELITE_LOCAL_PORTS.bat"
