@echo off
setlocal

set "APP_DIR=%~dp0"

echo Creating Shopify 8080 desktop shortcuts...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desktop=[Environment]::GetFolderPath('Desktop');" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "$items=@(" ^
  "  @{Name='EVICS Shopify 8080 Tunnel'; Target=(Join-Path '%APP_DIR%' 'START_SHOPIFY_UPGRADED_8080.bat'); Icon='shell32.dll,14'; Description='Expose upgraded EVICS on port 8080 to Shopify via ngrok'}," ^
  "  @{Name='EVICS Full Stack 8080'; Target=(Join-Path '%APP_DIR%' 'START_EVICS_FULL_STACK_8080.bat'); Icon='shell32.dll,44'; Description='Start upgraded EVICS local server and Shopify tunnel on 8080'}" ^
  ");" ^
  "foreach($item in $items){" ^
  "  $shortcutPath=Join-Path $desktop ($item.Name + '.lnk');" ^
  "  $shortcut=$shell.CreateShortcut($shortcutPath);" ^
  "  $shortcut.TargetPath=$item.Target;" ^
  "  $shortcut.WorkingDirectory='%APP_DIR%';" ^
  "  $shortcut.Description=$item.Description;" ^
  "  $shortcut.IconLocation=Join-Path $env:SystemRoot ('System32\' + $item.Icon);" ^
  "  $shortcut.Save();" ^
  "  Write-Host ('Created: ' + $shortcutPath);" ^
  "}"

echo.
echo Desktop Shopify 8080 shortcuts created.
echo.
pause
