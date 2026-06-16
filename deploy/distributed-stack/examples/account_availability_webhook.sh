#!/usr/bin/env bash
set -euo pipefail

STATE_FILE="${STATE_FILE:-/tmp/sub2api-account-watch.state}"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "missing required command: $1" >&2
    exit 1
  fi
}

require_env() {
  if [ -z "${!1:-}" ]; then
    echo "missing required environment variable: $1" >&2
    exit 1
  fi
}

need_cmd curl
need_cmd jq

require_env ADMIN_API_KEY
require_env WEBHOOK_URL

if [ -z "${SUB2API_BASE_URL:-}" ]; then
  require_env SUB2API_HOSTNAME
  SUB2API_SCHEME="${SUB2API_SCHEME:-http}"
  if [ -n "${SUB2API_PORT:-}" ]; then
    SUB2API_BASE_URL="${SUB2API_SCHEME}://${SUB2API_HOSTNAME}:${SUB2API_PORT}"
  else
    SUB2API_BASE_URL="${SUB2API_SCHEME}://${SUB2API_HOSTNAME}"
  fi
fi

if [ -z "${WATCH_GROUPS_JSON:-}" ] && [ -n "${WATCH_GROUPS_FILE:-}" ]; then
  if [ ! -f "$WATCH_GROUPS_FILE" ]; then
    echo "WATCH_GROUPS_FILE does not exist: $WATCH_GROUPS_FILE" >&2
    exit 1
  fi
  WATCH_GROUPS_JSON="$(cat "$WATCH_GROUPS_FILE")"
fi

require_env WATCH_GROUPS_JSON

if ! jq -e 'type == "array"' >/dev/null 2>&1 <<<"$WATCH_GROUPS_JSON"; then
  echo "WATCH_GROUPS_JSON must be a JSON array" >&2
  exit 1
fi

BASE_URL="${SUB2API_BASE_URL%/}"

if [ -f "$STATE_FILE" ]; then
  if ! jq -e 'type == "object"' "$STATE_FILE" >/dev/null 2>&1; then
    echo "state file is not a JSON object: $STATE_FILE" >&2
    exit 1
  fi
else
  mkdir -p "$(dirname "$STATE_FILE")"
  printf '{}\n' >"$STATE_FILE"
fi

state_json="$(cat "$STATE_FILE")"
new_state_json="$state_json"

watch_count="$(jq 'length' <<<"$WATCH_GROUPS_JSON")"
if [ "$watch_count" -eq 0 ]; then
  echo "WATCH_GROUPS_JSON is empty"
  exit 0
fi

send_webhook() {
  local payload="$1"
  curl -fsS \
    -X POST "$WEBHOOK_URL" \
    -H "content-type: application/json" \
    -d "$payload" >/dev/null
}

