#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $*"; }
print_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

has_tty() {
    [ -e /dev/tty ] && [ -r /dev/tty ] && [ -w /dev/tty ]
}

prompt_value() {
    local assume_yes="$1"
    local label="$2"
    local default_value="$3"
    local value
    if [ "$assume_yes" -eq 1 ] || ! has_tty; then
        printf '%s' "$default_value"
        return
    fi
    read -r -p "$label [$default_value]: " value < /dev/tty
    printf '%s' "${value:-$default_value}"
}

prompt_secret() {
    local assume_yes="$1"
    local label="$2"
    local default_value="$3"
    local empty_hint="${4:-留空自动生成}"
    local value
    if [ "$assume_yes" -eq 1 ] || ! has_tty; then
        printf '%s' "$default_value"
        return
    fi
    if [ -n "$default_value" ]; then
        read -r -s -p "$label [已设置，回车保持]: " value < /dev/tty
    else
        read -r -s -p "$label [$empty_hint]: " value < /dev/tty
    fi
    echo > /dev/tty
    printf '%s' "${value:-$default_value}"
}

need_cmd() {
    if ! command -v "$1" >/dev/null 2>&1; then
        print_error "缺少命令: $1"
        exit 1
    fi
}

run_as_root() {
    if [ "$(id -u)" -eq 0 ]; then
        "$@"
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$@"
    else
        print_error "需要 root 权限执行: $*"
        exit 1
    fi
}

install_docker_linux() {
    need_cmd curl
    print_info "正在安装 Docker..."
    curl -fsSL https://get.docker.com -o /tmp/sub2api-get-docker.sh
    run_as_root sh /tmp/sub2api-get-docker.sh
    if command -v systemctl >/dev/null 2>&1; then
        run_as_root systemctl enable docker >/dev/null 2>&1 || true
        run_as_root systemctl start docker >/dev/null 2>&1 || true
    fi
}

install_docker_macos() {
    if command -v brew >/dev/null 2>&1; then
        print_info "正在通过 Homebrew 安装 Docker Desktop..."
        brew install --cask docker
        print_warning "Docker Desktop 已安装，请手动打开 Docker.app 并等待 Docker daemon 启动"
        open -a Docker >/dev/null 2>&1 || true
    else
        print_error "macOS 未检测到 Docker。请安装 Docker Desktop，或先安装 Homebrew 后重试"
        exit 1
    fi
}

ensure_docker() {
    local install_docker="${1:-0}"
    if ! command -v docker >/dev/null 2>&1; then
        if [ "$install_docker" -ne 1 ]; then
            print_error "未检测到 Docker。请先安装 Docker，或加 --install-docker"
            exit 1
        fi
        case "$(uname -s)" in
            Linux) install_docker_linux ;;
            Darwin) install_docker_macos ;;
            *) print_error "当前系统不支持自动安装 Docker，请手动安装"; exit 1 ;;
        esac
    fi
    if ! docker info >/dev/null 2>&1; then
        if command -v systemctl >/dev/null 2>&1; then
            run_as_root systemctl start docker >/dev/null 2>&1 || true
        fi
    fi
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon 不可用。Linux 请检查 docker 服务和用户权限；macOS 请启动 Docker Desktop"
        exit 1
    fi
}

compose() {
    if docker compose version >/dev/null 2>&1; then
        docker compose "$@"
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose "$@"
    else
        print_error "未找到 docker compose。请安装 Docker Compose v2"
        exit 1
    fi
}

image_exists() {
    docker image inspect "$1" >/dev/null 2>&1
}

docker_login_if_needed() {
    local registry="$1"
    local username="$2"
    local password="$3"
    if [ -z "$username" ] && [ -z "$password" ]; then
        return
    fi
    if [ -z "$username" ] || [ -z "$password" ]; then
        print_error "Docker 登录需要同时提供用户名和密码/Access Token"
        exit 1
    fi
    print_info "登录 Docker Registry: $registry"
    printf '%s' "$password" | docker login "$registry" -u "$username" --password-stdin
}

generate_secret() {
    openssl rand -hex 32
}

generate_password() {
    openssl rand -hex 16
}

validate_port() {
    local port="$1"
    [[ "$port" =~ ^[0-9]+$ ]] && [ "$port" -ge 1 ] && [ "$port" -le 65535 ]
}

detect_host_ip() {
    local ip
    if command -v hostname >/dev/null 2>&1; then
        for ip in $(hostname -I 2>/dev/null || true); do
            case "$ip" in
                127.*|169.254.*|172.17.*|172.18.*|172.19.*) continue ;;
                *:*) continue ;;
                *) printf '%s' "$ip"; return ;;
            esac
        done
    fi
    if command -v ip >/dev/null 2>&1; then
        ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
        if [ -n "$ip" ]; then
            printf '%s' "$ip"
            return
        fi
    fi
    if command -v ifconfig >/dev/null 2>&1; then
        ip="$(ifconfig 2>/dev/null | awk '/inet / && $2 !~ /^127\./ && $2 !~ /^172\.1[789]\./ {print $2; exit}')"
        if [ -n "$ip" ]; then
            printf '%s' "$ip"
            return
        fi
    fi
    printf '<这台机器的内网IP>'
}

env_quote() {
    local value="$1"
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    value=${value//\$/\$\$}
    printf '"%s"' "$value"
}

write_env_line() {
    local file="$1"
    local key="$2"
    local value="$3"
    if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
        print_error "$key 不能包含换行符"
        exit 1
    fi
    printf '%s=%s\n' "$key" "$(env_quote "$value")" >> "$file"
}

copy_template() {
    local template="$1"
    local target_dir="$2"
    local target_name="${3:-docker-compose.yml}"
    mkdir -p "$target_dir"
    cp "$template" "$target_dir/$target_name"
}

check_overwrite_env() {
    local env_file="$1"
    local force="$2"
    if [ -f "$env_file" ] && [ "$force" -ne 1 ]; then
        print_error "$env_file 已存在。确认覆盖请加 --force"
        exit 1
    fi
}
