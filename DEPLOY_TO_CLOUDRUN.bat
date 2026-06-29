@echo off
:: ============================================================
:: EVICS Cloud Run Redeployment Script
:: I AM GENESIS TECH — IAGT AI Viral Engine
::
:: Double-click this file to rebuild and redeploy to Cloud Run.
:: Requires: Google Cloud SDK (gcloud) installed and authenticated.
::
:: Cloud Run URL: https://evics-api-480958062306.us-central1.run.app
:: ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   EVICS Cloud Run Redeployment
echo   I AM GENESIS TECH — iamgenesistech.com
echo ============================================================
echo.

:: Check gcloud is installed
where gcloud >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: gcloud not found.
  echo.
  echo Install Google Cloud SDK from:
  echo   https://cloud.google.com/sdk/docs/install
  echo.
  pause
  exit /b 1
)

:: Show current account
echo Current gcloud account:
gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>nul
echo.

:: Deploy from source — Cloud Build builds the image automatically
echo Submitting build to Google Cloud Build...
echo This takes 3-5 minutes. Do NOT close this window.
echo.

gcloud run deploy evics-api ^
  --source . ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --memory 1Gi ^
  --cpu 1 ^
  --concurrency 80 ^
  --timeout 300 ^
  --max-instances 3 ^
  --port 4175

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ============================================================
  echo   DEPLOYMENT SUCCESSFUL!
  echo.
  echo   Live URL: https://evics-api-480958062306.us-central1.run.app
  echo   Health:   https://evics-api-480958062306.us-central1.run.app/health
  echo   Status:   https://evics-api-480958062306.us-central1.run.app/status
  echo   Affiliate Hub: https://evics-api-480958062306.us-central1.run.app/affiliate
  echo ============================================================
  echo.
  echo Opening affiliate hub in browser...
  start "" "https://evics-api-480958062306.us-central1.run.app/affiliate"
) else (
  echo.
  echo ============================================================
  echo   DEPLOYMENT FAILED.
  echo.
  echo Troubleshooting:
  echo   1. Run: gcloud auth login
  echo   2. Run: gcloud config set project YOUR_PROJECT_ID
  echo   3. Check Cloud Build logs in GCP Console
  echo   4. URL: https://console.cloud.google.com/cloud-build/builds
  echo ============================================================
)

echo.
pause
