@echo off
cd /d "%~dp0"
echo Starting ngrok tunnel for full EVICS build...
echo.
echo Make sure START_EVICS_FULL_BUILD.bat is already running first.
echo.
ngrok http 4173
pause
