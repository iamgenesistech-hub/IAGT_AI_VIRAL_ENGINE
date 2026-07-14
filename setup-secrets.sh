#!/usr/bin/env bash
#
# EVICS — Google Cloud Secret Manager migration
# Run ONCE in Cloud Shell from the repo root.
#
# What this does:
#   1. Reads the current plain-text API keys from Cloud Run environment
#   2. Creates Google Cloud Secret Manager secrets for each sensitive key
#   3. Removes the plain-text env vars from the Cloud Run service
#   4. Re-wires them as Secret Manager references
#   5. Sets Jordan avatar as the default presenter (HEYGEN_AVATAR_ID)
#
# Usage:
#   chmod +x setup-secrets.sh
#   ./setup-secrets.sh
#
set -uo pipefail

SERVICE="evics-api"
REGION="us-central1"

echo "=============================================="
echo "  EVICS Secret Manager Migration"
echo "=============================================="
echo

# ── 1. Read current env from running Cloud Run service ─────────────────────────
echo "[1/4] Reading current Cloud Run environment…"
ENV_JSON=$(gcloud run services describe "$SERVICE" \
  --region "$REGION" \
  --format='json(spec.template.spec.containers[0].env)' 2>/dev/null)

get_env() {
  echo "$ENV_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [{}])[0].get('env', [])
name = '$1'
for item in items:
    if item.get('name') == name:
        print(item.get('value', ''))
        break
" 2>/dev/null || true
}

# ── 2. Define sensitive keys to migrate ───────────────────────────────────────
# Format: SECRET_NAME:ENV_VAR_NAME
declare -a SENSITIVE_KEYS=(
  "evics-heygen-api-key:HEYGEN_API_KEY"
  "evics-openai-api-key:OPENAI_API_KEY"
  "evics-supabase-service-role-key:SUPABASE_SERVICE_ROLE_KEY"
  "evics-kling-api-key:KLING_API_KEY"
  "evics-runway-api-key:RUNWAY_API_KEY"
  "evics-stripe-secret-key:STRIPE_SECRET_KEY"
  "evics-stripe-webhook-secret:STRIPE_WEBHOOK_SECRET"
)

echo "[2/4] Creating Secret Manager secrets…"
for entry in "${SENSITIVE_KEYS[@]}"; do
  SECRET_NAME="${entry%%:*}"
  ENV_NAME="${entry##*:}"
  VALUE=$(get_env "$ENV_NAME")

  if [ -z "$VALUE" ]; then
    echo "  SKIP  $ENV_NAME — not set in Cloud Run (will add manually if needed)"
    continue
  fi

  # Create or update the secret
  if gcloud secrets describe "$SECRET_NAME" --quiet >/dev/null 2>&1; then
    echo "  UPDATE $SECRET_NAME"
    echo -n "$VALUE" | gcloud secrets versions add "$SECRET_NAME" --data-file=- --quiet
  else
    echo "  CREATE $SECRET_NAME"
    echo -n "$VALUE" | gcloud secrets create "$SECRET_NAME" \
      --replication-policy automatic \
      --data-file=- \
      --quiet
  fi
done

# ── 3. Additional runtime config secrets (Jordan avatar) ──────────────────────
# Jordan Avatar IDs — confirmed valid in HeyGen account
JORDAN_AVATAR_ID="dda48749d0bb4eabbee2f95969dee343"
JORDAN_VOICE_ID="fd407cedebcc4f29bdbd75ba45c01ea7"

echo "  CREATE/UPDATE evics-heygen-avatar-id (Jordan)"
echo -n "$JORDAN_AVATAR_ID" | gcloud secrets create evics-heygen-avatar-id \
  --replication-policy automatic --data-file=- --quiet 2>/dev/null \
  || echo -n "$JORDAN_AVATAR_ID" | gcloud secrets versions add evics-heygen-avatar-id --data-file=- --quiet

