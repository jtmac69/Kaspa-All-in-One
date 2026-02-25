#!/usr/bin/env bash
# test-install-verification.sh — Automated Linux installation verification
# Validates wizard and dashboard services without modifying system state.
# Usage: bash test-install-verification.sh
# Exit 0 = all checks pass, exit 1 = one or more failures

set -euo pipefail

# ─── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ─── State ──────────────────────────────────────────────────────────────────
PASS_COUNT=0
FAIL_COUNT=0
declare -a RESULTS=()
WIZARD_PID=""
DASHBOARD_PID=""
DASHBOARD_WAS_RUNNING=false
RESP_FILE="$(mktemp)"
WIZARD_LOG="/tmp/kaspa-wizard-test.log"
DASHBOARD_LOG="/tmp/kaspa-dashboard-test.log"

# ─── Cleanup ─────────────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "$WIZARD_PID" ]]; then
    kill "$WIZARD_PID" 2>/dev/null && echo -e "\n${CYAN}[cleanup]${RESET} Wizard (PID $WIZARD_PID) stopped." || true
  fi
  if [[ -n "$DASHBOARD_PID" ]] && ! $DASHBOARD_WAS_RUNNING; then
    kill "$DASHBOARD_PID" 2>/dev/null && echo -e "${CYAN}[cleanup]${RESET} Dashboard (PID $DASHBOARD_PID) stopped." || true
  fi
  rm -f "$RESP_FILE"
}
trap cleanup EXIT INT TERM

# ─── Helpers ────────────────────────────────────────────────────────────────
record() {
  local label="$1" result="$2" detail="${3:-}"
  if [[ "$result" == "PASS" ]]; then
    RESULTS+=("${GREEN}PASS${RESET}  $label")
    (( PASS_COUNT++ )) || true
  else
    RESULTS+=("${RED}FAIL${RESET}  $label${detail:+  ($detail)}")
    (( FAIL_COUNT++ )) || true
  fi
}

check_http() {
  # check_http LABEL URL [expected_body_pattern]
  local label="$1" url="$2" body_check="${3:-}"
  local http_code body

  # Use -s (silent) without -f so curl exits 0 on 4xx/5xx and -w still prints the code
  http_code=$(curl -s -o "$RESP_FILE" -w "%{http_code}" --max-time 5 "$url" 2>/dev/null)
  [[ -z "$http_code" ]] && http_code="000"
  body=$(cat "$RESP_FILE" 2>/dev/null || true)

  if [[ "$http_code" != "200" ]]; then
    record "$label" "FAIL" "HTTP $http_code from $url"
    return
  fi

  if [[ -n "$body_check" ]] && ! echo "$body" | grep -qE "$body_check"; then
    record "$label" "FAIL" "missing pattern '$body_check' in response"
    return
  fi

  record "$label" "PASS"
}

wait_for_port() {
  # wait_for_port URL retries
  local url="$1" retries="${2:-15}" pid="${3:-}"
  for i in $(seq 1 "$retries"); do
    sleep 1
    if curl -s --max-time 2 "$url" -o /dev/null 2>/dev/null; then
      return 0
    fi
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      return 2  # process died
    fi
    printf "."
  done
  return 1
}

