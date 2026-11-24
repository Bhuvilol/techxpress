#!/usr/bin/env bash
# One-time (and safely re-runnable) Google Cloud setup for the VORTEX API.
# Read infra/gcp/README.md first. Nothing here deletes anything.
#
#   ./infra/gcp/setup.sh core        APIs, Cloud SQL, Artifact Registry, secrets,
#                                    service accounts, GitHub federation, the
#                                    Cloud Run service and jobs. Re-run it to
#                                    apply config.env changes (env vars, newly
#                                    filled secrets); it never replaces the
#                                    deployed image or an existing secret.
#   ./infra/gcp/setup.sh monitoring  uptime check + alert policies (run after the
#                                    first real deploy, when /api/health works)
#   ./infra/gcp/setup.sh budget      monthly budget alert at 50 / 90 / 100 %
#
# Settings come from infra/gcp/config.env (copy config.env.example).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG="$HERE/config.env"
[[ -f "$CONFIG" ]] || { echo "Missing $CONFIG (copy config.env.example)"; exit 1; }
# shellcheck disable=SC1090
source "$CONFIG"

: "${PROJECT_ID:?set PROJECT_ID in config.env}"
: "${REGION:=asia-south1}"

# ── names ───────────────────────────────────────────────────────────────────
SQL_INSTANCE="vortex-db"
SQL_DATABASE="vortex"
SQL_USER="vortex_app"
SQL_CONNECTION="$PROJECT_ID:$REGION:$SQL_INSTANCE"
AR_REPO="techxpress"
SERVICE="vortex-api"
RUNTIME_SA="vortex-api@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOYER_SA="github-deployer@$PROJECT_ID.iam.gserviceaccount.com"
WIF_POOL="github"
WIF_PROVIDER="github-oidc"
SECRETS=(DATABASE_URL ACCESS_TOKEN_SECRET CF_EMAIL_API_TOKEN ADMIN_SEED_PASSWORD STAFF_SEED_JSON)
# Placeholder until the first CI deploy pushes the real image.
PLACEHOLDER_IMAGE="us-docker.pkg.dev/cloudrun/container/hello"

gc() { gcloud --project "$PROJECT_ID" --quiet "$@"; }
step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
has_version() { [[ -n "$(gc secrets versions list "$1" --filter='state=ENABLED' --limit=1 --format='value(name)' 2>/dev/null)" ]]; }
random_secret() { openssl rand -base64 "$1" | tr -d '\n/+=' ; }

