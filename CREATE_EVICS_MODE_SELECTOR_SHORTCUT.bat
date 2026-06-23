@echo off
setlocal

set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%START_EVICS_MODE_SELECTOR.bat"
set "SHORTCUT_NAME=EVICS Mode Selector.lnk"

echo Creating EVICS Mode Selector desktop shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $shortcutPath=Join-Path $desktop '%SHORTCUT_NAME%'; $shell=New-Object -ComObject WScript.Shell; $shortcut=$shell.CreateShortcut($shortcutPath); $shortcut.TargetPath='%TARGET%'; $shortcut.WorkingDirectory='%APP_DIR%'; $shortcut.Description='Choose EVICS startup mode: 4175 or 8080 upgraded'; $shortcut.IconLocation=\"$env:SystemRoot\System32\shell32.dll,44\"; $shortcut.Save(); Write-Host \"Created: $shortcutPath\""

echo.
echo Done. Look on your Desktop for "EVICS Mode Selector".
echo.
pause
