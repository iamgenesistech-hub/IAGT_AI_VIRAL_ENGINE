@echo off
cd /d "%~dp0"
title EVICS Local 8080

echo Starting EVICS upgraded workspace on localhost:8080...
echo.
echo Keep this window open while using EVICS.
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start "" "http://localhost:8080""
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_8080_GUARD.ps1"

pause
