@echo off
cd /d "%~dp0"
title EVICS Localhost Launcher

echo Starting EVICS / EVIE on localhost:4175...
echo.
echo Keep this window open while using EVICS locally.
echo.

echo Opening EVICS in your browser shortly...
start "" cmd /c "timeout /t 4 /nobreak >nul && start "" "http://localhost:4175""
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_4175_GUARD.ps1"

pause
