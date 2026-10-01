#!/usr/bin/env bash
# Builds the Stencil code generator into the parent tools/ folder
# (next to code-generator.config.xml). CLI is for AI; GUI is Windows-only, for humans.
#
# Run from anywhere:
#   ./server/generation/tools/src/build.sh

set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="$(cd "$SRC_DIR/.." && pwd)"
CLI_PROJECT="$SRC_DIR/CodeGenerator.Cli/CodeGenerator.Cli.csproj"
GUI_PROJECT="$SRC_DIR/CodeGenerator.Gui/CodeGenerator.Gui.csproj"
CONFIGURATION="${CONFIGURATION:-Release}"
SELF_CONTAINED="${SELF_CONTAINED:-true}"

detect_rid() {
  if [[ -n "${RUNTIME:-}" ]]; then
    echo "$RUNTIME"
    return
  fi
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    armv7l) arch="arm" ;;
  esac
  case "$os" in
    Linux) echo "linux-$arch" ;;
    Darwin) echo "osx-$arch" ;;
    MINGW*|MSYS*|CYGWIN*) echo "win-$arch" ;;
    *)
      echo "Could not detect OS ($(uname -s)). Set RUNTIME=win-x64|osx-arm64|linux-x64" >&2
      exit 1
      ;;
  esac
}

require_dotnet() {
  if ! command -v dotnet >/dev/null 2>&1; then
    echo "The .NET SDK is not installed (or not on PATH)."
    echo "Install the .NET 8 SDK or newer, then re-run this script:"
    echo "  https://dotnet.microsoft.com/download/dotnet/8.0"
    exit 1
  fi
  if ! dotnet --list-sdks >/dev/null 2>&1 || [[ -z "$(dotnet --list-sdks 2>/dev/null)" ]]; then
    echo "dotnet was found but no SDK is installed (runtime-only is not enough)."
    echo "Install the .NET 8 SDK or newer:"
    echo "  https://dotnet.microsoft.com/download/dotnet/8.0"
    exit 1
  fi
}

publish() {
  local project="$1"
  local rid="$2"
  local staging="$3"
  shift 3
  local names=("$@")
  rm -rf "$staging"
  mkdir -p "$staging"
  dotnet publish "$project" \
    -c "$CONFIGURATION" \
    -r "$rid" \
    --self-contained "$SELF_CONTAINED" \
    -p:PublishSingleFile=true \
    -p:IncludeNativeLibrariesForSelfExtract=true \
    -p:EnableCompressionInSingleFile=true \
    -p:DebugType=None \
    -p:DebugSymbols=false \
    -o "$staging"
  local copied=0
  local name
  for name in "${names[@]}"; do
    if [[ -f "$staging/$name" ]]; then
      cp -f "$staging/$name" "$TOOLS_DIR/$name"
      copied=1
    fi
  done
  if [[ "$copied" -eq 0 ]]; then
    echo "Publish succeeded but none of these files were produced: ${names[*]}" >&2
    return 1
  fi
}

cli_path() {
  if [[ -f "$TOOLS_DIR/code-generator-cli.exe" ]]; then
    echo "$TOOLS_DIR/code-generator-cli.exe"
  elif [[ -f "$TOOLS_DIR/code-generator-cli" ]]; then
    echo "$TOOLS_DIR/code-generator-cli"
  fi
}

require_dotnet
RID="$(detect_rid)"

echo "Stencil code generator - build"
echo "CLI is for AI. GUI is Windows-only and is for humans exploring the generator."
echo "Configuration : $CONFIGURATION"
echo "Runtime       : $RID"
echo "Self-contained: $SELF_CONTAINED"
echo "Output        : $TOOLS_DIR"
echo

if [[ ! -f "$CLI_PROJECT" ]]; then
  echo "CLI project not found: $CLI_PROJECT" >&2
  exit 1
fi

echo "Building CLI..."
publish "$CLI_PROJECT" "$RID" "$SRC_DIR/artifacts/cli" code-generator-cli.exe code-generator-cli

CLI="$(cli_path)"
if [[ -z "$CLI" ]]; then
  echo "CLI publish succeeded but code-generator-cli was not found in $TOOLS_DIR" >&2
  exit 1
fi
chmod +x "$CLI" 2>/dev/null || true
echo "CLI built: $CLI"

if [[ "$RID" == win-* ]]; then
  echo
  echo "Building GUI for humans (Windows only)..."
  if publish "$GUI_PROJECT" "$RID" "$SRC_DIR/artifacts/gui" code-generator.exe && [[ -f "$TOOLS_DIR/code-generator.exe" ]]; then
    echo "GUI built: $TOOLS_DIR/code-generator.exe"
  else
    echo "GUI build skipped/failed. CLI is enough for AI and XML generation."
  fi
else
  echo
  echo "Skipping GUI. WinForms is Windows-only. Use the CLI on this OS."
fi

echo
echo "Cleaning leftover publish files from tools/..."
find "$TOOLS_DIR" -maxdepth 1 -type f \( \
  -name '*.pdb' -o -name '*.dll' -o -name '*.deps.json' -o -name '*.runtimeconfig.json' -o -name 'createdump' \
\) -delete 2>/dev/null || true

echo
echo "Done. tools/ should now contain the binaries and code-generator.config.xml"
echo "  AI CLI    : $(basename "$CLI")"
echo
echo "Run (no args; uses the XML config beside the exe):"
echo "  $CLI"
