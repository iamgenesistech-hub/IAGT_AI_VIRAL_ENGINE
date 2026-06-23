@echo off
setlocal

set "APP_DIR=%~dp0"

echo Cleaning outdated EVICS desktop shortcuts and creating official startup set...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$desktop=[Environment]::GetFolderPath('Desktop');" ^
  "$shell=New-Object -ComObject WScript.Shell;" ^
  "Get-ChildItem -Path $desktop -Filter 'EVICS*.lnk' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue;" ^
  "$items=@(" ^
  "  @{Name='EVICS Local Operations'; Target=(Join-Path '%APP_DIR%' 'START_EVICS_ELITE_LOCAL_PORTS.bat'); Icon='shell32.dll,44'; Description='Official EVICS local startup for workspace, affiliate, and runtime routes'} ," ^
  "  @{Name='EVICS Stop Local'; Target=(Join-Path '%APP_DIR%' 'EVICS-STOP.bat'); Icon='shell32.dll,131'; Description='Stop EVICS node listeners on official local ports'} ," ^
  "  @{Name='EVICS Runtime Doctor'; Target=(Join-Path '%APP_DIR%' 'RUN_EVICS_RUNTIME_DOCTOR.bat'); Icon='shell32.dll,23'; Description='Run EVICS diagnostics against active local runtime'}" ^
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
echo Official desktop shortcuts refreshed.
echo.
pause
