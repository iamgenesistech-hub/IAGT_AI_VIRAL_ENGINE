@echo off
REM EVICS Cloud Run Proxy Launcher
REM Starts authenticated proxy to private Cloud Run service on localhost:8080

echo.
echo ========================================
echo   EVICS API Cloud Run Proxy
echo ========================================
echo.
echo Starting authenticated tunnel to evics-command-center...
echo Service: evics-command-center
echo Region: us-central1
echo Local Binding: http://localhost:8080
echo.
echo Press Ctrl+C to stop the proxy.
echo ========================================
echo.

cd /d "C:\Users\rolan\Documents\Codex\2026-06-12\my-evics-api-app-has-crashed\work\evics-repaired"

gcloud run services proxy evics-command-center --project=evics-api --region=us-central1 --port=8080

if errorlevel 1 (
    echo.
    echo ERROR: Proxy failed to start. Check that gcloud is installed and authenticated.
    pause
)
