@echo off
cd /d "%~dp0"
title EVICS Full Stack 8080

echo Starting EVICS upgraded full stack on port 8080...
echo.
echo 1. Local upgraded server: http://localhost:8080
echo 2. Shopify tunnel: https://lint-salon-breeding.ngrok-free.dev
echo.

start "EVICS Local 8080 - keep open" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_8080_GUARD.ps1"

timeout /t 4 /nobreak >nul

start "EVICS Shopify Tunnel 8080 - keep open" cmd /k "cd /d "%~dp0" && ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 8080"

echo.
echo Started upgraded local server and Shopify tunnel.
echo Keep both windows open while testing Shopify.
echo.
pause
