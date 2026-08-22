#!/usr/bin/env bash
set -euo pipefail

REPO="phasehumans/december"
BINARY_NAME="december"
INSTALL_DIR="${DECEMBER_INSTALL_DIR:-$HOME/.local/bin}"

# Brand Colors (#87B2F4 Brand Blue)
BLUE="\033[38;2;135;178;244m"
GREEN="\033[38;2;110;231;183m"
RED="\033[38;2;252;165;165m"
WHITE="\033[38;2;244;244;245m"
GREY="\033[38;2;161;161;170m"
TRUNK="\033[38;2;63;63;70m"
RESET="\033[0m"

log_step()  { echo -e "${BLUE}✱${RESET}  ${WHITE}$1${RESET}"; }
log_tree()  { echo -e "${TRUNK}│${RESET}  ${GREY}$1${RESET}"; }
log_space() { echo -e "${TRUNK}│${RESET}"; }
log_error() { echo -e "${BLUE}✱${RESET}  ${RED}$1${RESET}"; }

detect_target() {
    local os arch
    os="$(uname -s)"
    arch="$(uname -m)"

    case "$os" in
        Linux)
            case "$arch" in
                x86_64|amd64) echo "x86_64-unknown-linux-gnu" ;;
                aarch64|arm64) echo "aarch64-unknown-linux-gnu" ;;
                *) echo "unsupported" ;;
            esac
            ;;
        Darwin)
            case "$arch" in
                arm64) echo "aarch64-apple-darwin" ;;
                x86_64) echo "x86_64-apple-darwin" ;;
                *) echo "unsupported" ;;
            esac
            ;;
        MINGW64_NT*|MINGW32_NT*|MSYS_NT*|CYGWIN*)
            echo "windows"
            ;;
        *)
            echo "unsupported"
            ;;
    esac
}

TARGET=$(detect_target)

if [ "$TARGET" = "unsupported" ]; then
    log_error "Unsupported platform: $(uname -s) $(uname -m)"
    exit 1
fi

if [ "$TARGET" = "windows" ]; then
    log_step "detected Windows environment. Launching PowerShell installer..."
    TMP_PS1="$(mktemp "${TEMP:-/tmp}/december-install.XXXXXX.ps1")"
    curl -fsSL "https://raw.githubusercontent.com/${REPO}/main/install.ps1" -o "$TMP_PS1"
    powershell.exe -ExecutionPolicy Bypass -File "$TMP_PS1"
    rm -f "$TMP_PS1"
    exit 0
fi

case "$TARGET" in
    aarch64-apple-darwin)       DISPLAY_TARGET="macOS (Apple Silicon)" ;;
    x86_64-apple-darwin)        DISPLAY_TARGET="macOS (Intel)" ;;
    x86_64-unknown-linux-gnu)   DISPLAY_TARGET="Linux (x64)" ;;
    aarch64-unknown-linux-gnu)  DISPLAY_TARGET="Linux (arm64)" ;;
    *)                          DISPLAY_TARGET="$TARGET" ;;
esac

log_step "installing december for ${DISPLAY_TARGET}..."

VERSION="${DECEMBER_VERSION:-latest}"
ARCHIVE="december-${TARGET}.tar.gz"

if [ "$VERSION" = "latest" ]; then
    DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ARCHIVE}"
else
    DOWNLOAD_URL="https://github.com/${REPO}/releases/download/v${VERSION#v}/${ARCHIVE}"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log_tree "downloading pre-compiled release binary..."
if ! curl -fL --progress-bar "$DOWNLOAD_URL" -o "${TMP_DIR}/${ARCHIVE}"; then
    log_space
    log_error "Failed to download from ${DOWNLOAD_URL}"
    log_tree "Check https://github.com/${REPO}/releases for available versions."
    exit 1
fi

printf "\033[1A\033[2K"
log_tree "extracting binary..."
tar -xzf "${TMP_DIR}/${ARCHIVE}" -C "$TMP_DIR"

mkdir -p "$INSTALL_DIR"
mv "${TMP_DIR}/${BINARY_NAME}" "${INSTALL_DIR}/${BINARY_NAME}"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

# Clear macOS quarantine attribute if present
if [ "$(uname -s)" = "Darwin" ]; then
    xattr -d com.apple.quarantine "${INSTALL_DIR}/${BINARY_NAME}" 2>/dev/null || true
fi

log_space
log_step "${GREEN}december successfully installed${RESET} to ${WHITE}${INSTALL_DIR}/${BINARY_NAME}${RESET}"

if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
    PROFILE="~/.bashrc"
    if [ -n "${ZSH_VERSION:-}" ] || [ "$(basename "${SHELL:-}")" = "zsh" ]; then
        PROFILE="~/.zshrc"
    fi
    log_space
    log_tree "Note: ${INSTALL_DIR} is not in your current PATH."
    log_tree "Add it to your shell profile (${PROFILE}):"
    echo -e "${TRUNK}│${RESET}  ${WHITE}export PATH=\"\$PATH:${INSTALL_DIR}\"${RESET}"
fi

log_space
log_step "run ${WHITE}december${RESET} to start your session"
