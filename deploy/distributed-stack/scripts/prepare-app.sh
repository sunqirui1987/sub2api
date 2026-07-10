#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${STACK_DIR}/../.." 2>/dev/null && pwd || pwd)"
source "${SCRIPT_DIR}/common.sh"

TARGET_DIR="${TARGET_DIR:-${HOME:-$(pwd)}/sub2api-app}"
SUB2API_IMAGE="${SUB2API_IMAGE:-sub2api:latest}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-docker.io}"
DOCKER_USERNAME="${DOCKER_USERNAME:-}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-}"
DOCKER_NAMESPACE="${DOCKER_NAMESPACE:-}"
DOCKER_REPOSITORY="${DOCKER_REPOSITORY:-sub2api}"
BIND_HOST="${BIND_HOST:-0.0.0.0}"
SERVER_PORT="${SERVER_PORT:-8080}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@sub2api.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
JWT_SECRET="${JWT_SECRET:-}"
TOTP_ENCRYPTION_KEY="${TOTP_ENCRYPTION_KEY:-}"

DATABASE_HOST="${DATABASE_HOST:-}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USER="${DATABASE_USER:-sub2api}"
DATABASE_PASSWORD="${DATABASE_PASSWORD:-}"
DATABASE_DBNAME="${DATABASE_DBNAME:-sub2api}"
DATABASE_SSLMODE="${DATABASE_SSLMODE:-disable}"

REDIS_HOST="${REDIS_HOST:-}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_DB="${REDIS_DB:-0}"

TZ_VALUE="${TZ:-Asia/Shanghai}"
ASSUME_YES=0
FORCE=0
START=1
PULL=1
BUILD=0
INSTALL_DOCKER=0

usage() {
    cat <<'EOF'
Sub2API 应用节点准备脚本

用法:
  ./scripts/prepare-app.sh [options]

参数:
  --dir DIR                         部署目录，默认 ~/sub2api-app
  --image IMAGE                     Sub2API 镜像，例如 crpi-.../lincanvas/sub2api:latest
  --bind-host HOST                  Web 监听地址，默认 0.0.0.0
  --server-port PORT                Web 端口，默认 8080
  --database-host HOST              PostgreSQL 机器内网 IP 或域名
  --database-port PORT              默认 5432
  --database-user USER              默认 sub2api
  --database-password PASSWORD      PostgreSQL 密码
  --database-dbname DB              默认 sub2api
  --redis-host HOST                 Redis 机器内网 IP 或域名
  --redis-port PORT                 默认 6379
  --redis-password PASSWORD         Redis 密码
  --admin-email EMAIL               管理员邮箱
  --admin-password PASSWORD         管理员初始密码，留空自动生成
  --jwt-secret SECRET               留空自动生成
  --totp-encryption-key KEY         留空自动生成
  --install-docker                  空 Linux/macOS 上尝试安装 Docker
  --build                           强制使用当前仓库 Dockerfile 构建镜像（不推荐在应用机使用）
  --no-build                        不构建镜像，直接使用 --image 指定镜像（默认）
  --no-pull                         不拉镜像
  --no-start                        只生成文件不启动
  --yes, -y                         非交互模式
  --force                           覆盖已有 .env
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --dir) TARGET_DIR="$2"; shift 2 ;;
        --image) SUB2API_IMAGE="$2"; shift 2 ;;
        --docker-registry) DOCKER_REGISTRY="$2"; shift 2 ;;
        --docker-username) DOCKER_USERNAME="$2"; shift 2 ;;
        --docker-password|--docker-token) DOCKER_PASSWORD="$2"; shift 2 ;;
        --namespace|--docker-namespace) DOCKER_NAMESPACE="$2"; shift 2 ;;
        --repository) DOCKER_REPOSITORY="$2"; shift 2 ;;
        --bind-host) BIND_HOST="$2"; shift 2 ;;
        --server-port) SERVER_PORT="$2"; shift 2 ;;
        --database-host) DATABASE_HOST="$2"; shift 2 ;;
        --database-port) DATABASE_PORT="$2"; shift 2 ;;
        --database-user) DATABASE_USER="$2"; shift 2 ;;
        --database-password) DATABASE_PASSWORD="$2"; shift 2 ;;
        --database-dbname) DATABASE_DBNAME="$2"; shift 2 ;;
        --redis-host) REDIS_HOST="$2"; shift 2 ;;
        --redis-port) REDIS_PORT="$2"; shift 2 ;;
        --redis-password) REDIS_PASSWORD="$2"; shift 2 ;;
        --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
        --admin-password) ADMIN_PASSWORD="$2"; shift 2 ;;
        --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
        --totp-encryption-key) TOTP_ENCRYPTION_KEY="$2"; shift 2 ;;
        --install-docker) INSTALL_DOCKER=1; shift ;;
        --build) BUILD=1; shift ;;
        --no-build) BUILD=0; shift ;;
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
    SUB2API_IMAGE="$(prompt_value "$ASSUME_YES" "Sub2API 镜像" "$SUB2API_IMAGE")"
    BIND_HOST="$(prompt_value "$ASSUME_YES" "Web 监听地址" "$BIND_HOST")"
    SERVER_PORT="$(prompt_value "$ASSUME_YES" "Web 端口" "$SERVER_PORT")"
    DATABASE_HOST="$(prompt_value "$ASSUME_YES" "PostgreSQL 地址" "$DATABASE_HOST")"
    DATABASE_PORT="$(prompt_value "$ASSUME_YES" "PostgreSQL 端口" "$DATABASE_PORT")"
    DATABASE_USER="$(prompt_value "$ASSUME_YES" "PostgreSQL 用户" "$DATABASE_USER")"
    DATABASE_PASSWORD="$(prompt_secret "$ASSUME_YES" "PostgreSQL 密码" "$DATABASE_PASSWORD")"
    DATABASE_DBNAME="$(prompt_value "$ASSUME_YES" "PostgreSQL 数据库" "$DATABASE_DBNAME")"
    REDIS_HOST="$(prompt_value "$ASSUME_YES" "Redis 地址" "$REDIS_HOST")"
    REDIS_PORT="$(prompt_value "$ASSUME_YES" "Redis 端口" "$REDIS_PORT")"
    REDIS_PASSWORD="$(prompt_secret "$ASSUME_YES" "Redis 密码" "$REDIS_PASSWORD")"
    ADMIN_EMAIL="$(prompt_value "$ASSUME_YES" "管理员邮箱" "$ADMIN_EMAIL")"
    ADMIN_PASSWORD="$(prompt_secret "$ASSUME_YES" "管理员密码" "$ADMIN_PASSWORD")"
