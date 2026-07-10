#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${STACK_DIR}/../.." 2>/dev/null && pwd || pwd)"
source "${SCRIPT_DIR}/common.sh"

IMAGE="${IMAGE:-${DEPLOY_IMAGE:-${deployimage:-}}}"
BASE_IMAGE="${BASE_IMAGE:-}"
VERSION="${VERSION:-}"
COMMIT="${COMMIT:-}"
DATE="${DATE:-}"
TARGET_OS=linux
TARGET_ARCH=amd64
DOCKER_PLATFORM=linux/amd64
PNPM_VERSION="${PNPM_VERSION:-9.15.9}"
PNPM_BIN="${PNPM_BIN:-}"
PNPM_STORE_DIR="${PNPM_STORE_DIR:-$REPO_ROOT/.cache/pnpm-store}"
NPM_CONFIG_REGISTRY="${NPM_CONFIG_REGISTRY:-https://registry.npmmirror.com}"
INSTALL_DOCKER=0
SKIP_FRONTEND=0

usage() {
    cat <<'EOF'
Sub2API build 阶段

该阶段负责编译前端和后端，并打本地 Docker 镜像，不 push、不发布。

用法:
  export deployimage=crpi-.../lincanvas/sub2api:version-YYYYMMDDHHMMSS
  sh deploy/distributed-stack/build.sh \
    --baseimage crpi-.../lincanvas/sub2api:latest

参数:
  --image IMAGE             完整镜像名，例如 crpi-.../lincanvas/sub2api:version-YYYYMMDDHHMMSS；默认读取 deployimage 环境变量
  --baseimage IMAGE         使用已有应用镜像作为基础层，只覆盖二进制和资源
  --version VERSION         注入版本号；默认读取 backend/cmd/server/VERSION
  --commit COMMIT           注入 commit；默认使用当前 git commit，取不到则为 local
  --date DATE               注入构建时间；默认使用 UTC 当前时间
  --skip-frontend           复用已有 backend/internal/web/dist，不重新安装/编译前端
  --install-docker          空 Linux/macOS 上尝试安装 Docker
  --help, -h                显示帮助
EOF
}

resolve_pnpm() {
    if [ -n "$PNPM_BIN" ]; then
        PNPM_CMD=("$PNPM_BIN")
        return
    fi
    if command -v pnpm >/dev/null 2>&1 && pnpm --dir "$REPO_ROOT/frontend" --version >/dev/null 2>&1; then
        PNPM_CMD=(pnpm)
        return
    fi
    if command -v npm >/dev/null 2>&1; then
        print_info "未检测到可直接使用的 pnpm，改用 npm exec 调用 pnpm@$PNPM_VERSION"
        PNPM_CMD=(npm exec --yes --package "pnpm@$PNPM_VERSION" -- pnpm)
        return
    fi
    print_error "缺少 pnpm/npm。请安装 pnpm，或设置 PNPM_BIN=/path/to/pnpm"
    exit 1
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --image) IMAGE="$2"; shift 2 ;;
        --baseimage) BASE_IMAGE="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --commit) COMMIT="$2"; shift 2 ;;
        --date) DATE="$2"; shift 2 ;;
        --skip-frontend) SKIP_FRONTEND=1; shift ;;
        --install-docker) INSTALL_DOCKER=1; shift ;;
        --help|-h) usage; exit 0 ;;
        *) print_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

if [ -z "$IMAGE" ]; then
    print_error "缺少 --image 或 deployimage 环境变量"
    exit 1
fi

DOCKERFILE="$STACK_DIR/Dockerfile.runtime"
if [ -n "$BASE_IMAGE" ]; then
    DOCKERFILE="$STACK_DIR/Dockerfile.runtime-from-latest"
fi
if [ ! -f "$DOCKERFILE" ]; then
    print_error "未找到运行时 Dockerfile: $DOCKERFILE"
    exit 1
fi

need_cmd go
if [ "$SKIP_FRONTEND" -ne 1 ]; then
    need_cmd node
    resolve_pnpm
fi
ensure_docker "$INSTALL_DOCKER"

if [ -z "$VERSION" ] && [ -f "$REPO_ROOT/backend/cmd/server/VERSION" ]; then
    VERSION="$(tr -d '\r\n' < "$REPO_ROOT/backend/cmd/server/VERSION")"
fi
if [ -z "$COMMIT" ]; then
    COMMIT="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || printf 'local')"
fi
if [ -z "$DATE" ]; then
    DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

BACKEND_BINARY_REL="backend/bin/sub2api-${TARGET_OS}-${TARGET_ARCH}"
BACKEND_BINARY_ABS="$REPO_ROOT/$BACKEND_BINARY_REL"

if [ "$SKIP_FRONTEND" -eq 1 ]; then
    if [ ! -d "$REPO_ROOT/backend/internal/web/dist" ]; then
        print_error "指定 --skip-frontend，但前端 dist 不存在: $REPO_ROOT/backend/internal/web/dist"
        exit 1
    fi
    print_info "[build] 复用前端 dist: backend/internal/web/dist"
else
    print_info "[build] 安装前端依赖"
    NPM_CONFIG_REGISTRY="$NPM_CONFIG_REGISTRY" "${PNPM_CMD[@]}" --dir "$REPO_ROOT/frontend" install --frozen-lockfile --store-dir "$PNPM_STORE_DIR"

    print_info "[build] 编译前端 dist: backend/internal/web/dist"
    NPM_CONFIG_REGISTRY="$NPM_CONFIG_REGISTRY" "${PNPM_CMD[@]}" --dir "$REPO_ROOT/frontend" run build
fi

if [ ! -d "$REPO_ROOT/backend/internal/web/dist" ]; then
    print_error "前端 dist 未生成: $REPO_ROOT/backend/internal/web/dist"
    exit 1
fi

print_info "[build] 交叉编译后端 bin: $BACKEND_BINARY_REL"
print_info "VERSION=$VERSION COMMIT=$COMMIT DATE=$DATE TARGET=$TARGET_OS/$TARGET_ARCH"
mkdir -p "$REPO_ROOT/backend/bin"
(
    cd "$REPO_ROOT/backend"
    CGO_ENABLED=0 GOOS="$TARGET_OS" GOARCH="$TARGET_ARCH" go build \
        -tags embed \
        -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.Date=${DATE} -X main.BuildType=release" \
        -trimpath \
        -o "$BACKEND_BINARY_ABS" \
        ./cmd/server
)

if [ ! -s "$BACKEND_BINARY_ABS" ]; then
    print_error "后端 bin 未生成: $BACKEND_BINARY_ABS"
    exit 1
fi

print_info "[build] 打本地 Docker 镜像: ${IMAGE} (${DOCKER_PLATFORM})"
docker_build_args=(
    --platform "$DOCKER_PLATFORM"
    -t "$IMAGE"
    -f "$DOCKERFILE"
    --build-arg "BACKEND_BINARY=$BACKEND_BINARY_REL"
)
if [ -n "$BASE_IMAGE" ]; then
    docker_build_args+=(--build-arg "BASE_IMAGE=$BASE_IMAGE")
fi
docker build "${docker_build_args[@]}" "$REPO_ROOT"

print_success "build 阶段完成"
echo "  image=$IMAGE"
echo "  frontend_dist=$REPO_ROOT/backend/internal/web/dist"
echo "  backend_bin=$BACKEND_BINARY_ABS"
