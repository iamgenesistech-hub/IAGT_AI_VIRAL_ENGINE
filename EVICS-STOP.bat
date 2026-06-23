@echo off
title EVICS Shutdown
color 0C

echo ============================
echo   STOPPING EVICS SYSTEM...
echo ============================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
	"$ports=@(8080,8081,8082,8083,8084,8085,8086,4175,4176);" ^
	"$listeners=Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $ports };" ^
	"$pids=$listeners | Select-Object -ExpandProperty OwningProcess -Unique;" ^
	"if(-not $pids){ Write-Host 'No EVICS listener processes found on candidate ports.'; exit 0 };" ^
	"foreach($pid in $pids){ try { $proc=Get-Process -Id $pid -ErrorAction Stop; if($proc.ProcessName -eq 'node'){ Stop-Process -Id $pid -Force -ErrorAction Stop; Write-Host ('Stopped node PID ' + $pid); } } catch {} }"

echo.
echo EVICS listener shutdown completed.
echo.
pause
