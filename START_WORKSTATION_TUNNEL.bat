@echo off
cd /d "%~dp0"
title EVICS Workstation SSH Tunnel

echo Starting Cloud Workstations SSH tunnel on localhost:1026...
echo.
echo Keep this window open while connecting to your workstation.
echo.

gcloud workstations start-tcp-tunnel evic-elite-roland-id 22 --local-host-port=127.0.0.1:1026 --cluster=cluster-evics --config=evics-elite-100 --region=us-central1 --project=evics-api

pause
