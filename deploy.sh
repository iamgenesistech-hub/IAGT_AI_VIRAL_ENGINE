#!/usr/bin/env bash
#
# EVICS clean deploy to Cloud Run.
# Strips ONLY the known-benign gcloud identity/IAM noise; real errors still surface.
#
#   "Regional Access Boundary ... Gaia id not found"  -> cosmetic identity-resolution retries
#   "Setting IAM policy failed (allUsers)"             -> service is already public; the binding
#                                                         is inherited by new revisions, so we do
#                                                         NOT re-assert --allow-unauthenticated.
#
# Usage:  ./deploy.sh          (run from the repo root)
#
set -uo pipefail

SERVICE="evics-api"
REGION="us-central1"

echo "== EVICS deploy =="
git log --oneline -1 || true
echo

FILTER='Regional Access Boundary HTTP request failed|Gaia id not found for email|Setting IAM policy|add-iam-policy-binding|Completed with warnings'

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --quiet \
  --memory 1Gi --cpu 1 --concurrency 80 --timeout 300 --max-instances 3 --port 4175 \
  2>&1 | grep -vE "$FILTER"

STATUS=${PIPESTATUS[0]}
if [ "$STATUS" -ne 0 ]; then
  echo
  echo "DEPLOY FAILED (gcloud exit $STATUS)"
  exit "$STATUS"
fi

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)' 2>/dev/null)
if [ -n "$URL" ]; then
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/status")
  echo
  echo "Service URL    : $URL"
  echo "Health /status : HTTP $CODE  (200 = live & public)"
fi
