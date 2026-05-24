@echo off
cd /d "%~dp0"
echo Starting full EVICS build...
echo.
echo Keep this window open while using the app.
echo Dashboard: http://localhost:3000/dashboard
echo Shopify App: http://localhost:3000/app
echo Status: http://localhost:3000/status
echo.
node evics-runtime-bridge.js
pause