fi

if [ "$SUB2API_IMAGE" = "sub2api:latest" ] && { [ -n "$DOCKER_NAMESPACE" ] || [ -n "$DOCKER_USERNAME" ]; }; then
    IMAGE_NAMESPACE="${DOCKER_NAMESPACE:-$DOCKER_USERNAME}"
    SUB2API_IMAGE="${DOCKER_REGISTRY}/${IMAGE_NAMESPACE}/${DOCKER_REPOSITORY}:latest"
    print_info "未显式指定 --image，使用私有镜像默认值: $SUB2API_IMAGE"
fi

if ! validate_port "$SERVER_PORT"; then print_error "Web 端口无效: $SERVER_PORT"; exit 1; fi
if ! validate_port "$DATABASE_PORT"; then print_error "PostgreSQL 端口无效: $DATABASE_PORT"; exit 1; fi
if ! validate_port "$REDIS_PORT"; then print_error "Redis 端口无效: $REDIS_PORT"; exit 1; fi
if [ -z "$DATABASE_HOST" ]; then print_error "缺少 --database-host"; exit 1; fi
if [ -z "$DATABASE_PASSWORD" ]; then print_error "缺少 --database-password"; exit 1; fi
if [ -z "$REDIS_HOST" ]; then print_error "缺少 --redis-host"; exit 1; fi
if [ -z "$REDIS_PASSWORD" ]; then print_error "缺少 --redis-password"; exit 1; fi

need_cmd openssl
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(generate_password)}"
JWT_SECRET="${JWT_SECRET:-$(generate_secret)}"
TOTP_ENCRYPTION_KEY="${TOTP_ENCRYPTION_KEY:-$(generate_secret)}"

if [ "$START" -eq 1 ] || [ "$PULL" -eq 1 ] || [ "$BUILD" = "1" ]; then
    ensure_docker "$INSTALL_DOCKER"
    docker_login_if_needed "$DOCKER_REGISTRY" "$DOCKER_USERNAME" "$DOCKER_PASSWORD"
fi

SHOULD_BUILD=0
if [ "$BUILD" = "1" ]; then
    SHOULD_BUILD=1
fi

if [ "$SHOULD_BUILD" -eq 1 ]; then
    if [ ! -f "$REPO_ROOT/Dockerfile" ]; then
        print_error "未找到仓库 Dockerfile: $REPO_ROOT/Dockerfile"
        exit 1
    fi
    print_info "正在用当前源码构建 Sub2API 镜像: $SUB2API_IMAGE"
    docker build -t "$SUB2API_IMAGE" -f "$REPO_ROOT/Dockerfile" "$REPO_ROOT"
fi

