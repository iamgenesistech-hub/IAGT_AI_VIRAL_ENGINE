@echo off
cd /d "%~dp0"
title EVICS Terminal View

echo Launching EVICS live terminal dashboard...
echo Press Ctrl+C to stop.
echo.

npm run view:terminal
