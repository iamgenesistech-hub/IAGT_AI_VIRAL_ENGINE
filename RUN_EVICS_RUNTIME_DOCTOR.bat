@echo off
cd /d "%~dp0"
title EVICS Runtime Doctor

echo Running EVICS runtime doctor...
echo.

npm run doctor

echo.
echo To clear provider auth cache then re-check, run:
echo npm run doctor:reset-auth

pause
