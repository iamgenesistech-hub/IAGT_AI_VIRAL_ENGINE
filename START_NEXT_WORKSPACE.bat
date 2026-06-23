@echo off
cd /d "%~dp0"
echo Starting EVICS Next Workspace on http://127.0.0.1:4176/workspace
npm run dev
pause
