#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/common.sh"

TARGET_DIR="${TARGET_DIR:-${HOME:-$(pwd)}/sub2api-status}"
STATUS_HOST="${STATUS_HOST:-0.0.0.0}"
STATUS_PORT="${STATUS_PORT:-3020}"
STATUS_AUTH_KEY="${STATUS_AUTH_KEY:-}"
STATUS_TARGETS_FILE="${STATUS_TARGETS_FILE:-}"
STATUS_TARGET_TIMEOUT_MS="${STATUS_TARGET_TIMEOUT_MS:-8000}"
STATUS_WINDOW_SECONDS="${STATUS_WINDOW_SECONDS:-180}"
STATUS_THRESHOLD_PERCENT="${STATUS_THRESHOLD_PERCENT:-80}"
STATUS_MIN_REQUESTS="${STATUS_MIN_REQUESTS:-10}"
STATUS_CACHE_TTL_SECONDS="${STATUS_CACHE_TTL_SECONDS:-60}"
STATUS_UPSTREAM_STATUS_CODES="${STATUS_UPSTREAM_STATUS_CODES:-429,500,502,503,504,529}"
TZ_VALUE="${TZ:-Asia/Shanghai}"
ASSUME_YES=0
FORCE=0
START=1

check_node_version() {
    local major
    major="$(node -e "process.stdout.write(process.versions.node.split('.')[0])")"
    if [ "$major" -lt 18 ]; then
        print_error "Status 服务需要 Node.js >= 18，当前版本: $(node -v)"
        exit 1
    fi
}

json_quote() {
    local value="$1"
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    value=${value//$'\n'/}
    value=${value//$'\r'/}
    printf '"%s"' "$value"
}

usage() {
    cat <<'EOF'
Sub2API Status 调度状态服务准备脚本

这个服务使用本机 Node.js 直接运行，不生成 Docker Compose 文件。

用法:
  ./scripts/prepare-status.sh [options]

参数:
  --dir DIR                         部署目录，默认 ~/sub2api-status
  --host HOST                       Node 服务监听地址，默认 0.0.0.0
  --port PORT                       Node 服务监听端口，默认 3020
  --status-auth-key KEY             调度器调用 status 服务的固定密钥
  --targets-file FILE               targets.json 文件，留空使用示例文件
  --target-timeout-ms MS            目标 Sub2API ops 查询超时，默认 8000
  --window-seconds SECONDS          状态统计窗口，120-300，默认 180
  --threshold-percent PERCENT       不可用阈值，默认 80
  --min-requests NUMBER             最小样本数，默认 10
  --cache-ttl-seconds SECONDS       查询失败缓存兜底时间，默认 60
  --upstream-status-codes CODES     计入上游不可用的状态码，默认 429,500,502,503,504,529
  --no-start                        只生成文件不启动
  --yes, -y                         非交互模式
  --force                           覆盖已有 .env
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --dir) TARGET_DIR="$2"; shift 2 ;;
        --host|--bind-host) STATUS_HOST="$2"; shift 2 ;;
        --port) STATUS_PORT="$2"; shift 2 ;;
        --status-auth-key) STATUS_AUTH_KEY="$2"; shift 2 ;;
        --targets-file) STATUS_TARGETS_FILE="$2"; shift 2 ;;
        --target-timeout-ms) STATUS_TARGET_TIMEOUT_MS="$2"; shift 2 ;;
        --window-seconds) STATUS_WINDOW_SECONDS="$2"; shift 2 ;;
        --threshold-percent) STATUS_THRESHOLD_PERCENT="$2"; shift 2 ;;
        --min-requests) STATUS_MIN_REQUESTS="$2"; shift 2 ;;
        --cache-ttl-seconds) STATUS_CACHE_TTL_SECONDS="$2"; shift 2 ;;
        --upstream-status-codes) STATUS_UPSTREAM_STATUS_CODES="$2"; shift 2 ;;
        --no-start) START=0; shift ;;
        --yes|-y) ASSUME_YES=1; shift ;;
        --force) FORCE=1; shift ;;
        --help|-h) usage; exit 0 ;;
        *) print_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

if [ "$ASSUME_YES" -eq 0 ] && has_tty; then
    TARGET_DIR="$(prompt_value "$ASSUME_YES" "部署目录" "$TARGET_DIR")"
    STATUS_HOST="$(prompt_value "$ASSUME_YES" "监听地址" "$STATUS_HOST")"
    STATUS_PORT="$(prompt_value "$ASSUME_YES" "监听端口" "$STATUS_PORT")"
    STATUS_AUTH_KEY="$(prompt_secret "$ASSUME_YES" "Status 调用密钥" "$STATUS_AUTH_KEY")"
    STATUS_TARGETS_FILE="$(prompt_value "$ASSUME_YES" "targets.json 文件，留空使用示例" "$STATUS_TARGETS_FILE")"