echo "  CREATE/UPDATE evics-heygen-voice-id (Jordan)"
echo -n "$JORDAN_VOICE_ID" | gcloud secrets create evics-heygen-voice-id \
  --replication-policy automatic --data-file=- --quiet 2>/dev/null \
  || echo -n "$JORDAN_VOICE_ID" | gcloud secrets versions add evics-heygen-voice-id --data-file=- --quiet

echo "  CREATE/UPDATE evics-jordan-avatar-id"
echo -n "$JORDAN_AVATAR_ID" | gcloud secrets create evics-jordan-avatar-id \
  --replication-policy automatic --data-file=- --quiet 2>/dev/null \
  || echo -n "$JORDAN_AVATAR_ID" | gcloud secrets versions add evics-jordan-avatar-id --data-file=- --quiet

echo "  CREATE/UPDATE evics-jordan-voice-id"
echo -n "$JORDAN_VOICE_ID" | gcloud secrets create evics-jordan-voice-id \
  --replication-policy automatic --data-file=- --quiet 2>/dev/null \
  || echo -n "$JORDAN_VOICE_ID" | gcloud secrets versions add evics-jordan-voice-id --data-file=- --quiet

# ── 4. Grant Cloud Run service access to all secrets ──────────────────────────
echo "[3/4] Granting Cloud Run service account access to secrets…"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)' 2>/dev/null)
SA="service-${PROJECT_NUMBER}@serverless-robot-prod.iam.gserviceaccount.com"

for entry in "${SENSITIVE_KEYS[@]}"; do
  SECRET_NAME="${entry%%:*}"
  gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done
for extra in evics-heygen-avatar-id evics-heygen-voice-id evics-jordan-avatar-id evics-jordan-voice-id; do
  gcloud secrets add-iam-policy-binding "$extra" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done

# ── 5. Update Cloud Run service to use Secret Manager references ───────────────
echo "[4/4] Wiring Secret Manager secrets into Cloud Run service…"

# Build --set-secrets flags for all secrets that were created
SECRET_FLAGS=""
for entry in "${SENSITIVE_KEYS[@]}"; do
  SECRET_NAME="${entry%%:*}"
  ENV_NAME="${entry##*:}"
  VALUE=$(get_env "$ENV_NAME")
  if [ -n "$VALUE" ]; then
    SECRET_FLAGS="${SECRET_FLAGS} --update-secrets=${ENV_NAME}=${SECRET_NAME}:latest"
  fi
done

# Add Jordan/avatar IDs
SECRET_FLAGS="${SECRET_FLAGS} --update-secrets=HEYGEN_AVATAR_ID=evics-heygen-avatar-id:latest"
SECRET_FLAGS="${SECRET_FLAGS} --update-secrets=HEYGEN_VOICE_ID=evics-heygen-voice-id:latest"
SECRET_FLAGS="${SECRET_FLAGS} --update-secrets=REACT_APP_JORDAN_AVATAR_ID=evics-jordan-avatar-id:latest"
SECRET_FLAGS="${SECRET_FLAGS} --update-secrets=REACT_APP_JORDAN_VOICE_ID=evics-jordan-voice-id:latest"

# Apply the update (also removes the plain-text versions of migrated keys)
REMOVE_FLAGS=""
for entry in "${SENSITIVE_KEYS[@]}"; do
  ENV_NAME="${entry##*:}"
  VALUE=$(get_env "$ENV_NAME")
  if [ -n "$VALUE" ]; then
    REMOVE_FLAGS="${REMOVE_FLAGS},${ENV_NAME}"
  fi
done
REMOVE_FLAGS="${REMOVE_FLAGS#,}"  # strip leading comma

# shellcheck disable=SC2086
gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --quiet \
  $SECRET_FLAGS \
  ${REMOVE_FLAGS:+--remove-env-vars="$REMOVE_FLAGS"} \
  2>&1 | grep -vE "Regional Access Boundary|Gaia id not found|Setting IAM policy|add-iam-policy-binding|Completed with warnings"

echo
echo "=============================================="
echo "  Migration complete."
echo "  Sensitive keys are now in Secret Manager."
echo "  Jordan Avatar is now the default presenter."
echo "  Run ./deploy.sh to deploy with the new config."
echo "=============================================="
