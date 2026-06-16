#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)

usage() {
    cat <<'EOF'
Sub2API 发布阶段入口

用法:
  sh deploy/distributed-stack/deploy.sh postgres [options]
  sh deploy/distributed-stack/deploy.sh redis [options]
  sh deploy/distributed-stack/deploy.sh app [options]
  sh deploy/distributed-stack/deploy.sh admin-password [options]
  sh deploy/distributed-stack/deploy.sh doctor [options]
EOF
}

if [ "$#" -lt 1 ]; then
    usage
    exit 1
fi

ROLE=$1
shift

case "$ROLE" in
    postgres|pg)
        exec bash "$SCRIPT_DIR/scripts/prepare-postgres.sh" "$@"
        ;;
    redis)
        exec bash "$SCRIPT_DIR/scripts/prepare-redis.sh" "$@"
        ;;
    app|sub2api)
        exec bash "$SCRIPT_DIR/scripts/prepare-app.sh" "$@"
        ;;
    admin-password|reset-admin-password|password)
        exec bash "$SCRIPT_DIR/scripts/reset-admin-password.sh" "$@"
        ;;
    doctor|check)
        exec bash "$SCRIPT_DIR/scripts/doctor.sh" "$@"
        ;;
    --help|-h|help)
        usage
        ;;
    *)
        echo "未知发布角色: $ROLE" >&2
        usage
        exit 1
        ;;
esac
