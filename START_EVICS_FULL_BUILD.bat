@echo off
cd /d "%~dp0"
echo Starting full EVICS build...
echo.
echo Keep this window open while using the app.
echo Dashboard: http://localhost:4175/
echo Live Ops: http://localhost:4175/live-ops
echo Status: http://localhost:4175/status
echo.
node evics-runtime-bridge.js
pause
