@echo off
cd /d "%~dp0"
title EVICS Shopify Tunnel 8080

echo Starting ngrok tunnel to upgraded EVICS on port 8080...
echo.
echo Make sure START_EVICS_LOCAL_8080.bat is already running first.
echo Shopify should point to: https://lint-salon-breeding.ngrok-free.dev
echo.

ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 8080

pause
