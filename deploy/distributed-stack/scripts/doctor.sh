#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

PG_HOST="${PG_HOST:-}"
PG_PORT="${PG_PORT:-5432}"
REDIS_HOST_VALUE="${REDIS_HOST:-}"
REDIS_PORT_VALUE="${REDIS_PORT:-6379}"
APP_HOST="${APP_HOST:-}"
APP_PORT="${APP_PORT:-8080}"

usage() {
    cat <<'EOF'
分布式部署连通性检查

用法:
  ./scripts/doctor.sh --pg-host 10.0.0.10 --redis-host 10.0.0.11 --app-host 10.0.0.12
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --pg-host) PG_HOST="$2"; shift 2 ;;
        --pg-port) PG_PORT="$2"; shift 2 ;;
        --redis-host) REDIS_HOST_VALUE="$2"; shift 2 ;;
        --redis-port) REDIS_PORT_VALUE="$2"; shift 2 ;;
        --app-host) APP_HOST="$2"; shift 2 ;;
        --app-port) APP_PORT="$2"; shift 2 ;;
        --help|-h) usage; exit 0 ;;
        *) print_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

check_tcp() {
    local name="$1"
    local host="$2"
    local port="$3"
    if [ -z "$host" ]; then
        print_warning "跳过 ${name}：未提供 host"
        return
    fi
    if command -v nc >/dev/null 2>&1; then
        if nc -z -w 3 "$host" "$port"; then
            print_success "$name 可连接: $host:$port"
        else
            print_error "$name 不可连接: $host:$port"
        fi
    else
        print_warning "未安装 nc，无法检查 $name: $host:$port"
    fi
}

check_http() {
    local host="$1"
    local port="$2"
    if [ -z "$host" ]; then
        print_warning "跳过应用健康检查：未提供 app host"
        return
    fi
    if command -v curl >/dev/null 2>&1; then
        if curl -fsS "http://${host}:${port}/health" >/dev/null; then
            print_success "Sub2API health 正常: http://${host}:${port}/health"
        else
            print_error "Sub2API health 异常: http://${host}:${port}/health"
        fi
    else
        print_warning "未安装 curl，无法检查应用 health"
    fi
}

check_tcp "PostgreSQL" "$PG_HOST" "$PG_PORT"
check_tcp "Redis" "$REDIS_HOST_VALUE" "$REDIS_PORT_VALUE"
check_http "$APP_HOST" "$APP_PORT"
