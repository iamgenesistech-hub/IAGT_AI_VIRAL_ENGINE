@echo off
cd /d "%~dp0"
echo Starting EVIE Commercial Intelligence dashboard...
echo.
echo Keep this window open while using the app.
echo Open http://localhost:4175 in your browser.
echo.
start "" "http://localhost:4175"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_4175_GUARD.ps1"
pause
