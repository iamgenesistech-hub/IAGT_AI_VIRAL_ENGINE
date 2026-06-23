@echo off
cd /d "%~dp0"
title EVICS Elite Local Ports

echo Starting EVICS elite local launcher...
echo This will auto-detect active EVICS ports or start server.js and open workspace + health pages.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_EVICS_ELITE_LOCAL_PORTS.ps1"

pause
