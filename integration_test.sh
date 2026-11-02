#!/bin/bash
# integration_test.sh - Integration testing for CookieRTMPS

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="cookie-rtmps"

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}     CookieRTMPS Integration Test     ${NC}"
echo -e "${BLUE}=====================================${NC}"

echo -e "${YELLOW}Waiting 5 seconds for services to start...${NC}"
sleep 5

# 1. Check if Docker container is running
echo -n "Checking Docker container '$CONTAINER_NAME'... "
if [ "$(docker inspect -f '{{.State.Running}}' $CONTAINER_NAME 2>/dev/null)" == "true" ]; then
    echo -e "[${GREEN}PASSED${NC}]"
else
    echo -e "[${RED}FAILED${NC}]"
    echo -e "${RED}Error: Container is not running.${NC}"
    exit 1
fi

# 2. Check internal processes
check_process() {
    local proc=$1
    echo -n "Checking process '$proc' inside container... "
    if docker exec $CONTAINER_NAME pgrep -x "$proc" > /dev/null; then
        echo -e "[${GREEN}PASSED${NC}]"
        return 0
    else
        echo -e "[${RED}FAILED${NC}]"
        return 1
    fi
}

check_process "nginx"
check_process "gunicorn"

echo -n "Checking process 'stunnel' inside container... "
if docker exec $CONTAINER_NAME pgrep -x stunnel > /dev/null 2>&1 || \
   docker exec $CONTAINER_NAME pgrep -x stunnel4 > /dev/null 2>&1 || \
   docker exec $CONTAINER_NAME pgrep -f stunnel > /dev/null 2>&1; then
    echo -e "[${GREEN}PASSED${NC}]"
else
    echo -e "[${RED}FAILED${NC}]"
    echo -e "${YELLOW}Container Stunnel logs (/var/log/stunnel4/stunnel.log):${NC}"
    docker exec $CONTAINER_NAME cat /var/log/stunnel4/stunnel.log 2>/dev/null || true
fi

# 3. Check Flask Health Endpoint
echo -n "Checking Flask Validator health endpoint... "
if docker exec $CONTAINER_NAME curl -s --fail http://127.0.0.1:8082/health > /dev/null; then
    echo -e "[${GREEN}PASSED${NC}]"
else
    echo -e "[${RED}FAILED${NC}]"
fi

# 4. Disconnection Protection
echo -n "Checking Disconnection Protection controller... "
if docker exec $CONTAINER_NAME pgrep -f "stream_protection.py" > /dev/null; then
    echo -e "[${GREEN}PASSED${NC}]"
else
    echo -e "[${RED}FAILED${NC}]"
fi

NOALBS_ENABLED=$(docker exec $CONTAINER_NAME printenv NOALBS_ENABLED 2>/dev/null || echo "false")
if [ "$NOALBS_ENABLED" == "true" ]; then
    echo -e "Checking backup video server (MediaMTX Disconnection Protection)..."
    READY=0
    BAR_WIDTH=32
    for i in $(seq 1 45); do
        if docker exec $CONTAINER_NAME curl -s --fail http://127.0.0.1:9997/v3/paths/list > /dev/null 2>&1; then
            READY=1
            BAR_STR=$(printf "%${BAR_WIDTH}s" | tr ' ' '=')
            printf "\r  [${GREEN}%s${NC}] 100%% [MediaMTX Active & Ready] [${GREEN}PASSED${NC}]\n" "$BAR_STR"
            break
        fi

        PREP_STATUS=$(docker exec $CONTAINER_NAME cat /tmp/stream_prep_status.json 2>/dev/null || true)
        PERCENT=0
        STAGE="Initializing MediaMTX..."
        if [ -n "$PREP_STATUS" ]; then
            PERCENT=$(echo "$PREP_STATUS" | grep -oP '(?<="percent":\s?)\d+' 2>/dev/null || echo "0")
            STAGE=$(echo "$PREP_STATUS" | grep -oP '(?<="stage":\s?")[^"]+' 2>/dev/null || echo "Preparing backup video...")
        fi

        PERCENT=${PERCENT:-0}
        if [ "$PERCENT" -le 0 ]; then
            PERCENT=$(( (i * 90) / 45 ))
            if [ "$PERCENT" -gt 90 ]; then PERCENT=90; fi
        fi

        FILLED=$(( (PERCENT * BAR_WIDTH) / 100 ))
        EMPTY=$(( BAR_WIDTH - FILLED ))

        BAR_STR=""
        if [ $FILLED -gt 0 ]; then
            BAR_STR=$(printf "%${FILLED}s" | tr ' ' '=')
        fi
        EMPTY_STR=""
        if [ $EMPTY -gt 0 ]; then
            EMPTY_STR=$(printf "%${EMPTY}s" | tr ' ' ' ')
        fi

        printf "\r  [${YELLOW}%s${NC}%s] %3d%% [${CYAN}%-32s${NC}]" "$BAR_STR" "$EMPTY_STR" "$PERCENT" "${STAGE:0:32}"
        sleep 1
    done

    if [ "$READY" -ne 1 ]; then
        printf "\n"
        echo -e "[${YELLOW}STILL PREPARING / TIMED OUT${NC}]"
        docker exec $CONTAINER_NAME tail -20 /tmp/stream_protection.log 2>/dev/null || true
    fi
else
    echo -e "Disconnection protection is ${YELLOW}DISABLED${NC}, skipping backup video check."
fi

# 5. Settings website / Health endpoint (Alternative HTTP port, avoiding port 80)
PORT_HTTP=$(docker exec $CONTAINER_NAME printenv PORT_HTTP 2>/dev/null || echo "8880")
PORT_HTTP=${PORT_HTTP:-8880}
echo -n "Checking web service on port ${PORT_HTTP}... "
if docker exec $CONTAINER_NAME curl -s --fail "http://127.0.0.1:${PORT_HTTP}/health" > /dev/null; then
    echo -e "[${GREEN}PASSED${NC}]"
else
    echo -e "[${RED}FAILED${NC}]"
fi

# 6. Check Host Ports
echo -n "Checking host port 1935 (RTMP)... "
if command -v ss &> /dev/null; then
    if ss -tuln | grep -q ":1935 "; then
        echo -e "[${GREEN}PASSED${NC}]"
    else
        echo -e "[${RED}FAILED${NC}]"
    fi
else
    echo -e "[${YELLOW}SKIPPED${NC}] (ss command not found)"
fi

echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Integration Test Completed.${NC}"
echo -e "${BLUE}=====================================${NC}"
