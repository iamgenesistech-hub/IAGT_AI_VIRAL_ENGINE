@echo off
REM Creates desktop shortcut for EVICS API Cloud Run Proxy

setlocal enabledelayedexpansion

set "DESKTOP=%USERPROFILE%\Desktop"
set "TARGET=C:\Users\rolan\Documents\Codex\2026-06-12\my-evics-api-app-has-crashed\work\evics-repaired\START_EVICS_CLOUDRUN_PROXY.bat"
set "SHORTCUT=%DESKTOP%\EVICS-API start up.lnk"
set "WORKDIR=C:\Users\rolan\Documents\Codex\2026-06-12\my-evics-api-app-has-crashed\work\evics-repaired"

REM Check if file exists
if not exist "%TARGET%" (
    echo ERROR: START_EVICS_CLOUDRUN_PROXY.bat not found at:
    echo %TARGET%
    pause
    exit /b 1
)

REM Create shortcut using PowerShell
powershell -NoProfile -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; " ^
    "$Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); " ^
    "$Shortcut.TargetPath = '%TARGET%'; " ^
    "$Shortcut.WorkingDirectory = '%WORKDIR%'; " ^
    "$Shortcut.WindowStyle = 1; " ^
    "$Shortcut.Description = 'Start EVICS API Cloud Run Proxy'; " ^
    "$Shortcut.Save();"

if errorlevel 1 (
    echo ERROR: Failed to create shortcut
    pause
    exit /b 1
)

echo.
echo ========================================
echo   EVICS-API start up shortcut created!
echo ========================================
echo.
echo Desktop shortcut location:
echo %SHORTCUT%
echo.
echo Click the shortcut to start the proxy.
echo ========================================
echo.
timeout /t 3