for ((i = 0; i < watch_count; i++)); do
  watch_item="$(jq -c ".[$i]" <<<"$WATCH_GROUPS_JSON")"

  name="$(jq -r '.name // empty' <<<"$watch_item")"
  platform="$(jq -r '.platform // empty' <<<"$watch_item")"
  group_id="$(jq -r '.group_id // empty' <<<"$watch_item")"
  min_available="$(jq -r '.min_available // empty' <<<"$watch_item")"
  min_ratio="$(jq -r '.min_ratio // empty' <<<"$watch_item")"

  if [ -z "$platform" ]; then
    echo "WATCH_GROUPS_JSON[$i].platform is required" >&2
    exit 1
  fi
  if ! [[ "$group_id" =~ ^[0-9]+$ ]] || [ "$group_id" -le 0 ]; then
    echo "WATCH_GROUPS_JSON[$i].group_id must be a positive integer" >&2
    exit 1
  fi
  if [ -z "$name" ]; then
    name="${platform}-${group_id}"
  fi
  if [ -z "$min_available" ] && [ -z "$min_ratio" ]; then
    echo "WATCH_GROUPS_JSON[$i] must set min_available or min_ratio" >&2
    exit 1
  fi

  api_url="${BASE_URL}/api/v1/admin/ops/account-availability?platform=${platform}&group_id=${group_id}"
  response="$(curl -fsS -H "x-api-key: ${ADMIN_API_KEY}" "$api_url")"
  code="$(jq -r '.code // empty' <<<"$response")"
  if [ "$code" != "0" ]; then
    echo "Sub2API returned non-success response for group ${group_id}: ${response}" >&2
    exit 1
  fi

  enabled="$(jq -r '.data.enabled // false' <<<"$response")"
  if [ "$enabled" != "true" ]; then
    echo "ops realtime monitoring is disabled; skip group ${group_id}" >&2
    continue
  fi

  group_json="$(jq -c --arg gid "$group_id" '.data.group[$gid] // {}' <<<"$response")"
  total_count="$(jq -r '.total_accounts // 0' <<<"$group_json")"
  available_count="$(jq -r '.available_count // 0' <<<"$group_json")"
  actual_group_name="$(jq -r '.group_name // empty' <<<"$group_json")"
  if [ -n "$actual_group_name" ] && [ "$name" = "${platform}-${group_id}" ]; then
    name="$actual_group_name"
  fi

  available_ratio="$(jq -n \
    --argjson available "$available_count" \
    --argjson total "$total_count" \
    'if $total > 0 then (($available * 10000 / $total) | round / 100) else 0 end')"

  breach_available="false"
  breach_ratio="false"
  if [ -n "$min_available" ]; then
    breach_available="$(jq -n --argjson a "$available_count" --argjson t "$min_available" '$a < $t')"
  fi
  if [ -n "$min_ratio" ]; then
    breach_ratio="$(jq -n --argjson r "$available_ratio" --argjson t "$min_ratio" '$r < $t')"
  fi

  status="ok"
  if [ "$breach_available" = "true" ] || [ "$breach_ratio" = "true" ]; then
    status="firing"
  fi

  state_key="${platform}:${group_id}"
  previous_status="$(jq -r --arg key "$state_key" '.[$key].status // "ok"' <<<"$state_json")"

  if [ "$status" = "ok" ] && [ "$previous_status" != "firing" ]; then
    new_state_json="$(jq --arg key "$state_key" 'del(.[$key])' <<<"$new_state_json")"
    echo "ok: ${name} available=${available_count}/${total_count} ratio=${available_ratio}%"
    continue
  fi

  notify_status="$status"
  if [ "$status" = "ok" ] && [ "$previous_status" = "firing" ]; then
    notify_status="resolved"
  elif [ "$status" = "firing" ] && [ "$previous_status" = "firing" ]; then
    echo "still firing: ${name} available=${available_count}/${total_count} ratio=${available_ratio}%"
    new_state_json="$(jq \
      --arg key "$state_key" \
      --arg status "firing" \
      --arg checked_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
      '.[$key].status = $status | .[$key].last_checked_at = $checked_at' <<<"$new_state_json")"
    continue
  fi

  checked_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  payload="$(jq -n \
    --arg event "sub2api.account_availability.low" \
    --arg status "$notify_status" \
    --arg group_name "$name" \
    --arg platform "$platform" \
    --argjson group_id "$group_id" \
    --argjson available_count "$available_count" \
    --argjson total_count "$total_count" \
    --argjson available_ratio "$available_ratio" \
    --arg min_available "$min_available" \
    --arg min_ratio "$min_ratio" \
    --arg checked_at "$checked_at" \
    --argjson breach_available "$breach_available" \
    --argjson breach_ratio "$breach_ratio" \
    '
    def number_or_null($v): if $v == "" then null else ($v | tonumber) end;
    {
      event: $event,
      status: $status,
      group_name: $group_name,
      platform: $platform,
      group_id: $group_id,
      available_count: $available_count,
      total_count: $total_count,
      available_ratio: $available_ratio,
      thresholds: {
        min_available: number_or_null($min_available),
        min_ratio: number_or_null($min_ratio)
      },
      reasons: [],
      checked_at: $checked_at
    }
    | if $breach_available and ($min_available != "") then
        .reasons += ["available_count \($available_count) < min_available \($min_available)"]
      else . end
    | if $breach_ratio and ($min_ratio != "") then
        .reasons += ["available_ratio \($available_ratio) < min_ratio \($min_ratio)"]
      else . end
    ')"

  send_webhook "$payload"
  echo "sent ${notify_status}: ${name} available=${available_count}/${total_count} ratio=${available_ratio}%"

  if [ "$notify_status" = "firing" ]; then
    new_state_json="$(jq \
      --arg key "$state_key" \
      --arg status "firing" \
      --arg checked_at "$checked_at" \
      '.[$key] = {status: $status, last_checked_at: $checked_at}' <<<"$new_state_json")"
  else
    new_state_json="$(jq --arg key "$state_key" 'del(.[$key])' <<<"$new_state_json")"
  fi
done

tmp_file="$(mktemp "${STATE_FILE}.XXXXXX")"
printf '%s\n' "$new_state_json" | jq . >"$tmp_file"
mv "$tmp_file" "$STATE_FILE"
