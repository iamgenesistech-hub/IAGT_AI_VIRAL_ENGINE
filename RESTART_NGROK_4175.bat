@echo off
cd /d "%~dp0"
title Restart EVICS Ngrok Tunnel

echo Restarting ngrok tunnel for EVICS on port 4175...
echo.
echo This brings the Shopify app URL back online:
echo https://lint-salon-breeding.ngrok-free.dev
echo.

taskkill /IM ngrok.exe /F >nul 2>nul
timeout /t 2 /nobreak >nul

start "" "http://127.0.0.1:4040"
ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 4175

pause
