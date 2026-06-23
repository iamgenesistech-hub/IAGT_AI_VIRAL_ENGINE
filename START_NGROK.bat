@echo off
cd /d "%~dp0"
echo Starting ngrok tunnel for EVIE Commercial Intelligence...
echo.
echo Make sure START_DASHBOARD.bat is already running first.
echo This tries to bring the Shopify app URL back online:
echo https://lint-salon-breeding.ngrok-free.dev
echo.
ngrok --config "%~dp0ngrok.local.yml" http --url=lint-salon-breeding.ngrok-free.dev 4175
pause
