#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_URL="http://127.0.0.1:5173"
BACKEND_URL="http://127.0.0.1:8000"
BACKEND_PID=""
FRONTEND_PID=""

say() { printf '\n[SecureCampus] %s\n' "$*"; }
fail() { printf '\n[SecureCampus] ERROR: %s\n' "$*" >&2; exit 1; }

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  exit "$exit_code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

install_runtimes() {
  local missing=()
  if ! command -v node >/dev/null 2>&1 || ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22) ? 0 : 1)'; then
    missing+=(node)
  fi
  command -v npm >/dev/null 2>&1 || missing+=(npm)
  if ! command -v python3 >/dev/null 2>&1 || ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'; then
    missing+=(python3)
  fi

  if ((${#missing[@]} == 0)); then
    return
  fi

  say "Installing missing system runtimes: ${missing[*]}"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v brew >/dev/null 2>&1; then
    brew install node python@3.12
  elif command -v apt-get >/dev/null 2>&1; then
    if [[ "$(id -u)" == "0" ]]; then
      apt-get update
      apt-get install -y nodejs npm python3 python3-venv curl
    elif command -v sudo >/dev/null 2>&1; then
      sudo apt-get update
      sudo apt-get install -y nodejs npm python3 python3-venv curl
    else
      fail "System packages are missing (${missing[*]}), and neither root nor sudo is available for apt installation."
    fi
  else
    fail "System packages are missing (${missing[*]}). Install Node.js 20.19+ (or 22.12+) and Python 3.10+ and rerun ./run.sh."
  fi
}

http_code() {
  curl --silent --show-error --max-time 2 --output /dev/null --write-out '%{http_code}' "$1" 2>/dev/null || true
}

backend_healthy() {
  local response
  response="$(curl --silent --max-time 2 "$BACKEND_URL/health" 2>/dev/null || true)"
  [[ "$response" == *'"status":"ok"'* && "$response" == *'"securityMode":"on"'* ]]
}

frontend_healthy() {
  local response
  response="$(curl --silent --max-time 2 "$FRONTEND_URL/" 2>/dev/null || true)"
  [[ "$response" == *'id="root"'* ]]
}

wait_for_service() {
  local name="$1" url="$2" pid="$3" check_function="$4"
  local attempt code
  for attempt in {1..45}; do
    if "$check_function"; then
      say "$name is ready at $url"
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      fail "$name stopped while starting. Review the error output above."
    fi
    sleep 1
  done
  code="$(http_code "$url")"
  if [[ "$code" != "000" ]]; then
    fail "$name returned HTTP $code at $url instead of becoming ready. Another process may be using that port."
  fi
  fail "$name did not become ready at $url within 45 seconds."
}

requirements_satisfied() {
  "$1" - "$2" <<'PY'
import sys
from importlib.metadata import PackageNotFoundError, version
from packaging.requirements import Requirement

requirements_path = sys.argv[1]
for raw_line in open(requirements_path, encoding="utf-8"):
    line = raw_line.strip()
    if not line or line.startswith("#"):
        continue
    requirement = Requirement(line)
    try:
        installed = version(requirement.name)
    except PackageNotFoundError:
        sys.exit(1)
    if requirement.specifier and not requirement.specifier.contains(installed, prereleases=True):
        sys.exit(1)
PY
}

cd "$ROOT_DIR"
install_runtimes

command -v curl >/dev/null 2>&1 || fail "curl is required to check local services. Install curl and rerun ./run.sh."

NODE_VERSION="$(node -p 'process.versions.node')"
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22) ? 0 : 1)' \
  || fail "Node.js $NODE_VERSION is too old for Vite 8. Install Node.js 20.19+ or 22.12+ and rerun ./run.sh."

PYTHON="$(command -v python3)"
"$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' \
  || fail "Python 3.10 or newer is required. Install it and rerun ./run.sh."

if [[ ! -x "$ROOT_DIR/backend/.venv/bin/python" ]]; then
  say "Creating the backend virtual environment"
  "$PYTHON" -m venv "$ROOT_DIR/backend/.venv"
fi
VENV_PYTHON="$ROOT_DIR/backend/.venv/bin/python"

if ! "$VENV_PYTHON" -c 'import fastapi, uvicorn, bcrypt, passlib, pydantic, pydantic_settings, multipart, slowapi, cryptography, dotenv' >/dev/null 2>&1 \
  || ! "$VENV_PYTHON" -m pip check >/dev/null 2>&1 \
  || ! requirements_satisfied "$VENV_PYTHON" "$ROOT_DIR/backend/requirements.txt"; then
  say "Installing backend dependencies"
  "$VENV_PYTHON" -m pip install --no-cache-dir -r "$ROOT_DIR/backend/requirements.txt"
fi

if [[ ! -x "$ROOT_DIR/frontend/node_modules/.bin/vite" ]] || ! (cd "$ROOT_DIR/frontend" && npm ls --depth=0 >/dev/null 2>&1); then
  say "Installing frontend dependencies"
  (cd "$ROOT_DIR/frontend" && npm ci --ignore-scripts --no-audit --no-fund --cache "$ROOT_DIR/.npm-cache")
fi

if backend_healthy; then
  say "Backend is already running at $BACKEND_URL (Security ON)"
else
  code="$(http_code "$BACKEND_URL/health")"
  [[ "$code" == "000" ]] || fail "Port 8000 is responding, but it is not a healthy SecureCampus backend in Security ON mode. Stop that process and rerun ./run.sh."
  say "Starting backend on localhost:8000 (Security ON)"
  (cd "$ROOT_DIR/backend" && exec env SECURITY_MODE=on .venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000) &
  BACKEND_PID=$!
  wait_for_service "Backend" "$BACKEND_URL" "$BACKEND_PID" backend_healthy
fi

if frontend_healthy; then
  say "Frontend is already running at $FRONTEND_URL"
else
  code="$(http_code "$FRONTEND_URL/")"
  [[ "$code" == "000" ]] || fail "Port 5173 is responding, but it is not the SecureCampus frontend. Stop that process and rerun ./run.sh."
  say "Starting frontend on localhost:5173"
  (cd "$ROOT_DIR/frontend" && exec ./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort) &
  FRONTEND_PID=$!
  wait_for_service "Frontend" "$FRONTEND_URL" "$FRONTEND_PID" frontend_healthy
fi

say "Application is ready"
printf '  Frontend: %s\n  Backend:  %s\n  API docs: %s/api/docs\n' "$FRONTEND_URL" "$BACKEND_URL" "$BACKEND_URL"

if [[ -n "$BACKEND_PID" || -n "$FRONTEND_PID" ]]; then
  say "Press Ctrl+C to stop the services started by this command."
  while true; do
    if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      fail "Backend exited unexpectedly."
    fi
    if [[ -n "$FRONTEND_PID" ]] && ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      fail "Frontend exited unexpectedly."
    fi
    sleep 2
  done
fi
