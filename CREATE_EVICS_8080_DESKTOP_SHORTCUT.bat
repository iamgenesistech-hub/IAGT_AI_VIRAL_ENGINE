@echo off
setlocal

set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%START_EVICS_LOCAL_8080.bat"
set "SHORTCUT_NAME=EVICS Local 8080.lnk"

echo Creating EVICS Local 8080 desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shortcutPath=Join-Path $desktop '%SHORTCUT_NAME%'; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut($shortcutPath); $shortcut.TargetPath='%TARGET%'; $shortcut.WorkingDirectory='%APP_DIR%'; $shortcut.Description='Launch EVICS upgraded build on localhost:8080'; $shortcut.IconLocation=\"$env:SystemRoot\System32\shell32.dll,220\"; $shortcut.Save(); Write-Host \"Created: $shortcutPath\""

echo.
echo Done. Look on your Desktop for "EVICS Local 8080".
echo.
pause