# ── core ────────────────────────────────────────────────────────────────────
core() {
  step "APIs"
  gc services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
    secretmanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
    cloudresourcemanager.googleapis.com iam.googleapis.com monitoring.googleapis.com \
    logging.googleapis.com billingbudgets.googleapis.com

  step "Cloud SQL instance $SQL_INSTANCE (first creation takes ~10 minutes)"
  if gc sql instances describe "$SQL_INSTANCE" >/dev/null 2>&1; then
    note "exists"
  else
    # Public IP with no authorized networks: reachable only through the
    # Cloud SQL connector (IAM-checked, encrypted), e.g. from Cloud Run.
    gc sql instances create "$SQL_INSTANCE" \
      --region "$REGION" \
      --database-version POSTGRES_16 \
      --edition enterprise \
      --tier db-custom-1-3840 \
      --availability-type zonal \
      --storage-type SSD --storage-size 10 --storage-auto-increase \
      --backup-start-time 21:30 --retained-backups-count 7 \
      --enable-point-in-time-recovery --retained-transaction-log-days 7 \
      --maintenance-window-day SUN --maintenance-window-hour 21 \
      --deletion-protection
  fi
  if [[ -n "${MAINTENANCE_FREEZE_START:-}" && -n "${MAINTENANCE_FREEZE_END:-}" ]]; then
    note "maintenance freeze $MAINTENANCE_FREEZE_START → $MAINTENANCE_FREEZE_END"
    gc sql instances patch "$SQL_INSTANCE" \
      --deny-maintenance-period-start-date "$MAINTENANCE_FREEZE_START" \
      --deny-maintenance-period-end-date "$MAINTENANCE_FREEZE_END" \
      --deny-maintenance-period-time 00:00:00
  fi
  if ! gc sql databases describe "$SQL_DATABASE" --instance "$SQL_INSTANCE" >/dev/null 2>&1; then
    gc sql databases create "$SQL_DATABASE" --instance "$SQL_INSTANCE"
  fi

  step "Secrets (created empty; values are never printed)"
  for s in "${SECRETS[@]}"; do
    if ! gc secrets describe "$s" >/dev/null 2>&1; then
      gc secrets create "$s" --replication-policy user-managed --locations "$REGION"
    fi
  done

  # Database user + DATABASE_URL, generated together on the first run only.
  if has_version DATABASE_URL; then
    note "DATABASE_URL already set"
  else
    local pw; pw="$(random_secret 36)"
    if gc sql users list --instance "$SQL_INSTANCE" --format='value(name)' | grep -qx "$SQL_USER"; then
      gc sql users set-password "$SQL_USER" --instance "$SQL_INSTANCE" --password "$pw"
    else
      gc sql users create "$SQL_USER" --instance "$SQL_INSTANCE" --password "$pw"
    fi
    printf '%s' "postgresql://$SQL_USER:$pw@localhost/$SQL_DATABASE?host=/cloudsql/$SQL_CONNECTION" \
      | gc secrets versions add DATABASE_URL --data-file=-
    note "DATABASE_URL created for user $SQL_USER"
  fi
  if has_version ACCESS_TOKEN_SECRET; then
    note "ACCESS_TOKEN_SECRET already set"
  else
    printf '%s' "$(random_secret 48)" | gc secrets versions add ACCESS_TOKEN_SECRET --data-file=-
    note "ACCESS_TOKEN_SECRET generated"
  fi
  for s in CF_EMAIL_API_TOKEN ADMIN_SEED_PASSWORD STAFF_SEED_JSON; do
    has_version "$s" && note "$s set" || note "$s is EMPTY — add it (see README), then re-run core"
  done

  step "Artifact Registry $AR_REPO"
  if ! gc artifacts repositories describe "$AR_REPO" --location "$REGION" >/dev/null 2>&1; then
    gc artifacts repositories create "$AR_REPO" --location "$REGION" --repository-format docker \
      --description "TechXpress container images"
  fi
  local policy; policy="$(mktemp)"
  cat > "$policy" <<'JSON'
[
  { "name": "keep-last-20", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": 20 } },
  { "name": "delete-older", "action": { "type": "Delete" }, "condition": { "tagState": "ANY" } }
]
JSON
  gc artifacts repositories set-cleanup-policies "$AR_REPO" --location "$REGION" --policy "$policy" --no-dry-run
  rm -f "$policy"

  step "Service accounts"
  gc iam service-accounts describe "$RUNTIME_SA" >/dev/null 2>&1 \
    || gc iam service-accounts create vortex-api --display-name "VORTEX API runtime"
  gc iam service-accounts describe "$DEPLOYER_SA" >/dev/null 2>&1 \
    || gc iam service-accounts create github-deployer --display-name "GitHub Actions deployer"

  # Runtime: connect to Cloud SQL, write logs/metrics, read its own secrets.
  for role in roles/cloudsql.client roles/logging.logWriter roles/monitoring.metricWriter; do
    gc projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$RUNTIME_SA" \
      --role "$role" --condition None >/dev/null
  done
  for s in "${SECRETS[@]}"; do
    gc secrets add-iam-policy-binding "$s" --member "serviceAccount:$RUNTIME_SA" \
      --role roles/secretmanager.secretAccessor >/dev/null
  done

  # Deployer: deploy Cloud Run, push images to this one repository, and act as
  # the runtime account (nothing else).
  gc projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$DEPLOYER_SA" \
    --role roles/run.developer --condition None >/dev/null
  gc artifacts repositories add-iam-policy-binding "$AR_REPO" --location "$REGION" \
    --member "serviceAccount:$DEPLOYER_SA" --role roles/artifactregistry.writer >/dev/null
  gc iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
    --member "serviceAccount:$DEPLOYER_SA" --role roles/iam.serviceAccountUser >/dev/null

  step "GitHub → GCP federation (no keys)"
  local repo_id="${GITHUB_REPO_ID:-}"
  if [[ -z "$repo_id" ]]; then
    : "${GITHUB_REPO:?set GITHUB_REPO (owner/name) or GITHUB_REPO_ID in config.env}"
    repo_id="$(gh api "repos/$GITHUB_REPO" --jq .id)"
  fi
  local project_number; project_number="$(gc projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  gc iam workload-identity-pools describe "$WIF_POOL" --location global >/dev/null 2>&1 \
    || gc iam workload-identity-pools create "$WIF_POOL" --location global --display-name "GitHub Actions"
  # Only tokens from this repository's main branch are accepted. The numeric
  # repository_id survives renames and can't be re-registered by someone else.
  local condition="assertion.repository_id=='$repo_id' && assertion.ref=='refs/heads/main'"
  local mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref"
  if gc iam workload-identity-pools providers describe "$WIF_PROVIDER" --location global \
      --workload-identity-pool "$WIF_POOL" >/dev/null 2>&1; then
    gc iam workload-identity-pools providers update-oidc "$WIF_PROVIDER" --location global \
      --workload-identity-pool "$WIF_POOL" --attribute-mapping "$mapping" --attribute-condition "$condition"
  else
    gc iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" --location global \
      --workload-identity-pool "$WIF_POOL" --display-name "GitHub OIDC" \
      --issuer-uri "https://token.actions.githubusercontent.com" \
      --attribute-mapping "$mapping" --attribute-condition "$condition"
  fi
  gc iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" --role roles/iam.workloadIdentityUser \
    --member "principalSet://iam.googleapis.com/projects/$project_number/locations/global/workloadIdentityPools/$WIF_POOL/attribute.repository_id/$repo_id" >/dev/null

  step "Cloud Run service $SERVICE"
  local envfile; envfile="$(mktemp)"
  yaml_env() { local v="${2//\\/\\\\}"; printf '%s: "%s"\n' "$1" "${v//\"/\\\"}"; }
  {
    yaml_env NODE_ENV production
    yaml_env TRUST_PROXY_HOPS 1
    yaml_env LOG_LEVEL info
    yaml_env ACCESS_TOKEN_EXPIRY 8h
    yaml_env BCRYPT_ROUNDS 12
    yaml_env CORS_ORIGIN "${CORS_ORIGIN:-}"
    yaml_env APP_URL "${APP_URL:-}"
    yaml_env MAIL_FROM "${MAIL_FROM:-}"
    yaml_env MAIL_REPLY_TO "${MAIL_REPLY_TO:-}"
    yaml_env CF_ACCOUNT_ID "${CF_ACCOUNT_ID:-}"
    yaml_env ENABLE_TESTING_IMPORT false
  } > "$envfile"
  local secrets="DATABASE_URL=DATABASE_URL:latest,ACCESS_TOKEN_SECRET=ACCESS_TOKEN_SECRET:latest"
  has_version CF_EMAIL_API_TOKEN && secrets="$secrets,CF_EMAIL_API_TOKEN=CF_EMAIL_API_TOKEN:latest"

  # One instance: Socket.IO rooms, rate limits and the status cache are in
  # memory. Session affinity keeps each socket client on it; the 1-hour
  # timeout allows long-lived WebSockets (each counts toward concurrency).
  local shape=(
    --region "$REGION"
    --service-account "$RUNTIME_SA"
    --add-cloudsql-instances "$SQL_CONNECTION"
    --env-vars-file "$envfile"
    --min-instances 1 --max-instances 1
    --session-affinity
    --timeout 3600
    --cpu 1 --memory 1Gi --concurrency 1000
    --cpu-throttling --cpu-boost
    --startup-probe "httpGet.path=/api/health/live,httpGet.port=8080,periodSeconds=5,timeoutSeconds=3,failureThreshold=24"
    --liveness-probe "httpGet.path=/api/health/live,httpGet.port=8080,periodSeconds=30,timeoutSeconds=3,failureThreshold=3"
  )
  if gc run services describe "$SERVICE" --region "$REGION" >/dev/null 2>&1; then
    # Keep the deployed image; apply configuration only.
    gc run services update "$SERVICE" "${shape[@]}" --update-secrets "$secrets"
  else
    gc run deploy "$SERVICE" "${shape[@]}" --image "$PLACEHOLDER_IMAGE" --port 8080 \
      --set-secrets "$secrets" --allow-unauthenticated
  fi
  rm -f "$envfile"

  step "Cloud Run jobs"
  local job_shape=(--region "$REGION" --service-account "$RUNTIME_SA" --set-cloudsql-instances "$SQL_CONNECTION"
    --max-retries 0 --task-timeout 900s --cpu 1 --memory 1Gi)
  if gc run jobs describe vortex-migrate --region "$REGION" >/dev/null 2>&1; then
    gc run jobs update vortex-migrate "${job_shape[@]}" --update-secrets DATABASE_URL=DATABASE_URL:latest
  else
    gc run jobs create vortex-migrate "${job_shape[@]}" --image "$PLACEHOLDER_IMAGE" \
      --set-secrets DATABASE_URL=DATABASE_URL:latest --command npx --args prisma,migrate,deploy
  fi

  if has_version ADMIN_SEED_PASSWORD && has_version STAFF_SEED_JSON && [[ -n "${ADMIN_SEED_EMAIL:-}" ]]; then
    local seed_env="NODE_ENV=production,BCRYPT_ROUNDS=12,ADMIN_SEED_EMAIL=$ADMIN_SEED_EMAIL"
    local seed_secrets="DATABASE_URL=DATABASE_URL:latest,ADMIN_SEED_PASSWORD=ADMIN_SEED_PASSWORD:latest,STAFF_SEED_JSON=STAFF_SEED_JSON:latest"
    if gc run jobs describe vortex-seed --region "$REGION" >/dev/null 2>&1; then
      gc run jobs update vortex-seed "${job_shape[@]}" --set-env-vars "$seed_env" --update-secrets "$seed_secrets"
    else
      # Same image as the service once CI has deployed; it points at the
      # migrate job's image so the first seed doesn't run the placeholder.
      local image; image="$(gc run jobs describe vortex-migrate --region "$REGION" \
        --format='value(spec.template.spec.template.spec.containers[0].image)')"
      gc run jobs create vortex-seed "${job_shape[@]}" --image "$image" \
        --set-env-vars "$seed_env" --set-secrets "$seed_secrets" --command node --args prisma/seed.js
    fi
  else
    note "vortex-seed not created yet: needs ADMIN_SEED_EMAIL in config.env and the ADMIN_SEED_PASSWORD and STAFF_SEED_JSON secrets"
  fi

  step "Done. GitHub repository variables (Settings → Secrets and variables → Actions → Variables):"
  note "GCP_PROJECT_ID = $PROJECT_ID"
  note "GCP_REGION     = $REGION"
  note "WIF_PROVIDER   = projects/$project_number/locations/global/workloadIdentityPools/$WIF_POOL/providers/$WIF_PROVIDER"
  note "DEPLOYER_SA    = $DEPLOYER_SA"
  note "API URL        = $(gc run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
}

# ── monitoring ──────────────────────────────────────────────────────────────
monitoring() {
  : "${ALERT_EMAIL:?set ALERT_EMAIL in config.env}"
  local url host
  url="$(gc run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
  host="${url#https://}"

  step "Email notification channel"
  local channel
  channel="$(gc beta monitoring channels list --filter="type=\"email\" AND labels.email_address=\"$ALERT_EMAIL\"" --format='value(name)' | head -1)"
  if [[ -z "$channel" ]]; then
    channel="$(gc beta monitoring channels create --display-name "TechXpress alerts" --type email \
      --channel-labels "email_address=$ALERT_EMAIL" --format='value(name)')"
  fi
  note "$channel"

  step "Uptime check on $url/api/health (every minute)"
  local check
  check="$(gc monitoring uptime list-configs --filter='displayName="vortex-api-health"' --format='value(name)' | head -1)"
  if [[ -z "$check" ]]; then
    gc monitoring uptime create vortex-api-health \
      --resource-type uptime-url --resource-labels "host=$host,project_id=$PROJECT_ID" \
      --protocol https --path /api/health --period 1 --timeout 10 \
      --matcher-type contains-string --matcher-content '"db":"ok"'
    check="$(gc monitoring uptime list-configs --filter='displayName="vortex-api-health"' --format='value(name)' | head -1)"
  fi
  local check_id="${check##*/}"

  step "Alert policies"
  local tmp; tmp="$(mktemp -d)"
  policy() { # name, condition JSON
    local file="$tmp/$1.json"
    cat > "$file" <<JSON
{
  "displayName": "$1",
  "combiner": "OR",
  "notificationChannels": ["$channel"],
  "documentation": { "mimeType": "text/markdown", "content": "See docs/RUNBOOK.md in the techxpress repository." },
  "conditions": [ $2 ]
}
JSON
    if [[ -n "$(gc beta monitoring policies list --filter="displayName=\"$1\"" --format='value(name)')" ]]; then
      note "exists: $1"
    else
      gc beta monitoring policies create --policy-from-file "$file" >/dev/null
      note "created: $1"
    fi
  }
  threshold() { # display name, filter, aligner, reducer, threshold, duration, [denominator filter]
    local agg="{ \"alignmentPeriod\": \"60s\", \"perSeriesAligner\": \"$3\", \"crossSeriesReducer\": \"$4\" }"
    local denom=""
    [[ -n "${7:-}" ]] && denom=", \"denominatorFilter\": \"$7\", \"denominatorAggregations\": [ $agg ]"
    printf '{ "displayName": "%s", "conditionThreshold": { "filter": "%s", "aggregations": [ %s ], "comparison": "COMPARISON_GT", "thresholdValue": %s, "duration": "%s"%s } }' \
      "$1" "$2" "$agg" "$5" "$6" "$denom"
  }
  local sql_db="resource.type=\\\"cloudsql_database\\\" AND resource.label.database_id=\\\"$PROJECT_ID:$SQL_INSTANCE\\\""
  local run_rev="resource.type=\\\"cloud_run_revision\\\" AND resource.label.service_name=\\\"$SERVICE\\\""

  policy "VORTEX API health check failing" "$(threshold "Uptime check failing" \
    "metric.type=\\\"monitoring.googleapis.com/uptime_check/check_passed\\\" AND resource.type=\\\"uptime_url\\\" AND metric.label.check_id=\\\"$check_id\\\"" \
    ALIGN_NEXT_OLDER REDUCE_COUNT_FALSE 1 120s)"
  policy "Cloud SQL CPU above 80%" "$(threshold "CPU > 80% for 5 min" \
    "metric.type=\\\"cloudsql.googleapis.com/database/cpu/utilization\\\" AND $sql_db" ALIGN_MEAN REDUCE_MAX 0.8 300s)"
  policy "Cloud SQL disk above 80%" "$(threshold "Disk > 80%" \
    "metric.type=\\\"cloudsql.googleapis.com/database/disk/utilization\\\" AND $sql_db" ALIGN_MEAN REDUCE_MAX 0.8 300s)"
  policy "VORTEX API 5xx above 2%" "$(threshold "5xx share > 2% for 5 min" \
    "metric.type=\\\"run.googleapis.com/request_count\\\" AND $run_rev AND metric.label.response_code_class=\\\"5xx\\\"" \
    ALIGN_RATE REDUCE_SUM 0.02 300s \
    "metric.type=\\\"run.googleapis.com/request_count\\\" AND $run_rev")"
  policy "VORTEX API near concurrency limit" "$(threshold "p99 concurrent requests > 800 (limit 1000)" \
    "metric.type=\\\"run.googleapis.com/container/max_request_concurrencies\\\" AND $run_rev" \
    ALIGN_PERCENTILE_99 REDUCE_MAX 800 300s)"
  rm -rf "$tmp"
}

# ── budget ──────────────────────────────────────────────────────────────────
budget() {
  : "${BILLING_ACCOUNT_ID:?set BILLING_ACCOUNT_ID in config.env}"
  : "${BUDGET_AMOUNT:?set BUDGET_AMOUNT in config.env, e.g. 10000INR}"
  step "Budget alert for $PROJECT_ID ($BUDGET_AMOUNT / month)"
  if [[ -n "$(gcloud billing budgets list --billing-account "$BILLING_ACCOUNT_ID" \
      --filter='displayName="techxpress monthly"' --format='value(name)')" ]]; then
    note "exists"
    return
  fi
  gcloud billing budgets create --billing-account "$BILLING_ACCOUNT_ID" \
    --display-name "techxpress monthly" --budget-amount "$BUDGET_AMOUNT" \
    --filter-projects "projects/$PROJECT_ID" \
    --threshold-rule percent=0.5 --threshold-rule percent=0.9 --threshold-rule percent=1.0
}

case "${1:-}" in
  core) core ;;
  monitoring) monitoring ;;
  budget) budget ;;
  *) echo "usage: $0 core | monitoring | budget"; exit 1 ;;
esac