mkdir -p "$TARGET_DIR"
copy_template "$STACK_DIR/compose/app.yml" "$TARGET_DIR"
ENV_FILE="$TARGET_DIR/.env"
check_overwrite_env "$ENV_FILE" "$FORCE"
: > "$ENV_FILE"
write_env_line "$ENV_FILE" SUB2API_IMAGE "$SUB2API_IMAGE"
write_env_line "$ENV_FILE" SUB2API_CONTAINER_NAME "sub2api"
write_env_line "$ENV_FILE" BIND_HOST "$BIND_HOST"
write_env_line "$ENV_FILE" SERVER_PORT "$SERVER_PORT"
write_env_line "$ENV_FILE" SERVER_MODE "release"
write_env_line "$ENV_FILE" RUN_MODE "standard"
write_env_line "$ENV_FILE" TZ "$TZ_VALUE"
write_env_line "$ENV_FILE" DATABASE_HOST "$DATABASE_HOST"
write_env_line "$ENV_FILE" DATABASE_PORT "$DATABASE_PORT"
write_env_line "$ENV_FILE" DATABASE_USER "$DATABASE_USER"
write_env_line "$ENV_FILE" DATABASE_PASSWORD "$DATABASE_PASSWORD"
write_env_line "$ENV_FILE" DATABASE_DBNAME "$DATABASE_DBNAME"
write_env_line "$ENV_FILE" DATABASE_SSLMODE "$DATABASE_SSLMODE"
write_env_line "$ENV_FILE" DATABASE_MAX_OPEN_CONNS "50"
write_env_line "$ENV_FILE" DATABASE_MAX_IDLE_CONNS "10"
write_env_line "$ENV_FILE" DATABASE_CONN_MAX_LIFETIME_MINUTES "30"
write_env_line "$ENV_FILE" DATABASE_CONN_MAX_IDLE_TIME_MINUTES "5"
write_env_line "$ENV_FILE" REDIS_MODE "standalone"
write_env_line "$ENV_FILE" REDIS_ADDRS ""
write_env_line "$ENV_FILE" REDIS_HOST "$REDIS_HOST"
write_env_line "$ENV_FILE" REDIS_PORT "$REDIS_PORT"
write_env_line "$ENV_FILE" REDIS_PASSWORD "$REDIS_PASSWORD"
write_env_line "$ENV_FILE" REDIS_DB "$REDIS_DB"
write_env_line "$ENV_FILE" REDIS_POOL_SIZE "1024"
write_env_line "$ENV_FILE" REDIS_MIN_IDLE_CONNS "10"
write_env_line "$ENV_FILE" REDIS_ENABLE_TLS "false"
write_env_line "$ENV_FILE" REDIS_TLS_SERVER_NAME ""
write_env_line "$ENV_FILE" ADMIN_EMAIL "$ADMIN_EMAIL"
write_env_line "$ENV_FILE" ADMIN_PASSWORD "$ADMIN_PASSWORD"
write_env_line "$ENV_FILE" JWT_SECRET "$JWT_SECRET"
write_env_line "$ENV_FILE" JWT_EXPIRE_HOUR "24"
write_env_line "$ENV_FILE" TOTP_ENCRYPTION_KEY "$TOTP_ENCRYPTION_KEY"
write_env_line "$ENV_FILE" LOG_LEVEL "info"
write_env_line "$ENV_FILE" LOG_FORMAT "json"
write_env_line "$ENV_FILE" UPDATE_PROXY_URL ""
write_env_line "$ENV_FILE" SECURITY_URL_ALLOWLIST_ENABLED "false"
write_env_line "$ENV_FILE" SECURITY_URL_ALLOWLIST_ALLOW_INSECURE_HTTP "false"
write_env_line "$ENV_FILE" SECURITY_URL_ALLOWLIST_ALLOW_PRIVATE_HOSTS "false"
write_env_line "$ENV_FILE" SECURITY_URL_ALLOWLIST_UPSTREAM_HOSTS ""
chmod 600 "$ENV_FILE"

if [ "$PULL" -eq 1 ] && [ "$SHOULD_BUILD" -ne 1 ]; then
    if image_exists "$SUB2API_IMAGE"; then
        print_info "本地已存在镜像 ${SUB2API_IMAGE}，跳过拉取"
    else
        (cd "$TARGET_DIR" && compose --env-file .env pull || true)
    fi
fi
if [ "$START" -eq 1 ]; then
    (cd "$TARGET_DIR" && compose --env-file .env up -d)
fi

print_success "Sub2API 应用节点已准备完成: $TARGET_DIR"
echo "管理员账号:"
echo "  ADMIN_EMAIL=$ADMIN_EMAIL"
echo "  ADMIN_PASSWORD=$ADMIN_PASSWORD"
echo "访问地址:"
echo "  http://<应用机器IP>:$SERVER_PORT"
