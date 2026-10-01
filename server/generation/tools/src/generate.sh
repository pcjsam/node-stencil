#!/usr/bin/env bash
# Runs the generator CLI from tools/ (builds it first if missing).
# AI should use this, not the GUI.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="$(cd "$SRC_DIR/.." && pwd)"

cli_path() {
  if [[ -f "$TOOLS_DIR/code-generator-cli.exe" ]]; then
    echo "$TOOLS_DIR/code-generator-cli.exe"
  elif [[ -f "$TOOLS_DIR/code-generator-cli" ]]; then
    echo "$TOOLS_DIR/code-generator-cli"
  fi
}

CLI="$(cli_path)"
if [[ -z "$CLI" ]]; then
  echo "Generator CLI not found - building once (this needs the .NET SDK)..."
  "$SRC_DIR/build.sh"
  CLI="$(cli_path)"
fi
if [[ -z "$CLI" ]]; then
  echo "Build finished but CLI is still missing in $TOOLS_DIR" >&2
  exit 1
fi

cd "$TOOLS_DIR"
exec "$CLI" "$@"
