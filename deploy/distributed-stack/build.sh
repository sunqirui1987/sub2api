#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
exec bash "$SCRIPT_DIR/scripts/build.sh" "$@"
