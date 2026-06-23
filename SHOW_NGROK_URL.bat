@echo off
echo Active ngrok tunnels:
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $tunnels = Invoke-RestMethod http://127.0.0.1:4040/api/tunnels; $tunnels.tunnels | ForEach-Object { Write-Host $_.public_url '->' $_.config.addr } } catch { Write-Host 'ngrok is not running yet. Start START_NGROK.bat first.' }"
echo.
pause
