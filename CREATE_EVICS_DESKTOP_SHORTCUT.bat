@echo off
setlocal

set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%LAUNCH_EVICS_LOCALHOST.bat"
set "SHORTCUT_NAME=EVICS Localhost.lnk"

echo Creating EVICS desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shortcutPath=Join-Path $desktop '%SHORTCUT_NAME%'; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut($shortcutPath); $shortcut.TargetPath='%TARGET%'; $shortcut.WorkingDirectory='%APP_DIR%'; $shortcut.Description='Launch EVICS / EVIE localhost dashboard'; $shortcut.IconLocation=\"$env:SystemRoot\System32\shell32.dll,220\"; $shortcut.Save(); Write-Host \"Created: $shortcutPath\""

echo.
echo Done. Look on your Desktop for "EVICS Localhost".
echo.
pause
