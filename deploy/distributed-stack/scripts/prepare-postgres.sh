#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/common.sh"

TARGET_DIR="${TARGET_DIR:-${HOME:-$(pwd)}/sub2api-postgres}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:18-alpine}"
POSTGRES_USER="${POSTGRES_USER:-sub2api}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-sub2api}"
POSTGRES_BIND_HOST="${POSTGRES_BIND_HOST:-0.0.0.0}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
TZ_VALUE="${TZ:-Asia/Shanghai}"
ASSUME_YES=0
FORCE=0
START=1
PULL=1
INSTALL_DOCKER=0

usage() {
    cat <<'EOF'
PostgreSQL 节点准备脚本

用法:
  ./scripts/prepare-postgres.sh [options]

参数:
  --dir DIR                    部署目录，默认 ~/sub2api-postgres
  --password PASSWORD          PostgreSQL 密码，留空自动生成
  --user USER                  默认 sub2api
  --db DB                      默认 sub2api
  --bind-host HOST             默认 0.0.0.0，分布式部署需要应用机器可访问
  --port PORT                  默认 5432
  --install-docker             空 Linux/macOS 上尝试安装 Docker
  --no-pull                    不拉镜像
  --no-start                   只生成文件不启动
  --yes, -y                    非交互模式
  --force                      覆盖已有 .env
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --dir) TARGET_DIR="$2"; shift 2 ;;
        --password) POSTGRES_PASSWORD="$2"; shift 2 ;;
        --user) POSTGRES_USER="$2"; shift 2 ;;
        --db) POSTGRES_DB="$2"; shift 2 ;;
        --bind-host) POSTGRES_BIND_HOST="$2"; shift 2 ;;
        --port) POSTGRES_PORT="$2"; shift 2 ;;
        --install-docker) INSTALL_DOCKER=1; shift ;;
        --no-pull) PULL=0; shift ;;
        --no-start) START=0; shift ;;
        --yes|-y) ASSUME_YES=1; shift ;;
        --force) FORCE=1; shift ;;
        --help|-h) usage; exit 0 ;;
        *) print_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

if [ "$ASSUME_YES" -eq 0 ] && has_tty; then
    TARGET_DIR="$(prompt_value "$ASSUME_YES" "部署目录" "$TARGET_DIR")"
    POSTGRES_USER="$(prompt_value "$ASSUME_YES" "PostgreSQL 用户" "$POSTGRES_USER")"
    POSTGRES_DB="$(prompt_value "$ASSUME_YES" "PostgreSQL 数据库" "$POSTGRES_DB")"
    POSTGRES_BIND_HOST="$(prompt_value "$ASSUME_YES" "监听地址" "$POSTGRES_BIND_HOST")"
    POSTGRES_PORT="$(prompt_value "$ASSUME_YES" "监听端口" "$POSTGRES_PORT")"
    POSTGRES_PASSWORD="$(prompt_secret "$ASSUME_YES" "PostgreSQL 密码" "$POSTGRES_PASSWORD")"
fi

if ! validate_port "$POSTGRES_PORT"; then print_error "端口无效: $POSTGRES_PORT"; exit 1; fi
need_cmd openssl
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(generate_secret)}"

if [ "$START" -eq 1 ] || [ "$PULL" -eq 1 ]; then
    ensure_docker "$INSTALL_DOCKER"
fi

mkdir -p "$TARGET_DIR/data/postgres"
copy_template "$STACK_DIR/compose/postgres.yml" "$TARGET_DIR"
ENV_FILE="$TARGET_DIR/.env"
check_overwrite_env "$ENV_FILE" "$FORCE"
: > "$ENV_FILE"
write_env_line "$ENV_FILE" POSTGRES_IMAGE "$POSTGRES_IMAGE"
write_env_line "$ENV_FILE" POSTGRES_CONTAINER_NAME "sub2api-postgres"
write_env_line "$ENV_FILE" POSTGRES_USER "$POSTGRES_USER"
write_env_line "$ENV_FILE" POSTGRES_PASSWORD "$POSTGRES_PASSWORD"
write_env_line "$ENV_FILE" POSTGRES_DB "$POSTGRES_DB"
write_env_line "$ENV_FILE" POSTGRES_BIND_HOST "$POSTGRES_BIND_HOST"
write_env_line "$ENV_FILE" POSTGRES_PORT "$POSTGRES_PORT"
write_env_line "$ENV_FILE" POSTGRES_MAX_CONNECTIONS "512"
write_env_line "$ENV_FILE" POSTGRES_SHARED_BUFFERS "256MB"
write_env_line "$ENV_FILE" POSTGRES_EFFECTIVE_CACHE_SIZE "1GB"
write_env_line "$ENV_FILE" POSTGRES_MAINTENANCE_WORK_MEM "128MB"
write_env_line "$ENV_FILE" TZ "$TZ_VALUE"
chmod 600 "$ENV_FILE"

if [ "$PULL" -eq 1 ]; then
    (cd "$TARGET_DIR" && compose --env-file .env pull)
fi
if [ "$START" -eq 1 ]; then
    (cd "$TARGET_DIR" && compose --env-file .env up -d)
fi

print_success "PostgreSQL 节点已准备完成: $TARGET_DIR"
HOST_IP="$(detect_host_ip)"
echo "连接信息:"
echo "  host=$HOST_IP"
echo "  port=$POSTGRES_PORT"
echo "  user=$POSTGRES_USER"
echo "  password=$POSTGRES_PASSWORD"
echo "  db=$POSTGRES_DB"
print_warning "请只允许应用机器访问 PostgreSQL 端口，不要直接暴露公网"