section() {
  echo -e "\n${BOLD}${CYAN}── $1 ──${RESET}"
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ─── Header ─────────────────────────────────────────────────────────────────
echo -e "${BOLD}Kaspa AIO — Installation Verification Test${RESET}"
echo -e "$(date '+%Y-%m-%d %H:%M:%S')\n"

# ════════════════════════════════════════════════════════════════════════════
section "Phase 0: Prerequisites"
# ════════════════════════════════════════════════════════════════════════════

# Node.js >= 18
node_ver=$(node --version 2>/dev/null | sed 's/v//' || echo "0.0.0")
node_major=$(echo "$node_ver" | cut -d. -f1)
if (( node_major >= 18 )); then
  record "Node.js >= 18 (found v$node_ver)" "PASS"
else
  record "Node.js >= 18" "FAIL" "found v$node_ver"
fi

# Docker daemon
if docker info &>/dev/null; then
  record "Docker daemon running" "PASS"
else
  record "Docker daemon running" "FAIL" "docker info failed"
fi

# Docker Compose v2
if docker compose version &>/dev/null; then
  record "Docker Compose v2 present" "PASS"
else
  record "Docker Compose v2 present" "FAIL"
fi

# Port availability / pre-running state
if curl -s --max-time 3 http://localhost:8080/health -o /dev/null 2>/dev/null; then
  DASHBOARD_WAS_RUNNING=true
  record "Dashboard already running on :8080" "PASS"
  echo -e "${CYAN}[info]${RESET} Dashboard already running — will not kill on exit."
else
  if fuser 8080/tcp &>/dev/null 2>&1; then
    record "Port 8080 available for dashboard" "FAIL" "port in use by non-responding process"
  else
    record "Port 8080 available for dashboard" "PASS"
  fi
fi

WIZARD_WAS_RUNNING=false
if curl -s --max-time 3 http://localhost:3000/api/health -o /dev/null 2>/dev/null; then
  WIZARD_WAS_RUNNING=true
  record "Wizard already running on :3000" "PASS"
  echo -e "${CYAN}[info]${RESET} Wizard already running — will not kill on exit."
elif fuser 3000/tcp &>/dev/null 2>&1; then
  record "Port 3000 available for wizard" "FAIL" "port in use by non-responding process"
else
  record "Port 3000 available for wizard" "PASS"
fi

# ════════════════════════════════════════════════════════════════════════════
section "Phase 1: Start services"
# ════════════════════════════════════════════════════════════════════════════

# --- Dashboard ---
if ! $DASHBOARD_WAS_RUNNING; then
  DASHBOARD_DIR="$REPO_ROOT/services/dashboard"
  if [[ ! -d "$DASHBOARD_DIR/node_modules" ]]; then
    echo -e "${YELLOW}[warn]${RESET} dashboard node_modules missing — running npm install..."
    (cd "$DASHBOARD_DIR" && npm install --silent)
  fi
  echo -e "${CYAN}[info]${RESET} Starting dashboard (log: $DASHBOARD_LOG)..."
  (cd "$DASHBOARD_DIR" && node server.js > "$DASHBOARD_LOG" 2>&1) &
  DASHBOARD_PID=$!

  wait_for_port "http://localhost:8080/health" 15 "$DASHBOARD_PID"
  dash_rc=$?; echo ""

  if [[ $dash_rc -eq 0 ]]; then
    record "Dashboard started on :8080" "PASS"
  elif [[ $dash_rc -eq 2 ]]; then
    record "Dashboard started on :8080" "FAIL" "process died"
    echo -e "${YELLOW}[debug]${RESET} Dashboard log tail:"; tail -20 "$DASHBOARD_LOG" 2>/dev/null || true
    DASHBOARD_PID=""
  else
    record "Dashboard started on :8080" "FAIL" "did not respond within 15s"
    echo -e "${YELLOW}[debug]${RESET} Dashboard log tail:"; tail -20 "$DASHBOARD_LOG" 2>/dev/null || true
  fi
fi

# --- Wizard ---
WIZARD_UP=false
if $WIZARD_WAS_RUNNING; then
  WIZARD_UP=true
  record "Wizard reused on :3000" "PASS"
else
  WIZARD_DIR="$REPO_ROOT/services/wizard/backend"
  if [[ ! -d "$WIZARD_DIR/node_modules" ]]; then
    echo -e "${YELLOW}[warn]${RESET} wizard node_modules missing — running npm install..."
    (cd "$WIZARD_DIR" && npm install --silent)
  fi
  echo -e "${CYAN}[info]${RESET} Starting wizard (log: $WIZARD_LOG)..."
  (cd "$WIZARD_DIR" && BUILD_MODE=test node src/server.js > "$WIZARD_LOG" 2>&1) &
  WIZARD_PID=$!

  wait_for_port "http://localhost:3000/api/health" 15 "$WIZARD_PID"
  wiz_rc=$?; echo ""

  if [[ $wiz_rc -eq 0 ]]; then
    WIZARD_UP=true
    record "Wizard started on :3000" "PASS"
  elif [[ $wiz_rc -eq 2 ]]; then
    record "Wizard started on :3000" "FAIL" "process died"
    echo -e "${YELLOW}[debug]${RESET} Wizard log tail:"; tail -20 "$WIZARD_LOG" 2>/dev/null || true
    WIZARD_PID=""
  else
    record "Wizard started on :3000" "FAIL" "did not respond within 15s"
    echo -e "${YELLOW}[debug]${RESET} Wizard log tail:"; tail -20 "$WIZARD_LOG" 2>/dev/null || true
  fi
fi

# ════════════════════════════════════════════════════════════════════════════
section "Phase 2: Dashboard API (port 8080)"
# ════════════════════════════════════════════════════════════════════════════

DASH_UP=false
if $DASHBOARD_WAS_RUNNING || { [[ -n "$DASHBOARD_PID" ]] && kill -0 "$DASHBOARD_PID" 2>/dev/null; }; then
  DASH_UP=true
fi

if $DASH_UP; then
  check_http "GET /health"                  "http://localhost:8080/health"              "ok|status|healthy"
  check_http "GET /api/status"              "http://localhost:8080/api/status"
  check_http "GET /api/updates/available"   "http://localhost:8080/api/updates/available"
  check_http "GET /api/system/resources"    "http://localhost:8080/api/system/resources"
else
  for label in "GET /health" "GET /api/status" "GET /api/updates/available" "GET /api/system/resources"; do
    record "$label" "FAIL" "dashboard not running — skipped"
  done
fi

# ════════════════════════════════════════════════════════════════════════════
section "Phase 3: Wizard API (port 3000)"
# ════════════════════════════════════════════════════════════════════════════

if $WIZARD_UP; then
  check_http "GET /api/health"                            "http://localhost:3000/api/health"                        '"ok"'
  check_http "GET /api/system-check?ports=16110,16111"    "http://localhost:3000/api/system-check?ports=16110,16111" "docker|ports|resources"
  check_http "GET /api/system-check/resources"            "http://localhost:3000/api/system-check/resources"        "memory|cpu|disk"
  check_http "GET /api/resource-check"                    "http://localhost:3000/api/resource-check"
  check_http "GET /api/simple-templates/all"              "http://localhost:3000/api/simple-templates/all"
  check_http "GET /api/wizard/profiles/state"             "http://localhost:3000/api/wizard/profiles/state"

  # POST validate
  http_code=$(curl -sf -o "$RESP_FILE" -w "%{http_code}" --max-time 5 \
    -X POST -H "Content-Type: application/json" -d '{}' \
    "http://localhost:3000/api/simple-templates/quick-start/validate" 2>/dev/null || echo "000")
  if [[ "$http_code" == "200" ]]; then
    record "POST /api/simple-templates/quick-start/validate" "PASS"
  else
    record "POST /api/simple-templates/quick-start/validate" "FAIL" "HTTP $http_code"
  fi
else
  for label in \
    "GET /api/health" \
    "GET /api/system-check?ports=16110,16111" \
    "GET /api/system-check/resources" \
    "GET /api/resource-check" \
    "GET /api/simple-templates/all" \
    "POST /api/simple-templates/quick-start/validate" \
    "GET /api/wizard/profiles/state"; do
    record "$label" "FAIL" "wizard not running — skipped"
  done
fi

# ════════════════════════════════════════════════════════════════════════════
section "Phase 4: Cleanup"
# ════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}[info]${RESET} Cleanup will run on exit (trap)."

# ════════════════════════════════════════════════════════════════════════════
section "Results"
# ════════════════════════════════════════════════════════════════════════════

TOTAL=$(( PASS_COUNT + FAIL_COUNT ))
echo ""
for r in "${RESULTS[@]}"; do
  echo -e "  $r"
done
echo ""
echo -e "  ${BOLD}Total: $TOTAL  ${GREEN}Pass: $PASS_COUNT${RESET}  ${RED}Fail: $FAIL_COUNT${RESET}"
echo ""

if (( FAIL_COUNT == 0 )); then
  echo -e "${GREEN}${BOLD}All checks passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}$FAIL_COUNT check(s) failed.${RESET}"
  exit 1
fi
