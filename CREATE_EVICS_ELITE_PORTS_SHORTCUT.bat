@echo off
setlocal

set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%START_EVICS_ELITE_LOCAL_PORTS.bat"
set "SHORTCUT_NAME=EVICS Elite Local Ports.lnk"

echo Creating EVICS Elite Local Ports desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shortcutPath=Join-Path $desktop '%SHORTCUT_NAME%'; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut($shortcutPath); $shortcut.TargetPath='%TARGET%'; $shortcut.WorkingDirectory='%APP_DIR%'; $shortcut.Description='Launch EVICS local workspace and diagnostics on active localhost port'; $shortcut.IconLocation=Join-Path $env:SystemRoot 'System32\shell32.dll,44'; $shortcut.Save(); Write-Host ('Created: ' + $shortcutPath)"

echo.
echo Done. Look on your Desktop for "EVICS Elite Local Ports".
echo.
pause
