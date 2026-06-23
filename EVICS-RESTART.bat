@echo off
title EVICS Restart
color 0E

cd /d "%~dp0"
call EVICS-STOP.bat
timeout /t 2 >nul
call EVICS-LAUNCH.bat
