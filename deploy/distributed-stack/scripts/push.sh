#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

IMAGE="${IMAGE:-${DEPLOY_IMAGE:-${deployimage:-}}}"
INSTALL_DOCKER=0

usage() {
    cat <<'EOF'
Sub2API push 阶段

该阶段只负责推送 build 阶段生成的本地镜像，不编译、不登录。
请先自行执行 docker login。

用法:
  export deployimage=crpi-.../lincanvas/sub2api:version-YYYYMMDDHHMMSS
  sh deploy/distributed-stack/push.sh

参数:
  --image IMAGE         完整镜像名，例如 crpi-.../lincanvas/sub2api:version-YYYYMMDDHHMMSS；默认读取 deployimage 环境变量
  --install-docker      空 Linux/macOS 上尝试安装 Docker
  --help, -h            显示帮助
EOF
}

while [ "$#" -gt 0 ]; do
    case "$1" in
        --image) IMAGE="$2"; shift 2 ;;
        --install-docker) INSTALL_DOCKER=1; shift ;;
        --help|-h) usage; exit 0 ;;
        *) print_error "未知参数: $1"; usage; exit 1 ;;
    esac
done

if [ -z "$IMAGE" ]; then
    print_error "缺少 --image 或 deployimage 环境变量"
    exit 1
fi

ensure_docker "$INSTALL_DOCKER"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
    print_error "本地不存在镜像: $IMAGE"
    echo "请先运行:"
    echo "  export deployimage='$IMAGE'"
    echo "  sh deploy/distributed-stack/build.sh --baseimage '<baseimage>'"
    exit 1
fi

print_info "[push] 推送镜像: $IMAGE"
docker push "$IMAGE"

print_success "push 阶段完成: $IMAGE"
