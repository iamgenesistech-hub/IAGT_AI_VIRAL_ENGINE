@echo off
setlocal

set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%RUN_EVICS_RUNTIME_DOCTOR.bat"
set "SHORTCUT_NAME=EVICS Runtime Doctor.lnk"

echo Creating EVICS Runtime Doctor desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shortcutPath=Join-Path $desktop '%SHORTCUT_NAME%'; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut($shortcutPath); $shortcut.TargetPath='%TARGET%'; $shortcut.WorkingDirectory='%APP_DIR%'; $shortcut.Description='Run EVICS runtime readiness and provider diagnostics'; $shortcut.IconLocation=Join-Path $env:SystemRoot 'System32\shell32.dll,24'; $shortcut.Save(); Write-Host ('Created: ' + $shortcutPath)"

echo.
echo Done. Look on your Desktop for "EVICS Runtime Doctor".
echo.
pause
