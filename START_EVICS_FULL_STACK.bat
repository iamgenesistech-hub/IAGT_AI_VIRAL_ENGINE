@echo off
cd /d "%~dp0"
title EVICS EVIE Full Startup

echo Starting EVICS / EVIE Commercial Intelligence...
echo.
echo This opens two windows:
echo 1. Dashboard server at http://localhost:4175
echo 2. Ngrok public tunnel for Shopify redirects
echo.

start "EVICS Dashboard - keep open" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_4175_GUARD.ps1"

timeout /t 4 /nobreak >nul

start "EVICS Ngrok Tunnel - keep open" cmd /k "cd /d "%~dp0" && ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 4175"

echo.
echo Started both EVICS windows.
echo Keep both windows open when using Shopify install or redirect flows.
echo For regular dashboard use, open http://localhost:4175
echo.
pause
