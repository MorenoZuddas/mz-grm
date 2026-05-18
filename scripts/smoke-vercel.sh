#!/usr/bin/env zsh
set -euo pipefail

# Smoke test for deployed APIs, with optional Vercel Deployment Protection bypass.
# Usage:
#   BASE_URL="https://your-app.vercel.app" API_SECRET="..." ./scripts/smoke-vercel.sh
# Optional:
#   BYPASS_TOKEN="..."   # Vercel deployment protection bypass token
#   COOKIE_JAR="/tmp/mz-vercel-cookie.txt"

BASE_URL="${BASE_URL:-}"
API_SECRET="${API_SECRET:-}"
BYPASS_TOKEN="${BYPASS_TOKEN:-}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/mz-vercel-cookie.txt}"

if [[ -z "$BASE_URL" ]]; then
  echo "ERROR: BASE_URL is required. Example: BASE_URL=\"https://my-app.vercel.app\""
  exit 1
fi

BASE_URL="${BASE_URL%/}"

print_header() {
  echo
  echo "== $1 =="
}

request_status() {
  local method="$1"
  local endpoint="$2"
  local output_file="$3"
  shift 3

  local url="${BASE_URL}${endpoint}"
  curl -sS "$@" -X "$method" -o "$output_file" -w "%{http_code}" "$url"
}

contains_vercel_auth_page() {
  local file="$1"
  grep -q "Vercel Authentication\|Authentication Required\|vercel.com/sso-api" "$file" 2>/dev/null
}

prepare_bypass_cookie_if_needed() {
  if [[ -z "$BYPASS_TOKEN" ]]; then
    return 0
  fi

  print_header "Preparing Vercel bypass cookie"
  : > "$COOKIE_JAR"

  local warmup_url="${BASE_URL}/api/status?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${BYPASS_TOKEN}"
  local code
  code=$(curl -sS -o /tmp/mz_bypass_warmup.html -w "%{http_code}" -c "$COOKIE_JAR" "$warmup_url")

  echo "bypass_warmup=${code}"
  if [[ "$code" != "200" && "$code" != "401" ]]; then
    echo "WARN: unexpected bypass warmup status (${code}). Continuing anyway."
  fi
}

CURL_COMMON_ARGS=( )
prepare_bypass_cookie_if_needed
if [[ -n "$BYPASS_TOKEN" ]]; then
  CURL_COMMON_ARGS+=( -b "$COOKIE_JAR" )
fi

print_header "Protected endpoints without API secret (expected: 401)"
status_no_secret=$(request_status GET "/api/status" /tmp/mz_status_no_secret.json "${CURL_COMMON_ARGS[@]}")
env_no_secret=$(request_status GET "/api/diagnose/env" /tmp/mz_env_no_secret.json "${CURL_COMMON_ARGS[@]}")
echo "status_no_secret=${status_no_secret}"
echo "env_no_secret=${env_no_secret}"

print_header "Protected endpoints with API secret (expected: 200)"
if [[ -n "$API_SECRET" ]]; then
  status_with_secret=$(request_status GET "/api/status" /tmp/mz_status_with_secret.json "${CURL_COMMON_ARGS[@]}" -H "x-api-secret: ${API_SECRET}")
  env_with_secret=$(request_status GET "/api/diagnose/env" /tmp/mz_env_with_secret.json "${CURL_COMMON_ARGS[@]}" -H "x-api-secret: ${API_SECRET}")
  echo "status_with_secret=${status_with_secret}"
  echo "env_with_secret=${env_with_secret}"
else
  echo "SKIPPED: API_SECRET not provided"
  status_with_secret="SKIPPED"
  env_with_secret="SKIPPED"
fi

print_header "Public endpoints (expected: 200)"
garmin_public=$(request_status GET "/api/activities/garmin?limit=2&include_photos=false" /tmp/mz_garmin_public.json "${CURL_COMMON_ARGS[@]}")
all_public=$(request_status GET "/api/activities/all" /tmp/mz_all_public.json "${CURL_COMMON_ARGS[@]}")
echo "garmin_public=${garmin_public}"
echo "all_public=${all_public}"

print_header "Contact endpoint quick probe"
contact_1=$(request_status POST "/api/contact" /tmp/mz_contact_1.json "${CURL_COMMON_ARGS[@]}" -H "content-type: application/json" --data '{"name":"a"}')
contact_2=$(request_status POST "/api/contact" /tmp/mz_contact_2.json "${CURL_COMMON_ARGS[@]}" -H "content-type: application/json" --data '{"name":"a"}')
echo "contact_1=${contact_1} (expected: 400 or 429)"
echo "contact_2=${contact_2} (expected: 400/429, depending on rate-limit settings)"

print_header "Detection hints"
if contains_vercel_auth_page /tmp/mz_status_no_secret.json || contains_vercel_auth_page /tmp/mz_garmin_public.json; then
  echo "Detected Vercel Deployment Protection page in responses."
  echo "Your checks are hitting Vercel auth before your app."
  echo "Use BYPASS_TOKEN or run via authenticated 'vercel curl'."
fi

print_header "Summary"
echo "BASE_URL=${BASE_URL}"
echo "status_no_secret=${status_no_secret}"
echo "env_no_secret=${env_no_secret}"
echo "status_with_secret=${status_with_secret}"
echo "env_with_secret=${env_with_secret}"
echo "garmin_public=${garmin_public}"
echo "all_public=${all_public}"
echo "contact_1=${contact_1}"
echo "contact_2=${contact_2}"

echo
if [[ "$status_no_secret" == "401" && "$env_no_secret" == "401" && "$garmin_public" == "200" && "$all_public" == "200" ]]; then
  if [[ "$status_with_secret" == "SKIPPED" || ("$status_with_secret" == "200" && "$env_with_secret" == "200") ]]; then
    echo "SMOKE TEST: PASS"
    exit 0
  fi
fi

echo "SMOKE TEST: CHECK MANUALLY (some expectations did not match)"
exit 2