fi

if ! validate_port "$STATUS_PORT"; then print_error "Status 端口无效: $STATUS_PORT"; exit 1; fi
need_cmd openssl
if [ "$START" -eq 1 ]; then
    need_cmd node
    check_node_version
fi
STATUS_AUTH_KEY="${STATUS_AUTH_KEY:-$(generate_secret)}"

mkdir -p "$TARGET_DIR"
ENV_FILE="$TARGET_DIR/.env"
check_overwrite_env "$ENV_FILE" "$FORCE"

rm -rf "$TARGET_DIR/status"
mkdir -p "$TARGET_DIR/status"
cp -R "$STACK_DIR/status/." "$TARGET_DIR/status/"

mkdir -p "$TARGET_DIR/status/config"
if [ -n "$STATUS_TARGETS_FILE" ]; then
    cp "$STATUS_TARGETS_FILE" "$TARGET_DIR/status/config/targets.json"
elif [ ! -f "$TARGET_DIR/status/config/targets.json" ]; then
    cp "$STACK_DIR/status/config/targets.example.json" "$TARGET_DIR/status/config/targets.json"
fi

: > "$ENV_FILE"
write_env_line "$ENV_FILE" STATUS_HOST "$STATUS_HOST"
write_env_line "$ENV_FILE" STATUS_PORT "$STATUS_PORT"
write_env_line "$ENV_FILE" STATUS_SERVICE_NAME "Sub2API Status"
write_env_line "$ENV_FILE" STATUS_TARGET_TIMEOUT_MS "$STATUS_TARGET_TIMEOUT_MS"
write_env_line "$ENV_FILE" STATUS_WINDOW_SECONDS "$STATUS_WINDOW_SECONDS"
write_env_line "$ENV_FILE" STATUS_THRESHOLD_PERCENT "$STATUS_THRESHOLD_PERCENT"
write_env_line "$ENV_FILE" STATUS_MIN_REQUESTS "$STATUS_MIN_REQUESTS"
write_env_line "$ENV_FILE" STATUS_CACHE_TTL_SECONDS "$STATUS_CACHE_TTL_SECONDS"
write_env_line "$ENV_FILE" STATUS_UPSTREAM_STATUS_CODES "$STATUS_UPSTREAM_STATUS_CODES"
write_env_line "$ENV_FILE" TZ "$TZ_VALUE"
chmod 600 "$ENV_FILE"

AUTH_FILE="$TARGET_DIR/status/config/auth.json"
{
    echo "{"
    echo "  \"userauthkey\": $(json_quote "$STATUS_AUTH_KEY")"
    echo "}"
} > "$AUTH_FILE"
chmod 600 "$AUTH_FILE"

cat > "$TARGET_DIR/start.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
set -a
. "$BASE_DIR/.env"
set +a
cd "$BASE_DIR/status"
exec node src/server.js
EOF
chmod 755 "$TARGET_DIR/start.sh"

cat > "$TARGET_DIR/stop.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$BASE_DIR/status.pid"
if [ ! -f "$PID_FILE" ]; then
  echo "status.pid 不存在，当前没有由 start.sh 后台启动的进程"
  exit 0
fi
PID="$(cat "$PID_FILE")"
if kill -0 "$PID" >/dev/null 2>&1; then
  kill "$PID"
  echo "已停止 Sub2API Status 进程: $PID"
else
  echo "Sub2API Status 进程已不存在: $PID"
fi
rm -f "$PID_FILE"
EOF
chmod 755 "$TARGET_DIR/stop.sh"

if [ "$START" -eq 1 ]; then
    PID_FILE="$TARGET_DIR/status.pid"
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
        print_warning "Sub2API Status 已在运行，PID: $(cat "$PID_FILE")"
    else
        nohup "$TARGET_DIR/start.sh" > "$TARGET_DIR/status.log" 2>&1 &
        echo "$!" > "$PID_FILE"
        print_success "Sub2API Status 已后台启动，PID: $(cat "$PID_FILE")"
    fi
fi

print_success "Sub2API Status 调度状态服务已准备完成: $TARGET_DIR"
echo "Status 调用密钥:"
echo "  STATUS_AUTH_KEY=$STATUS_AUTH_KEY"
echo "访问地址:"
echo "  http://<status机器IP>:$STATUS_PORT/status/sub2apia"
echo "  http://<status机器IP>:$STATUS_PORT/status/sub2apib"
echo "运行命令:"
echo "  cd $TARGET_DIR && ./start.sh"
echo "后台日志:"
echo "  tail -f $TARGET_DIR/status.log"
echo "请编辑 targets 文件:"
echo "  $TARGET_DIR/status/config/targets.json"
