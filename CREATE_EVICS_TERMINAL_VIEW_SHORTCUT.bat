@echo off
setlocal

set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%VIEW_EVICS_TERMINAL.bat"
set "SHORTCUT_NAME=EVICS Terminal View.lnk"

echo Creating EVICS Terminal View desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shortcutPath=Join-Path $desktop '%SHORTCUT_NAME%'; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut($shortcutPath); $shortcut.TargetPath='%TARGET%'; $shortcut.WorkingDirectory='%APP_DIR%'; $shortcut.Description='Open EVICS live status dashboard in terminal'; $shortcut.IconLocation=Join-Path $env:SystemRoot 'System32\shell32.dll,13'; $shortcut.Save(); Write-Host ('Created: ' + $shortcutPath)"

echo.
echo Done. Look on your Desktop for "EVICS Terminal View".
echo.
pause
