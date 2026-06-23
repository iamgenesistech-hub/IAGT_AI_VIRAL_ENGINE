@echo off
cd /d "%~dp0"
title EVICS Mode Selector

:menu
cls
echo ==============================================
echo EVICS Startup Mode Selector
echo ==============================================
echo.
echo [1] Local 4175 only
echo [2] Full Stack 4175 (local + Shopify tunnel)
echo [3] Local 8080 upgraded only
echo [4] Full Stack 8080 upgraded (local + Shopify tunnel)
echo [5] Shopify Tunnel 4175 only
echo [6] Shopify Tunnel 8080 only
echo [Q] Quit
echo.
choice /c 123456Q /n /m "Choose mode: "

if errorlevel 7 goto end
if errorlevel 6 goto tunnel8080
if errorlevel 5 goto tunnel4175
if errorlevel 4 goto full8080
if errorlevel 3 goto local8080
if errorlevel 2 goto full4175
if errorlevel 1 goto local4175
goto menu

:local4175
start "EVICS Local 4175" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_4175_GUARD.ps1"
start "" "http://localhost:4175"
goto done

:full4175
start "EVICS Local 4175" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_4175_GUARD.ps1"
timeout /t 4 /nobreak >nul
start "EVICS Shopify Tunnel 4175" cmd /k "cd /d "%~dp0" && ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 4175"
start "" "http://localhost:4175"
goto done

:local8080
start "EVICS Local 8080" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_8080_GUARD.ps1"
start "" "http://localhost:8080"
goto done

:full8080
start "EVICS Local 8080" powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_NEXT_8080_GUARD.ps1"
timeout /t 4 /nobreak >nul
start "EVICS Shopify Tunnel 8080" cmd /k "cd /d "%~dp0" && ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 8080"
start "" "http://localhost:8080"
goto done

:tunnel4175
start "EVICS Shopify Tunnel 4175" cmd /k "cd /d "%~dp0" && ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 4175"
goto done

:tunnel8080
start "EVICS Shopify Tunnel 8080" cmd /k "cd /d "%~dp0" && ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 8080"
goto done

:done
echo.
echo Launch command sent. You can close this selector window.
timeout /t 2 /nobreak >nul
exit /b 0

:end
echo Exiting selector.
timeout /t 1 /nobreak >nul
exit /b 0
