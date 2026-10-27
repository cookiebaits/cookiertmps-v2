#!/bin/bash
# install.sh - Menu style configuration and installation for CookieRTMPS
# Ensure script is run with bash

# Always operate from the script's directory regardless of invocation path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Upgrade / Overwrite Detection: Check if an existing CookieRTMPS instance or clone exists
handle_existing_instance_upgrade() {
    local HAS_OLD_CONFIG=0

    # Check parent directory or common clone paths (/root/CookieRTMP-v2, /root/cookie-rtmps, ./rtmp_config.env)
    if [ -f "rtmp_config.env" ] || [ -f "../rtmp_config.env" ] || [ -d "../CookieRTMP-v2/data" ] || [ -d "../cookie-rtmps/data" ]; then
        HAS_OLD_CONFIG=1
    fi

    if [ $HAS_OLD_CONFIG -eq 1 ]; then
        echo -e "${YELLOW}=====================================================${NC}"
        echo -e "${YELLOW}  Checking for file updates & existing configuration...${NC}"
        echo -e "${YELLOW}=====================================================${NC}"

        # If previous configuration file exists in an adjacent folder or backup, restore/update it
        if [ ! -f "rtmp_config.env" ] && [ -f "../rtmp_config.env" ]; then
            echo -e "${GREEN}Restoring configuration from previous instance...${NC}"
            cp "../rtmp_config.env" "./rtmp_config.env" 2>/dev/null || true
        elif [ ! -f "rtmp_config.env" ] && [ -f "../cookie-rtmps/rtmp_config.env" ]; then
            echo -e "${GREEN}Restoring configuration from ../cookie-rtmps/rtmp_config.env...${NC}"
            cp "../cookie-rtmps/rtmp_config.env" "./rtmp_config.env" 2>/dev/null || true
        fi

        # Targeted update check: ONLY check for updates related to RTMP modules and the installer itself
        local SOURCE_DIR=""
        if [ -d "../CookieRTMP-v2" ] && [ "../CookieRTMP-v2" != "$PWD" ]; then
            SOURCE_DIR="../CookieRTMP-v2"
        elif [ -d "../cookie-rtmps" ] && [ "../cookie-rtmps" != "$PWD" ]; then
            SOURCE_DIR="../cookie-rtmps"
        fi

        if [ -n "$SOURCE_DIR" ]; then
            echo -e "${GREEN}Checking for updates to RTMP modules and installer files only...${NC}"
            # 1. RTMP Module
            if [ -d "$SOURCE_DIR/cookie-nginx-rtmp" ]; then
                cp -ru "$SOURCE_DIR/cookie-nginx-rtmp" . 2>/dev/null || true
            fi
            # 2. Core installer and server scripts
            local CORE_FILES=("install.sh" "Dockerfile" "docker-entrypoint.sh" "stream_validator.py" "stream_protection.py" "integration_test.sh")
            for f in "${CORE_FILES[@]}"; do
                if [ -f "$SOURCE_DIR/$f" ]; then
                    cp -u "$SOURCE_DIR/$f" . 2>/dev/null || true
                fi
            done
            # 3. Core streaming config directories
            local CORE_DIRS=("nginx" "stunnel")
            for d in "${CORE_DIRS[@]}"; do
                if [ -d "$SOURCE_DIR/$d" ]; then
                    cp -ru "$SOURCE_DIR/$d" . 2>/dev/null || true
                fi
            done
        fi

        # Preserve data volume (keys, brb_video.mp4, etc.) if available in older directory
        if [ ! -d "./data" ] && [ -d "../cookie-rtmps/data" ]; then
            mkdir -p ./data
            cp -r ../cookie-rtmps/data/* ./data/ 2>/dev/null || true
        elif [ ! -d "./data" ] && [ -d "../CookieRTMP-v2/data" ]; then
            mkdir -p ./data
            cp -r ../CookieRTMP-v2/data/* ./data/ 2>/dev/null || true
        fi

        echo -e "${GREEN}RTMP modules and installer update check complete.${NC}"
        echo -e "${GREEN}Loading CookieRTMPS install menu...${NC}\n"
        sleep 1
    fi
}

handle_existing_instance_upgrade

# Default values
YOUTUBE_URL="rtmp://a.rtmp.youtube.com/live2/"
YOUTUBE_KEY=""
FACEBOOK_URL="rtmp://127.0.0.1:19350/rtmp/"
FACEBOOK_KEY=""
INSTAGRAM_URL="rtmp://127.0.0.1:19351/rtmp/"
INSTAGRAM_KEY=""
TIKTOK_URL="rtmp://127.0.0.1:19358/s_v/"
TIKTOK_KEY=""
TIKTOK_SL_TOKEN=""
TIKTOK_TITLE=""
TIKTOK_GAME_ID=""
TWITCH_URL="rtmp://127.0.0.1:19353/app/"
TWITCH_KEY=""
KICK_URL="rtmp://127.0.0.1:19356/kick/"
KICK_KEY=""
X_URL="rtmp://127.0.0.1:19354/x/"
X_KEY=""
TROVO_URL="rtmp://livepush.trovo.live/live/"
TROVO_KEY=""
RTMP1_URL=""
RTMP1_KEY=""

# Vertical Defaults
V_YOUTUBE_URL="rtmp://a.rtmp.youtube.com/live2/"
V_YOUTUBE_KEY=""
V_TWITCH_URL="rtmp://127.0.0.1:19353/app/"
V_TWITCH_KEY=""
V_KICK_URL="rtmp://127.0.0.1:19356/kick/"
V_KICK_KEY=""
V_TIKTOK_URL="rtmp://127.0.0.1:19358/s_v/"
V_TIKTOK_KEY=""
V_FACEBOOK_URL="rtmp://127.0.0.1:19350/rtmp/"
V_FACEBOOK_KEY=""
V_INSTAGRAM_URL="rtmp://127.0.0.1:19351/rtmp/"
V_INSTAGRAM_KEY=""
V_X_URL="rtmp://127.0.0.1:19354/x/"
V_X_KEY=""
V_TROVO_URL="rtmp://livepush.trovo.live/live/"
V_TROVO_KEY=""
V_RTMP1_URL=""
V_RTMP1_KEY=""

OBS_KEY=""
APP_NAME="live"
ACCEPTED_IP=""
SERVER_DOMAIN=""
CHUNK_SIZE="8192"
STREAM_BASE_TITLE="Live Stream"
TWITCH_CLIENT_ID=""
TWITCH_OAUTH_TOKEN=""
TWITCH_BROADCASTER_ID=""

# Combined Chat Settings
CHAT_TWITCH=""
CHAT_YOUTUBE=""
CHAT_KICK=""
CHAT_TIKTOK=""
CHAT_HEX_KEY=""

# Host Port Settings
PORT_RTMP="1935"
PORT_HTTP="80"
PORT_HTTPS="443"
PORT_STATS="8081"

# Website address
CLOUDFLARE_PROXY="false"
DOMAIN_PROMPTED="false"

# Disconnection Protection (NOALBS_ENABLED kept as the setting name for saved configs)
NOALBS_ENABLED="true"
LOW_BITRATE="1000"
RESTORE_BITRATE="1500"
BRB_VIDEO_URL=""
CLOUD_BRB_TIMEOUT="300"
DEFAULT_BRB_VIDEO_URL="https://filedn.com/lfh40bKbFfD5um9HDFNrJFR/brb.mp4"

CONFIG_FILE="rtmp_config.env"

# Load saved configuration if it exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Older installs served the website on 81/8443; it now lives on the standard 80/443.
[ "$PORT_HTTP" == "81" ] && PORT_HTTP="80"
[ "$PORT_HTTPS" == "8443" ] && PORT_HTTPS="443"

save_config() {
    cat <<ENV_EOF > "$CONFIG_FILE"
YOUTUBE_URL="$YOUTUBE_URL"
YOUTUBE_KEY="$YOUTUBE_KEY"
FACEBOOK_URL="$FACEBOOK_URL"
FACEBOOK_KEY="$FACEBOOK_KEY"
INSTAGRAM_URL="$INSTAGRAM_URL"
INSTAGRAM_KEY="$INSTAGRAM_KEY"
TIKTOK_URL="$TIKTOK_URL"
TIKTOK_KEY="$TIKTOK_KEY"
TIKTOK_SL_TOKEN="$TIKTOK_SL_TOKEN"
TIKTOK_TITLE="$TIKTOK_TITLE"
TIKTOK_GAME_ID="$TIKTOK_GAME_ID"
TWITCH_URL="$TWITCH_URL"
TWITCH_KEY="$TWITCH_KEY"
KICK_URL="$KICK_URL"
KICK_KEY="$KICK_KEY"
X_URL="$X_URL"
X_KEY="$X_KEY"
TROVO_URL="$TROVO_URL"
TROVO_KEY="$TROVO_KEY"
RTMP1_URL="$RTMP1_URL"
RTMP1_KEY="$RTMP1_KEY"
V_YOUTUBE_URL="$V_YOUTUBE_URL"
V_YOUTUBE_KEY="$V_YOUTUBE_KEY"
V_TWITCH_URL="$V_TWITCH_URL"
V_TWITCH_KEY="$V_TWITCH_KEY"
V_KICK_URL="$V_KICK_URL"
V_KICK_KEY="$V_KICK_KEY"
V_TIKTOK_URL="$V_TIKTOK_URL"
V_TIKTOK_KEY="$V_TIKTOK_KEY"
V_FACEBOOK_URL="$V_FACEBOOK_URL"
V_FACEBOOK_KEY="$V_FACEBOOK_KEY"
V_INSTAGRAM_URL="$V_INSTAGRAM_URL"
V_INSTAGRAM_KEY="$V_INSTAGRAM_KEY"
V_X_URL="$V_X_URL"
V_X_KEY="$V_X_KEY"
V_TROVO_URL="$V_TROVO_URL"
V_TROVO_KEY="$V_TROVO_KEY"
V_RTMP1_URL="$V_RTMP1_URL"
V_RTMP1_KEY="$V_RTMP1_KEY"
OBS_KEY="$OBS_KEY"
APP_NAME="$APP_NAME"
ACCEPTED_IP="$ACCEPTED_IP"
CHAT_TWITCH="$CHAT_TWITCH"
CHAT_YOUTUBE="$CHAT_YOUTUBE"
CHAT_KICK="$CHAT_KICK"
CHAT_TIKTOK="$CHAT_TIKTOK"
CHAT_HEX_KEY="$CHAT_HEX_KEY"
SERVER_DOMAIN="$SERVER_DOMAIN"
CHUNK_SIZE="$CHUNK_SIZE"
STREAM_BASE_TITLE="$STREAM_BASE_TITLE"
TWITCH_CLIENT_ID="$TWITCH_CLIENT_ID"
TWITCH_OAUTH_TOKEN="$TWITCH_OAUTH_TOKEN"
TWITCH_BROADCASTER_ID="$TWITCH_BROADCASTER_ID"
CLOUDFLARE_PROXY="$CLOUDFLARE_PROXY"
DOMAIN_PROMPTED="$DOMAIN_PROMPTED"
NOALBS_ENABLED="$NOALBS_ENABLED"
LOW_BITRATE="$LOW_BITRATE"
RESTORE_BITRATE="$RESTORE_BITRATE"
BRB_VIDEO_URL="$BRB_VIDEO_URL"
CLOUD_BRB_TIMEOUT="$CLOUD_BRB_TIMEOUT"
PORT_RTMP="$PORT_RTMP"
PORT_HTTP="$PORT_HTTP"
PORT_HTTPS="$PORT_HTTPS"
PORT_STATS="$PORT_STATS"
ENV_EOF
    echo -e "${GREEN}Configuration saved to $CONFIG_FILE${NC}"
}

# Ensure an 8-character random hex key exists (generated uniquely on fresh download)
if [ -z "$CHAT_HEX_KEY" ]; then
    if command -v openssl &> /dev/null; then
        CHAT_HEX_KEY=$(openssl rand -hex 4 2>/dev/null)
    elif [ -c /dev/urandom ]; then
        CHAT_HEX_KEY=$(head -c 4 /dev/urandom | xxd -p 2>/dev/null || od -An -tx1 -N4 /dev/urandom | tr -d ' \n' 2>/dev/null)
    elif command -v python3 &> /dev/null; then
        CHAT_HEX_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(4))' 2>/dev/null)
    fi
    if [ -z "$CHAT_HEX_KEY" ] || [ ${#CHAT_HEX_KEY} -ne 8 ]; then
        CHAT_HEX_KEY=$(date +%s%N 2>/dev/null | md5sum 2>/dev/null | cut -c1-8)
    fi
    if [ -z "$CHAT_HEX_KEY" ] || [ ${#CHAT_HEX_KEY} -ne 8 ]; then
        CHAT_HEX_KEY="c00k1e88"
    fi
    mkdir -p ./data
    echo "$CHAT_HEX_KEY" > ./data/chat_hex_key.txt 2>/dev/null || true
    save_config
fi

prompt_for_key() {
    local platform=$1
    local var_name=$2
    local current_value=${!var_name}

    echo -e "Enter Stream Key for ${YELLOW}$platform${NC} (Type 'disable' to remove key, or leave blank to keep current: ${current_value:-None}): "
    read -r input

    if [ "$input" == "disable" ] || [ "$input" == "DISABLE" ]; then
        printf -v "$var_name" "%s" ""
        save_config
        echo -e "${GREEN}Disabled stream to $platform.${NC}"
        sleep 1
    elif [ ! -z "$input" ]; then
        printf -v "$var_name" "%s" "$input"
        save_config
    fi
}

get_alternative_url() {
    local platform=$1
    local current_url=$2

    case $platform in
        "youtube")
            if [[ "$current_url" == *"x.rtmp.youtube.com"* ]] || [[ "$current_url" == *"a.rtmp.youtube.com"* ]] || [[ "$current_url" == *"127.0.0.1:19355"* ]]; then
                # It is a primary URL, return the corresponding backup URL
                if [[ "$current_url" == *"127.0.0.1"* ]]; then
                    echo "rtmp://127.0.0.1:19357/live2?backup=1"
                else
                    echo "rtmp://b.rtmp.youtube.com/live2?backup=1"
                fi
            else
                # It is a backup URL or something else, return the corresponding primary URL
                if [[ "$current_url" == *"127.0.0.1"* ]]; then
                    echo "rtmp://127.0.0.1:19355/live2/"
                else
                    echo "rtmp://a.rtmp.youtube.com/live2/"
                fi
            fi
            ;;
        "twitch")
            # If it is using the global ingest, switch to US East (Ashburn) as a reliable alternative
            if [[ "$current_url" == *"ingest.global"* ]]; then
                echo "rtmp://use10.contribute.live-video.net/app/"
            else
                # If it is using a regional ingest, switch to the global ingest
                echo "rtmp://ingest.global-contribute.live-video.net/app/"
            fi
            ;;
        "kick")
            # If it is using standard/secure, switch to the South Africa relay as an alternative
            if [[ "$current_url" == *"live.kick.com"* ]] || [[ "$current_url" == *"127.0.0.1:19356"* ]]; then
                echo "rtmp://kick.cisp.co.za/live"
            else
                # Otherwise switch to the secure global endpoint
                echo "rtmp://127.0.0.1:19356/kick/"
            fi
            ;;
        *)
            echo "$current_url"
            ;;
    esac
}

configure_keys() {
    while true; do
        clear
        echo -e "${GREEN}=== Configure Horizontal Stream Keys ===${NC}"
        echo "1) YouTube (Current: ${YOUTUBE_KEY:-None})"
        echo "2) Twitch (Current: ${TWITCH_KEY:-None})"
        echo "3) Kick (Current: ${KICK_KEY:-None})"
        echo "4) TikTok (Current: ${TIKTOK_KEY:-None})"
        echo "5) Facebook (Current: ${FACEBOOK_KEY:-None})"
        echo "6) Instagram (Current: ${INSTAGRAM_KEY:-None})"
        echo "7) X (Twitter) (Current: ${X_KEY:-None})"
        echo "8) Trovo (Current: ${TROVO_KEY:-None})"
        echo "9) Custom RTMP (Current URL: ${RTMP1_URL:-None})"
        echo "10) Back to Main Menu"
        echo -e "Select an option: \c"
        read -r choice

        case $choice in
            1)
               prompt_for_key "YouTube Key" "YOUTUBE_KEY"
               echo -e "Select YouTube Server:"
               echo "  1) Primary (rtmp://a.rtmp.youtube.com/live2/)"
               echo "  2) Backup (rtmp://b.rtmp.youtube.com/live2?backup=1)"
               echo "  3) Secure Primary (rtmps://a.rtmps.youtube.com/live2/ -> via Stunnel)"
               echo "  4) Secure Backup (rtmps://b.rtmps.youtube.com/live2?backup=1 -> via Stunnel)"
               echo "  5) Custom URL"
               echo -e "Option (Current URL: $YOUTUBE_URL): \c"
               read -r y_opt
               case $y_opt in
                   1) YOUTUBE_URL="rtmp://a.rtmp.youtube.com/live2/" ;;
                   2) YOUTUBE_URL="rtmp://b.rtmp.youtube.com/live2?backup=1" ;;
                   3) YOUTUBE_URL="rtmp://127.0.0.1:19355/live2/" ;;
                   4) YOUTUBE_URL="rtmp://127.0.0.1:19357/live2?backup=1" ;;
                   5)
                      echo -e "Enter Custom YouTube Server URL: "
                      read -r y_url
                      if [ ! -z "$y_url" ]; then
                          YOUTUBE_URL="$y_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            2)
               prompt_for_key "Twitch Key" "TWITCH_KEY"
               echo -e "Select Twitch Server:"
               echo "  1) Global (rtmp://ingest.global-contribute.live-video.net/app/)"
               echo "  2) Secure Global (rtmps://ingest.global-contribute.live-video.net:443 -> Stunnel)"
               echo "  3) US East: Ashburn (rtmp://use10.contribute.live-video.net/app/)"
               echo "  4) US East: Ohio (rtmp://use20.contribute.live-video.net/app/)"
               echo "  5) US West: Oregon (rtmp://usw20.contribute.live-video.net/app/)"
               echo "  6) EU: Ireland (rtmp://euw10.contribute.live-video.net/app/)"
               echo "  7) EU: Frankfurt (rtmp://euc10.contribute.live-video.net/app/)"
               echo "  8) EU: Paris (rtmp://euw30.contribute.live-video.net/app/)"
               echo "  9) EU: Stockholm (rtmp://eun10.contribute.live-video.net/app/)"
               echo "  10) Asia: Tokyo (rtmp://apn10.contribute.live-video.net/app/)"
               echo "  11) Asia: Seoul (rtmp://apn20.contribute.live-video.net/app/)"
               echo "  12) Asia: Singapore (rtmp://aps10.contribute.live-video.net/app/)"
               echo "  13) Asia: Sydney (rtmp://aps20.contribute.live-video.net/app/)"
               echo "  14) Asia: Mumbai (rtmp://aps30.contribute.live-video.net/app/)"
               echo "  15) South America: Brazil (rtmp://sae10.contribute.live-video.net/app/)"
               echo "  16) Custom URL"
               echo -e "Option (Current URL: $TWITCH_URL): \c"
               read -r t_opt
               case $t_opt in
                   1) TWITCH_URL="rtmp://ingest.global-contribute.live-video.net/app/" ;;
                   2) TWITCH_URL="rtmp://127.0.0.1:19353/app/" ;;
                   3) TWITCH_URL="rtmp://use10.contribute.live-video.net/app/" ;;
                   4) TWITCH_URL="rtmp://use20.contribute.live-video.net/app/" ;;
                   5) TWITCH_URL="rtmp://usw20.contribute.live-video.net/app/" ;;
                   6) TWITCH_URL="rtmp://euw10.contribute.live-video.net/app/" ;;
                   7) TWITCH_URL="rtmp://euc10.contribute.live-video.net/app/" ;;
                   8) TWITCH_URL="rtmp://euw30.contribute.live-video.net/app/" ;;
                   9) TWITCH_URL="rtmp://eun10.contribute.live-video.net/app/" ;;
                   10) TWITCH_URL="rtmp://apn10.contribute.live-video.net/app/" ;;
                   11) TWITCH_URL="rtmp://apn20.contribute.live-video.net/app/" ;;
                   12) TWITCH_URL="rtmp://aps10.contribute.live-video.net/app/" ;;
                   13) TWITCH_URL="rtmp://aps20.contribute.live-video.net/app/" ;;
                   14) TWITCH_URL="rtmp://aps30.contribute.live-video.net/app/" ;;
                   15) TWITCH_URL="rtmp://sae10.contribute.live-video.net/app/" ;;
                   16)
                      echo -e "Enter Custom Twitch Server URL: "
                      read -r t_url
                      if [ ! -z "$t_url" ]; then
                          TWITCH_URL="$t_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            3)
               prompt_for_key "Kick" "KICK_KEY"
               echo -e "Select Kick Server:"
               echo "  1) Standard (rtmp://live.kick.com/app/)"
               echo "  2) Secure (rtmps://fa723fc1b171.global-contribute.live-video.net:443 -> via Stunnel)"
               echo "  3) South Africa Relay (rtmp://kick.cisp.co.za/live)"
               echo "  4) Custom URL"
               echo -e "Option (Current URL: $KICK_URL): \c"
               read -r k_opt
               case $k_opt in
                   1) KICK_URL="rtmp://live.kick.com/app/" ;;
                   2) KICK_URL="rtmp://127.0.0.1:19356/kick/" ;;
                   3) KICK_URL="rtmp://kick.cisp.co.za/live" ;;
                   4)
                      echo -e "Enter Custom Kick Server URL: "
                      read -r k_url
                      if [ ! -z "$k_url" ]; then
                          KICK_URL="$k_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            4)
               prompt_for_key "TikTok" "TIKTOK_KEY"
               echo -e "Select TikTok Server:"
               echo "  1) Secure (rtmps://push.tiktok.com:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo "  3) Streamlabs Auto-Pusher (Bypass TikTok Studio)"
               echo -e "Option (Current URL: $TIKTOK_URL): \c"
               read -r tt_opt
               case $tt_opt in
                   1) TIKTOK_URL="rtmp://127.0.0.1:19358/s_v/" ;;
                   2)
                      echo -e "Enter Custom TikTok Server URL: "
                      read -r tt_url
                      if [ ! -z "$tt_url" ]; then
                          TIKTOK_URL="$tt_url"
                      fi
                      ;;
                   3)
                      TIKTOK_URL="auto"
                      echo -e "Enter Streamlabs Token: \c"
                      read -r TIKTOK_SL_TOKEN
                      echo -e "Enter Stream Title: \c"
                      read -r TIKTOK_TITLE
                      echo -e "Enter Game ID (Optional): \c"
                      read -r TIKTOK_GAME_ID
                      ;;
               esac
               save_config
               ;;
            5)
               prompt_for_key "Facebook" "FACEBOOK_KEY"
               echo -e "Select Facebook Server:"
               echo "  1) Secure (rtmps://live-api-s.facebook.com:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $FACEBOOK_URL): \c"
               read -r f_opt
               case $f_opt in
                   1) FACEBOOK_URL="rtmp://127.0.0.1:19350/rtmp/" ;;
                   2)
                      echo -e "Enter Custom Facebook Server URL: "
                      read -r f_url
                      if [ ! -z "$f_url" ]; then
                          FACEBOOK_URL="$f_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            6)
               prompt_for_key "Instagram" "INSTAGRAM_KEY"
               echo -e "Select Instagram Server:"
               echo "  1) Secure (rtmps://live-upload.instagram.com:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $INSTAGRAM_URL): \c"
               read -r i_opt
               case $i_opt in
                   1) INSTAGRAM_URL="rtmp://127.0.0.1:19351/rtmp/" ;;
                   2)
                      echo -e "Enter Custom Instagram Server URL: "
                      read -r i_url
                      if [ ! -z "$i_url" ]; then
                          INSTAGRAM_URL="$i_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            7)
               prompt_for_key "X (Twitter)" "X_KEY"
               echo -e "Select X Server:"
               echo "  1) Secure (rtmps://va.pscp.tv:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $X_URL): \c"
               read -r x_opt
               case $x_opt in
                   1) X_URL="rtmp://127.0.0.1:19354/x/" ;;
                   2)
                      echo -e "Enter Custom X Server URL: "
                      read -r x_url
                      if [ ! -z "$x_url" ]; then
                          X_URL="$x_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            8)
               prompt_for_key "Trovo" "TROVO_KEY"
               echo -e "Select Trovo Server:"
               echo "  1) Primary (rtmp://livepush.trovo.live/live/)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $TROVO_URL): \c"
               read -r tr_opt
               case $tr_opt in
                   1) TROVO_URL="rtmp://livepush.trovo.live/live/" ;;
                   2)
                      echo -e "Enter Custom Trovo Server URL: "
                      read -r tr_url
                      if [ ! -z "$tr_url" ]; then
                          TROVO_URL="$tr_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            9)
               echo -e "Enter Custom RTMP Server URL (Current: $RTMP1_URL): "
               read -r c_url
               if [ ! -z "$c_url" ]; then
                   RTMP1_URL="$c_url"
                   save_config
               fi
               prompt_for_key "Custom RTMP Key" "RTMP1_KEY"
               ;;
            10) break ;;
            *) echo -e "${RED}Invalid option${NC}" ; sleep 1 ;;
        esac
    done
}

configure_vertical_keys() {
    while true; do
        clear
        echo -e "${GREEN}=== Configure Vertical Stream Keys ===${NC}"
        echo -e "${YELLOW}Note: Vertical is officially supported on: YouTube, Twitch and TikTok.${NC}"
        echo "1) YouTube (Current: ${V_YOUTUBE_KEY:-None})"
        echo "2) Twitch (Current: ${V_TWITCH_KEY:-None})"
        echo "3) Kick (Current: ${V_KICK_KEY:-None})"
        echo "4) TikTok (Current: ${V_TIKTOK_KEY:-None})"
        echo "5) Facebook (Current: ${V_FACEBOOK_KEY:-None})"
        echo "6) Instagram (Current: ${V_INSTAGRAM_KEY:-None})"
        echo "7) X (Twitter) (Current: ${V_X_KEY:-None})"
        echo "8) Trovo (Current: ${V_TROVO_KEY:-None})"
        echo "9) Custom RTMP (Current URL: ${V_RTMP1_URL:-None})"
        echo "10) Mirror Horizontal Keys (Auto-fill from Horizontal)"
        echo "11) Back to Main Menu"
        echo -e "Select an option: \c"
        read -r choice

        case $choice in
            1)
               prompt_for_key "YouTube Vertical Key" "V_YOUTUBE_KEY"
               echo -e "Select YouTube Server:"
               echo "  1) Primary (rtmp://a.rtmp.youtube.com/live2/)"
               echo "  2) Secure Primary (rtmps://a.rtmps.youtube.com/live2/ -> via Stunnel)"
               echo "  3) Custom URL"
               echo -e "Option (Current URL: $V_YOUTUBE_URL): \c"
               read -r y_opt
               case $y_opt in
                   1) V_YOUTUBE_URL="rtmp://a.rtmp.youtube.com/live2/" ;;
                   2) V_YOUTUBE_URL="rtmp://127.0.0.1:19355/live2/" ;;
                   3)
                      echo -e "Enter Custom YouTube Server URL: "
                      read -r y_url
                      if [ ! -z "$y_url" ]; then
                          V_YOUTUBE_URL="$y_url"
                      fi
                      ;;
               esac
               if [ "$V_YOUTUBE_URL" == "$YOUTUBE_URL" ]; then
                   echo -e "${YELLOW}Warning: Same ingest server as Horizontal. Switching to alternative...${NC}"
                   V_YOUTUBE_URL=$(get_alternative_url "youtube" "$V_YOUTUBE_URL")
                   echo -e "New Vertical URL: $V_YOUTUBE_URL"
                   sleep 2
               fi
               save_config
               ;;
            2)
               prompt_for_key "Twitch Vertical Key" "V_TWITCH_KEY"
               echo -e "Select Twitch Server:"
               echo "  1) Global (rtmp://ingest.global-contribute.live-video.net/app/)"
               echo "  2) Secure Global (rtmps://ingest.global-contribute.live-video.net:443 -> Stunnel)"
               echo "  3) US East: Ashburn (rtmp://use10.contribute.live-video.net/app/)"
               echo "  4) US East: Ohio (rtmp://use20.contribute.live-video.net/app/)"
               echo "  5) US West: Oregon (rtmp://usw20.contribute.live-video.net/app/)"
               echo "  6) EU: Ireland (rtmp://euw10.contribute.live-video.net/app/)"
               echo "  7) EU: Frankfurt (rtmp://euc10.contribute.live-video.net/app/)"
               echo "  8) EU: Paris (rtmp://euw30.contribute.live-video.net/app/)"
               echo "  9) EU: Stockholm (rtmp://eun10.contribute.live-video.net/app/)"
               echo "  10) Asia: Tokyo (rtmp://apn10.contribute.live-video.net/app/)"
               echo "  11) Asia: Seoul (rtmp://apn20.contribute.live-video.net/app/)"
               echo "  12) Asia: Singapore (rtmp://aps10.contribute.live-video.net/app/)"
               echo "  13) Asia: Sydney (rtmp://aps20.contribute.live-video.net/app/)"
               echo "  14) Asia: Mumbai (rtmp://aps30.contribute.live-video.net/app/)"
               echo "  15) South America: Brazil (rtmp://sae10.contribute.live-video.net/app/)"
               echo "  16) Custom URL"
               echo -e "Option (Current URL: $V_TWITCH_URL): \c"
               read -r t_opt
               case $t_opt in
                   1) V_TWITCH_URL="rtmp://ingest.global-contribute.live-video.net/app/" ;;
                   2) V_TWITCH_URL="rtmp://127.0.0.1:19353/app/" ;;
                   3) V_TWITCH_URL="rtmp://use10.contribute.live-video.net/app/" ;;
                   4) V_TWITCH_URL="rtmp://use20.contribute.live-video.net/app/" ;;
                   5) V_TWITCH_URL="rtmp://usw20.contribute.live-video.net/app/" ;;
                   6) V_TWITCH_URL="rtmp://euw10.contribute.live-video.net/app/" ;;
                   7) V_TWITCH_URL="rtmp://euc10.contribute.live-video.net/app/" ;;
                   8) V_TWITCH_URL="rtmp://euw30.contribute.live-video.net/app/" ;;
                   9) V_TWITCH_URL="rtmp://eun10.contribute.live-video.net/app/" ;;
                   10) V_TWITCH_URL="rtmp://apn10.contribute.live-video.net/app/" ;;
                   11) V_TWITCH_URL="rtmp://apn20.contribute.live-video.net/app/" ;;
                   12) V_TWITCH_URL="rtmp://aps10.contribute.live-video.net/app/" ;;
                   13) V_TWITCH_URL="rtmp://aps20.contribute.live-video.net/app/" ;;
                   14) V_TWITCH_URL="rtmp://aps30.contribute.live-video.net/app/" ;;
                   15) V_TWITCH_URL="rtmp://sae10.contribute.live-video.net/app/" ;;
                   16)
                      echo -e "Enter Custom Twitch Server URL: "
                      read -r t_url
                      if [ ! -z "$t_url" ]; then
                          V_TWITCH_URL="$t_url"
                      fi
                      ;;
               esac
               if [ "$V_TWITCH_URL" == "$TWITCH_URL" ]; then
                   echo -e "${YELLOW}Warning: Same ingest server as Horizontal. Switching to alternative...${NC}"
                   V_TWITCH_URL=$(get_alternative_url "twitch" "$V_TWITCH_URL")
                   echo -e "New Vertical URL: $V_TWITCH_URL"
                   sleep 2
               fi
               save_config
               ;;
            3)
               prompt_for_key "Kick Vertical Key" "V_KICK_KEY"
               echo -e "Select Kick Server:"
               echo "  1) Standard (rtmp://live.kick.com/app/)"
               echo "  2) Secure (rtmps://fa723fc1b171.global-contribute.live-video.net:443 -> via Stunnel)"
               echo "  3) South Africa Relay (rtmp://kick.cisp.co.za/live)"
               echo "  4) Custom URL"
               echo -e "Option (Current URL: $V_KICK_URL): \c"
               read -r k_opt
               case $k_opt in
                   1) V_KICK_URL="rtmp://live.kick.com/app/" ;;
                   2) V_KICK_URL="rtmp://127.0.0.1:19356/kick/" ;;
                   3) V_KICK_URL="rtmp://kick.cisp.co.za/live" ;;
                   4)
                      echo -e "Enter Custom Kick Server URL: "
                      read -r k_url
                      if [ ! -z "$k_url" ]; then
                          V_KICK_URL="$k_url"
                      fi
                      ;;
               esac
               if [ "$V_KICK_URL" == "$KICK_URL" ]; then
                   echo -e "${YELLOW}Warning: Same ingest server as Horizontal. Switching to alternative...${NC}"
                   V_KICK_URL=$(get_alternative_url "kick" "$V_KICK_URL")
                   echo -e "New Vertical URL: $V_KICK_URL"
                   sleep 2
               fi
               save_config
               ;;
            4)
               prompt_for_key "TikTok Vertical Key" "V_TIKTOK_KEY"
               echo -e "Select TikTok Server:"
               echo "  1) Secure (rtmps://push.tiktok.com:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo "  3) Streamlabs Auto-Pusher (Bypass TikTok Studio)"
               echo -e "Option (Current URL: $V_TIKTOK_URL): \c"
               read -r tt_opt
               case $tt_opt in
                   1) V_TIKTOK_URL="rtmp://127.0.0.1:19358/s_v/" ;;
                   2)
                      echo -e "Enter Custom TikTok Server URL: "
                      read -r tt_url
                      if [ ! -z "$tt_url" ]; then
                          V_TIKTOK_URL="$tt_url"
                      fi
                      ;;
                   3)
                      V_TIKTOK_URL="auto"
                      echo -e "Enter Streamlabs Token: \c"
                      read -r TIKTOK_SL_TOKEN
                      echo -e "Enter Stream Title: \c"
                      read -r TIKTOK_TITLE
                      echo -e "Enter Game ID (Optional): \c"
                      read -r TIKTOK_GAME_ID
                      ;;
               esac
               save_config
               ;;
            5)
               prompt_for_key "Facebook Vertical Key" "V_FACEBOOK_KEY"
               echo -e "Select Facebook Server:"
               echo "  1) Secure (rtmps://live-api-s.facebook.com:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $V_FACEBOOK_URL): \c"
               read -r f_opt
               case $f_opt in
                   1) V_FACEBOOK_URL="rtmp://127.0.0.1:19350/rtmp/" ;;
                   2)
                      echo -e "Enter Custom Facebook Server URL: "
                      read -r f_url
                      if [ ! -z "$f_url" ]; then
                          V_FACEBOOK_URL="$f_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            6)
               prompt_for_key "Instagram Vertical Key" "V_INSTAGRAM_KEY"
               echo -e "Select Instagram Server:"
               echo "  1) Secure (rtmps://live-upload.instagram.com:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $V_INSTAGRAM_URL): \c"
               read -r i_opt
               case $i_opt in
                   1) V_INSTAGRAM_URL="rtmp://127.0.0.1:19351/rtmp/" ;;
                   2)
                      echo -e "Enter Custom Instagram Server URL: "
                      read -r i_url
                      if [ ! -z "$i_url" ]; then
                          V_INSTAGRAM_URL="$i_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            7)
               prompt_for_key "X Vertical Key" "V_X_KEY"
               echo -e "Select X Server:"
               echo "  1) Secure (rtmps://va.pscp.tv:443 -> via Stunnel)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $V_X_URL): \c"
               read -r x_opt
               case $x_opt in
                   1) V_X_URL="rtmp://127.0.0.1:19354/x/" ;;
                   2)
                      echo -e "Enter Custom X Server URL: "
                      read -r x_url
                      if [ ! -z "$x_url" ]; then
                          V_X_URL="$x_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            8)
               prompt_for_key "Trovo Vertical Key" "V_TROVO_KEY"
               echo -e "Select Trovo Server:"
               echo "  1) Primary (rtmp://livepush.trovo.live/live/)"
               echo "  2) Custom URL"
               echo -e "Option (Current URL: $V_TROVO_URL): \c"
               read -r tr_opt
               case $tr_opt in
                   1) V_TROVO_URL="rtmp://livepush.trovo.live/live/" ;;
                   2)
                      echo -e "Enter Custom Trovo Server URL: "
                      read -r tr_url
                      if [ ! -z "$tr_url" ]; then
                          V_TROVO_URL="$tr_url"
                      fi
                      ;;
               esac
               save_config
               ;;
            9)
               echo -e "Enter Custom RTMP Vertical Server URL (Current: $V_RTMP1_URL): "
               read -r c_url
               if [ ! -z "$c_url" ]; then
                   V_RTMP1_URL="$c_url"
                   save_config
               fi
               prompt_for_key "Custom RTMP Vertical Key" "V_RTMP1_KEY"
               ;;
            10)
               echo -e "${YELLOW}Mirroring Horizontal keys with alternative ingest servers...${NC}"
               V_YOUTUBE_KEY="$YOUTUBE_KEY"
               V_YOUTUBE_URL=$(get_alternative_url "youtube" "$YOUTUBE_URL")
               V_TWITCH_KEY="$TWITCH_KEY"
               V_TWITCH_URL=$(get_alternative_url "twitch" "$TWITCH_URL")
               V_TIKTOK_KEY="$TIKTOK_KEY"
               V_TIKTOK_URL="$TIKTOK_URL"
               V_KICK_KEY="$KICK_KEY"
               V_KICK_URL=$(get_alternative_url "kick" "$KICK_URL")
               V_FACEBOOK_KEY="$FACEBOOK_KEY"
               V_FACEBOOK_URL="$FACEBOOK_URL"
               V_INSTAGRAM_KEY="$INSTAGRAM_KEY"
               V_INSTAGRAM_URL="$INSTAGRAM_URL"
               V_X_KEY="$X_KEY"
               V_X_URL="$X_URL"
               V_TROVO_KEY="$TROVO_KEY"
               V_TROVO_URL="$TROVO_URL"
               V_RTMP1_KEY="$RTMP1_KEY"
               V_RTMP1_URL="$RTMP1_URL"
               save_config
               echo -e "${GREEN}Mirrored with diversified ingest servers.${NC}"
               sleep 1
               ;;
            11) break ;;
            *) echo -e "${RED}Invalid option${NC}" ; sleep 1 ;;
        esac
    done
}

configure_obs() {
    clear
    echo -e "${GREEN}=== OBS Configuration ===${NC}"
    build_site_urls

    echo -e "To stream to this server from OBS or another encoder:"
    echo -e "  ${YELLOW}Horizontal URL:${NC} rtmp://${SERVER_IP}:${PORT_RTMP}/${APP_NAME}"
    echo -e "  ${YELLOW}Vertical URL:${NC}   rtmp://${SERVER_IP}:${PORT_RTMP}/vertical"
    echo ""
    echo -e "--- Combined Chat ---"
    echo -e "You can use the combined chat as a browser source in OBS:"
    echo -e "  ${YELLOW}URL:${NC} ${DASHBOARD_URL}chat.html?twitch=YOUR_CHANNEL&youtube=YOUR_CHANNEL"
    echo -e "  (Replace YOUR_CHANNEL as needed)"
    echo ""
    echo -e "--- Security Key & Combined Chat Password ---"
    echo -e "CookieRTMPS requires a matching stream key to accept your stream."
    echo -e "${YELLOW}Note: This Stream Key is also the password for the settings website.${NC}"
    echo -e "Current Stream Key: ${OBS_KEY:-None}"
    echo -e "Enter new Stream Key (8+ letters/numbers/-/_, or press Enter to keep current): "
    read -r obs_input
    if [ -n "$obs_input" ]; then
        if [[ "$obs_input" =~ ^[A-Za-z0-9_-]{8,}$ ]]; then
            OBS_KEY="$obs_input"
            echo -e "${GREEN}Stream Key updated (also the settings website password).${NC}"
        else
            echo -e "${RED}Invalid stream key. Keeping current.${NC}"
        fi
    fi

    echo ""
    echo -e "--- Custom Application Name ---"
    echo -e "Current Path: /${APP_NAME}"
    echo -e "Enter new RTMP Path/Application name (e.g. cookies):"
    echo -e "(Leave blank to keep current):"
    read -r app_input
    if [ ! -z "$app_input" ]; then
        # Basic sanitization: remove everything except alphanumeric
        app_input=$(echo "$app_input" | sed 's/[^a-zA-Z0-9]//g')
        if [ ! -z "$app_input" ]; then
            APP_NAME="$app_input"
            echo -e "${GREEN}Application name updated to: $APP_NAME${NC}"
        else
             echo -e "${RED}Invalid application name. Keeping current: $APP_NAME${NC}"
        fi
    fi

    save_config
    sleep 2
}

configure_domain() {
    clear
    echo -e "${GREEN}=== Website Address / Cloudflare Reverse Proxy ===${NC}"
    echo -e "By default the settings website is reachable at your VPS IP: http://${SERVER_IP}/"
    echo -e "Current domain: ${SERVER_DOMAIN:-None (using VPS IP)}"
    echo -e "Cloudflare proxy: $([ "$CLOUDFLARE_PROXY" == "true" ] && echo "ON" || echo "OFF")"
    echo ""
    echo -e "Do you want to set up a Cloudflare reverse proxy (domain) for the settings website?"
    echo "1) Yes, use a Cloudflare domain"
    echo "2) No, use the VPS IP address"
    echo "3) Keep current setting"
    echo -e "Selection: \c"
    read -r cf_choice
    case $cf_choice in
        1)
            echo -e "Enter the domain or subdomain (e.g. stream.yourdomain.com):"
            read -r dom_input
            dom_input=$(echo "$dom_input" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9.-]//g')
            if [[ "$dom_input" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$ ]]; then
                SERVER_DOMAIN="$dom_input"
                CLOUDFLARE_PROXY="true"
                echo -e "${GREEN}Domain set to: $SERVER_DOMAIN${NC}"
                echo ""
                echo -e "${YELLOW}In your Cloudflare dashboard:${NC}"
                echo -e "  1. DNS: add an 'A' record for ${SERVER_DOMAIN} pointing to ${SERVER_IP}, Proxy status ON (orange cloud)."
                echo -e "  2. SSL/TLS: set encryption mode to 'Full'."
                echo -e "  3. Website: https://${SERVER_DOMAIN}/  (served on ports 80/443 of this VPS)"
                echo -e "  Note: Cloudflare's proxy does not carry RTMP. Point OBS at the VPS IP"
                echo -e "        (rtmp://${SERVER_IP}:${PORT_RTMP}/${APP_NAME}) or use a separate grey-cloud record for streaming."
            else
                echo -e "${RED}That is not a valid domain. Keeping current setting.${NC}"
            fi
            ;;
        2)
            SERVER_DOMAIN=""
            CLOUDFLARE_PROXY="false"
            echo -e "${GREEN}The settings website will use the VPS IP: http://${SERVER_IP}/${NC}"
            ;;
    esac
    DOMAIN_PROMPTED="true"
    save_config
    echo -e "Press Enter to continue..."
    read -r
}

require_stream_key() {
    while [ -z "$OBS_KEY" ]; do
        echo -e "${YELLOW}A stream key is required. It is what OBS uses to stream to this server,${NC}"
        echo -e "${YELLOW}and it is also the password for the settings website.${NC}"
        echo -e "Enter a stream key (at least 8 characters, letters/numbers/-/_ only):"
        read -r obs_input
        if [[ "$obs_input" =~ ^[A-Za-z0-9_-]{8,}$ ]]; then
            OBS_KEY="$obs_input"
            save_config
        else
            echo -e "${RED}Invalid stream key.${NC}"
        fi
    done
}

configure_whitelist() {
    while true; do
        clear
        echo -e "${GREEN}=== IP Whitelist Configuration ===${NC}"
        echo -e "Current Accepted IP: ${YELLOW}${ACCEPTED_IP:-None (Allow All)}${NC}"
        echo ""
        echo "1) Server's IP Address (For those who proxy or VPN Into the Server)"
        echo "2) Manual IP Address"
        echo "3) Clear IP Address"
        echo "4) Back to Main Menu"
        echo -e "Select an option: \c"
        read -r wl_opt

        case $wl_opt in
            1)
                SERVER_IP_FETCH=$(curl -4 -s ifconfig.me || echo "")
                LOCAL_IPS=$(hostname -I 2>/dev/null || ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "")
                
                WHITELIST_ITEMS="${SERVER_IP_FETCH}, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1"
                for lip in $LOCAL_IPS; do
                    if [ "$lip" != "127.0.0.1" ]; then
                        WHITELIST_ITEMS="${WHITELIST_ITEMS}, ${lip}"
                    fi
                done
                ACCEPTED_IP=$(echo "$WHITELIST_ITEMS" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$' | sort -u | tr '\n' ',' | sed 's/,$//')
                
                if [ ! -z "$ACCEPTED_IP" ]; then
                    echo -e "${GREEN}IP Whitelist updated to server IP & VPN subnets: $ACCEPTED_IP${NC}"
                else
                    echo -e "${RED}Failed to configure whitelist IPs.${NC}"
                fi
                save_config
                sleep 2
                ;;
            2)
                echo -e "Enter IP address to whitelist: \c"
                read -r ip_input
                if [ ! -z "$ip_input" ]; then
                    ACCEPTED_IP="$ip_input"
                    echo -e "${GREEN}IP Whitelist updated to: $ACCEPTED_IP${NC}"
                    save_config
                fi
                sleep 2
                ;;
            3)
                ACCEPTED_IP=""
                echo -e "${GREEN}IP Whitelist disabled. All IPs allowed.${NC}"
                save_config
                sleep 2
                ;;
            4|"")
                break
                ;;
            *)
                echo -e "${RED}Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

configure_titles() {
    while true; do
        clear
        echo -e "${GREEN}=== Stream Titles & Twitch API Configuration ===${NC}"
        echo "1) Base Title (Current: $STREAM_BASE_TITLE)"
        echo "2) Twitch Client ID (Current: ${TWITCH_CLIENT_ID:-None})"
        echo "3) Twitch OAuth Token (Current: ${TWITCH_OAUTH_TOKEN:-None})"
        echo "4) Twitch Broadcaster ID (Current: ${TWITCH_BROADCASTER_ID:-None})"
        echo "5) Reset Episode Count"
        echo "6) Back to Main Menu"
        echo -e "Select an option: \c"
        read -r title_opt

        case $title_opt in
            1)
                echo -e "Enter Base Stream Title:"
                read -r title_input
                STREAM_BASE_TITLE="$title_input"
                save_config
                ;;
            2)
                echo -e "Enter Twitch Client ID:"
                read -r title_input
                TWITCH_CLIENT_ID="$title_input"
                save_config
                ;;
            3)
                echo -e "Enter Twitch OAuth Token (Bearer):"
                read -r title_input
                TWITCH_OAUTH_TOKEN="$title_input"
                save_config
                ;;
            4)
                echo -e "Enter Twitch Broadcaster ID (Numeric):"
                read -r title_input
                TWITCH_BROADCASTER_ID="$title_input"
                save_config
                ;;
            5)
                mkdir -p ./data
                echo "1" > ./data/episode_count.txt
                echo -e "${GREEN}Episode count reset to 1.${NC}"
                sleep 1
                ;;
            6) break ;;
            *) echo -e "${RED}Invalid option${NC}" ; sleep 1 ;;
        esac
    done
}

configure_chat() {
    while true; do
        clear
        echo -e "${GREEN}=== Combined Chat Configuration ===${NC}"
        echo "Enter Channel Names for browser source embeds:"
        echo ""
        echo "1) Twitch Channel (Current: ${CHAT_TWITCH:-None})"
        echo "2) YouTube Channel (Current: ${CHAT_YOUTUBE:-None})"
        echo "3) Kick Channel (Current: ${CHAT_KICK:-None})"
        echo "4) TikTok Channel (Current: ${CHAT_TIKTOK:-None})"
        echo "5) Show Browser Source URL"
        echo "6) Back to Main Menu"
        echo -e "Select an option: \c"
        read -r chat_opt

        case $chat_opt in
            1)
                echo -e "Enter Twitch Channel Name:"
                read -r chat_input
                CHAT_TWITCH="$chat_input"
                save_config
                ;;
            2)
                echo -e "Enter YouTube Channel Name or Handle (e.g. cookiebaits or @cookiebaits):"
                read -r chat_input
                CHAT_YOUTUBE="$chat_input"
                save_config
                ;;
            3)
                echo -e "Enter Kick Channel Name:"
                read -r chat_input
                CHAT_KICK="$chat_input"
                save_config
                ;;
            4)
                echo -e "Enter TikTok Username (without @):"
                read -r chat_input
                CHAT_TIKTOK="$chat_input"
                save_config
                ;;
            5)
                build_site_urls
                CHAT_URL="${DASHBOARD_URL}chat.html?mode=unified&"
                if [ ! -z "$CHAT_TWITCH" ]; then CHAT_URL="${CHAT_URL}twitch=${CHAT_TWITCH}&"; fi
                if [ ! -z "$CHAT_YOUTUBE" ]; then CHAT_URL="${CHAT_URL}youtube=${CHAT_YOUTUBE}&"; fi
                if [ ! -z "$CHAT_KICK" ]; then CHAT_URL="${CHAT_URL}kick=${CHAT_KICK}&"; fi
                if [ ! -z "$CHAT_TIKTOK" ]; then CHAT_URL="${CHAT_URL}tiktok=${CHAT_TIKTOK}&"; fi
                echo -e "\n${YELLOW}=== CookieRTMPS Combined Chat Links ===${NC}"
                echo -e "${GREEN}1) OBS Browser Source URL (Unified 1-Window Overlay):${NC}"
                echo -e "   ${CYAN}${CHAT_URL%&}${NC}"
                echo -e "${GREEN}2) Web Control Dashboard (Full Preview Site):${NC}"
                echo -e "   ${CYAN}${DASHBOARD_URL}${NC}"
                echo -e "${GREEN}3) Multi-Column Grid View:${NC}"
                echo -e "   ${CYAN}${DASHBOARD_URL}chat.html?mode=columns${NC}"
                echo -e "\nPress Enter to continue..."
                read -r
                ;;
            6) break ;;
            *) echo -e "${RED}Invalid option${NC}" ; sleep 1 ;;
        esac
    done
}

configure_protection() {
    while true; do
        clear
        echo -e "${GREEN}=== Disconnection Protection ===${NC}"
        echo -e "When your stream disconnects or drops below the low bitrate, the server keeps your"
        echo -e "platforms live by looping your backup MP4. If you are not back within the set time,"
        echo -e "the backup video stops and the broadcast to all platforms ends."
        echo ""
        echo -e "Status: $([ "$NOALBS_ENABLED" == "true" ] && echo -e "${GREEN}ENABLED${NC}" || echo -e "${RED}DISABLED${NC}")"
        echo "1) Turn protection on/off"
        echo "2) Backup video MP4 URL (Current: ${BRB_VIDEO_URL:-Default ($DEFAULT_BRB_VIDEO_URL)})"
        echo "3) Low bitrate threshold (Current: $LOW_BITRATE kbps)"
        echo "4) Restore bitrate threshold (Current: $RESTORE_BITRATE kbps)"
        echo "5) Backup video duration before ending the broadcast (Current: $CLOUD_BRB_TIMEOUT seconds)"
        echo "6) Back to Main Menu"
        echo -e "${YELLOW}Changes apply after 'Build & Start Server'.${NC}"
        echo -e "Selection: \c"
        read -r prot_opt

        case $prot_opt in
            1)
                if [ "$NOALBS_ENABLED" == "true" ]; then NOALBS_ENABLED="false"; else NOALBS_ENABLED="true"; fi
                save_config
                echo -e "${GREEN}Disconnection protection is now $([ "$NOALBS_ENABLED" == "true" ] && echo ON || echo OFF).${NC}"
                sleep 1
                ;;
            2)
                echo -e "Enter a direct link to an .mp4 file (Enter keeps current, 'default' resets):"
                read -r input
                if [ "$input" == "default" ]; then
                    BRB_VIDEO_URL=""
                    save_config
                elif [ -n "$input" ]; then
                    if [[ "$input" =~ ^https?://[^[:space:]\"\'\`\$]+$ ]]; then
                        if curl -sfL -r 0-1023 -o /dev/null --max-time 20 "$input"; then
                            BRB_VIDEO_URL="$input"
                            save_config
                            echo -e "${GREEN}Backup video set. It is downloaded and formatted when the server starts.${NC}"
                        else
                            echo -e "${RED}That link could not be reached. Keeping the current video.${NC}"
                        fi
                    else
                        echo -e "${RED}Please enter a link starting with http:// or https://${NC}"
                    fi
                fi
                sleep 2
                ;;
            3)
                echo -e "Switch to the backup video when your bitrate falls below (kbps):"
                read -r input
                if [[ "$input" =~ ^[0-9]+$ ]] && [ "$input" -ge 1 ]; then
                    LOW_BITRATE="$input"
                    if [ "$RESTORE_BITRATE" -lt "$LOW_BITRATE" ]; then RESTORE_BITRATE="$LOW_BITRATE"; fi
                    save_config
                elif [ -n "$input" ]; then
                    echo -e "${RED}Please enter a whole number.${NC}"; sleep 1
                fi
                ;;
            4)
                echo -e "Switch back to live once your bitrate is at least (kbps, must be >= $LOW_BITRATE):"
                read -r input
                if [[ "$input" =~ ^[0-9]+$ ]] && [ "$input" -ge "$LOW_BITRATE" ]; then
                    RESTORE_BITRATE="$input"
                    save_config
                elif [ -n "$input" ]; then
                    echo -e "${RED}Please enter a whole number of at least $LOW_BITRATE.${NC}"; sleep 1
                fi
                ;;
            5)
                echo -e "How many seconds should the backup video play before the broadcast ends? (minimum 5)"
                read -r input
                if [[ "$input" =~ ^[0-9]+$ ]] && [ "$input" -ge 5 ]; then
                    CLOUD_BRB_TIMEOUT="$input"
                    save_config
                elif [ -n "$input" ]; then
                    echo -e "${RED}Please enter a whole number of at least 5.${NC}"; sleep 1
                fi
                ;;
            6) break ;;
            *) echo -e "${RED}Invalid option${NC}" ; sleep 1 ;;
        esac
    done
}

enable_bbr_and_tcp_optimizations() {
    echo -e "${GREEN}Configuring Google BBR & Network TCP Buffer Optimizations...${NC}"
    if [ "$EUID" -ne 0 ] && command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        SUDO=""
    fi

    $SUDO modprobe tcp_bbr 2>/dev/null || true

    SYSCTL_CONF="/etc/sysctl.d/99-stream-optimization.conf"
    echo -e "${YELLOW}Writing sysctl network tuning parameters to $SYSCTL_CONF ...${NC}"

    cat << 'SYSCTL_EOF' | $SUDO tee "$SYSCTL_CONF" >/dev/null
# Google BBR Congestion Control & Buffer Tuning
net.core.default_qdisc = fq
net.ipv4.tcp_congestion_control = bbr
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_notsent_lowat = 16384
SYSCTL_EOF

    $SUDO sysctl -p "$SYSCTL_CONF" 2>/dev/null || $SUDO sysctl --system 2>/dev/null || true
    echo -e "${GREEN}Network TCP buffer optimizations applied successfully.${NC}"
}

configure_optimizations() {
    clear
    echo -e "${GREEN}=== Optimizations ===${NC}"
    echo "Current Chunk Size: $CHUNK_SIZE (Default: 8192)"
    echo "Enter new Chunk Size (press Enter to keep current): "
    read -r input
    if [ ! -z "$input" ]; then
        CHUNK_SIZE="$input"
        save_config
        echo -e "${GREEN}Chunk size updated.${NC}"
    fi

    echo -e "\nApplying Google BBR and TCP optimizations..."
    enable_bbr_and_tcp_optimizations
    sleep 2
}

install_docker() {
    echo -e "${GREEN}Checking for Docker...${NC}"
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker not found. Installing...${NC}"
        # Basic docker install via official script
        curl -4 -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo systemctl start docker
        sudo systemctl enable docker
        rm get-docker.sh
        echo -e "${GREEN}Docker installed successfully.${NC}"
    else
        echo -e "${GREEN}Docker is already installed.${NC}"
    fi
    sleep 2
}

check_port() {
    local port=$1
    if command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$port "
    elif command -v netstat &> /dev/null; then
        netstat -tuln | grep -q ":$port "
    else
        return 1 # Cannot check
    fi
}

build_and_run() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed! Please run 'Install Docker' first.${NC}"
        sleep 2
        return
    fi

    echo -e "${YELLOW}Stopping and removing any old container instances and associated Docker volumes...${NC}"
    OLD_CONTAINERS=$(docker ps -a --format '{{.ID}} {{.Names}}' | grep -iE 'rtmp|cookie|prism' | awk '{print $1}')
    if [ ! -z "$OLD_CONTAINERS" ]; then
        docker stop $OLD_CONTAINERS 2>/dev/null || true
        docker rm -v -f $OLD_CONTAINERS 2>/dev/null || true
    fi
    OLD_VOLUMES=$(docker volume ls -q | grep -iE 'rtmp|cookie|prism' || true)
    if [ ! -z "$OLD_VOLUMES" ]; then
        docker volume rm -f $OLD_VOLUMES 2>/dev/null || true
    fi

    require_stream_key
    if [ "$DOMAIN_PROMPTED" != "true" ]; then
        configure_domain
    fi

    enable_bbr_and_tcp_optimizations

    echo -e "${YELLOW}Checking for port conflicts...${NC}"
    CONFLICTS=0
    declare -a PORTS_TO_CHECK=("$PORT_RTMP" "$PORT_HTTP" "$PORT_HTTPS")

    for port in "${PORTS_TO_CHECK[@]}"; do
        if check_port "$port"; then
            echo -e "${RED}Warning: Port $port appears to be in use on the host!${NC}"
            echo -e "${YELLOW}If this is another service, CookieRTMPS may fail to start.${NC}"
            CONFLICTS=1
        fi
    done

    if [ $CONFLICTS -eq 1 ]; then
        echo -e "${YELLOW}Port conflicts detected. Do you want to continue anyway?${NC}"
        echo "1) Yes, continue (CookieRTMPS will attempt to bind)"
        echo "2) Abort and return to Main Menu"
        echo -e "Selection: \c"
        read -r conflict_choice
        case $conflict_choice in
            1) echo -e "${GREEN}Continuing...${NC}" ;;
            *) return ;;
        esac
    else
        echo -e "${GREEN}No port conflicts detected.${NC}"
    fi

    # Auto-fill vertical from horizontal if horizontal is set but vertical is not (YouTube, Twitch, TikTok, Kick)
    # Automatically chooses an alternative ingest server to avoid conflicts
    if [ ! -z "$YOUTUBE_KEY" ] && [ -z "$V_YOUTUBE_KEY" ]; then
        V_YOUTUBE_KEY="$YOUTUBE_KEY"
        V_YOUTUBE_URL=$(get_alternative_url "youtube" "$YOUTUBE_URL")
    fi
    if [ ! -z "$TWITCH_KEY" ] && [ -z "$V_TWITCH_KEY" ]; then
        V_TWITCH_KEY="$TWITCH_KEY"
        V_TWITCH_URL=$(get_alternative_url "twitch" "$TWITCH_URL")
    fi
    if [ ! -z "$KICK_KEY" ] && [ -z "$V_KICK_KEY" ]; then
        V_KICK_KEY="$KICK_KEY"
        V_KICK_URL=$(get_alternative_url "kick" "$KICK_URL")
    fi

    # Hard Enforcement: Always ensure horizontal and vertical ingest URLs are different for YT, Twitch, Kick
    if [ ! -z "$YOUTUBE_KEY" ] && [ "$YOUTUBE_URL" == "$V_YOUTUBE_URL" ]; then
        V_YOUTUBE_URL=$(get_alternative_url "youtube" "$V_YOUTUBE_URL")
    fi
    if [ ! -z "$TWITCH_KEY" ] && [ "$TWITCH_URL" == "$V_TWITCH_URL" ]; then
        V_TWITCH_URL=$(get_alternative_url "twitch" "$V_TWITCH_URL")
    fi
    if [ ! -z "$KICK_KEY" ] && [ "$KICK_URL" == "$V_KICK_URL" ]; then
        V_KICK_URL=$(get_alternative_url "kick" "$V_KICK_URL")
    fi

    if [ ! -z "$TIKTOK_KEY" ] && [ -z "$V_TIKTOK_KEY" ]; then
        V_TIKTOK_KEY="$TIKTOK_KEY"
        V_TIKTOK_URL="$TIKTOK_URL"
    fi

    # Check if any keys are set
    ANY_KEY_SET=0
    for key in "$YOUTUBE_KEY" "$FACEBOOK_KEY" "$INSTAGRAM_KEY" "$TIKTOK_KEY" "$TWITCH_KEY" "$KICK_KEY" "$X_KEY" "$TROVO_KEY" "$RTMP1_KEY" \
               "$V_YOUTUBE_KEY" "$V_TWITCH_KEY" "$V_KICK_KEY" "$V_TIKTOK_KEY" "$V_FACEBOOK_KEY" "$V_INSTAGRAM_KEY" "$V_X_KEY" "$V_TROVO_KEY" "$V_RTMP1_KEY"; do
        if [ ! -z "$key" ]; then
            ANY_KEY_SET=1
            break
        fi
    done

    if [ "$ANY_KEY_SET" -eq 0 ]; then
        echo -e "${RED}No stream keys (Horizontal or Vertical) have been configured.${NC}"
        echo -e "${YELLOW}Aborting installation as per configuration rules.${NC}"
        echo -e "Press Enter to return to menu..."
        read -r
        return
    fi

    mkdir -p ./data/letsencrypt

    echo -e "${GREEN}Building Web Dashboard static assets...${NC}"
    if command -v npm &> /dev/null; then
        npm run build 2>/dev/null || true
    elif command -v bun &> /dev/null; then
        bun run build 2>/dev/null || true
    fi

    echo -e "${GREEN}Building Docker Image...${NC}"
    docker build -t cookie-rtmps .

    echo -e "${GREEN}Stopping any existing container...${NC}"
    docker stop cookie-rtmps 2>/dev/null || true
    docker rm cookie-rtmps 2>/dev/null || true

    echo -e "${GREEN}Starting container...${NC}"

    # RTMP ingest, website over HTTP, and website over HTTPS (Cloudflare 'Full' SSL connects to 443)
    PORT_MAPS="-p ${PORT_RTMP}:1935 -p ${PORT_HTTP}:80 -p ${PORT_HTTPS}:8443"

    # Start the container
    docker run -d --name cookie-rtmps \
        $PORT_MAPS \
        --restart unless-stopped \
        -e YOUTUBE_URL="$YOUTUBE_URL" \
        -e YOUTUBE_KEY="$YOUTUBE_KEY" \
        -e FACEBOOK_URL="$FACEBOOK_URL" \
        -e FACEBOOK_KEY="$FACEBOOK_KEY" \
        -e INSTAGRAM_URL="$INSTAGRAM_URL" \
        -e INSTAGRAM_KEY="$INSTAGRAM_KEY" \
        -e TIKTOK_URL="$TIKTOK_URL" \
        -e TIKTOK_KEY="$TIKTOK_KEY" \
        -e TIKTOK_SL_TOKEN="$TIKTOK_SL_TOKEN" \
        -e TIKTOK_TITLE="$TIKTOK_TITLE" \
        -e TIKTOK_GAME_ID="$TIKTOK_GAME_ID" \
        -e TWITCH_URL="$TWITCH_URL" \
        -e TWITCH_KEY="$TWITCH_KEY" \
        -e KICK_URL="$KICK_URL" \
        -e KICK_KEY="$KICK_KEY" \
        -e X_URL="$X_URL" \
        -e X_KEY="$X_KEY" \
        -e TROVO_URL="$TROVO_URL" \
        -e TROVO_KEY="$TROVO_KEY" \
        -e RTMP1_URL="$RTMP1_URL" \
        -e RTMP1_KEY="$RTMP1_KEY" \
        -e V_YOUTUBE_URL="$V_YOUTUBE_URL" \
        -e V_YOUTUBE_KEY="$V_YOUTUBE_KEY" \
        -e V_TWITCH_URL="$V_TWITCH_URL" \
        -e V_TWITCH_KEY="$V_TWITCH_KEY" \
        -e V_KICK_URL="$V_KICK_URL" \
        -e V_KICK_KEY="$V_KICK_KEY" \
        -e V_TIKTOK_URL="$V_TIKTOK_URL" \
        -e V_TIKTOK_KEY="$V_TIKTOK_KEY" \
        -e V_FACEBOOK_URL="$V_FACEBOOK_URL" \
        -e V_FACEBOOK_KEY="$V_FACEBOOK_KEY" \
        -e V_INSTAGRAM_URL="$V_INSTAGRAM_URL" \
        -e V_INSTAGRAM_KEY="$V_INSTAGRAM_KEY" \
        -e V_X_URL="$V_X_URL" \
        -e V_X_KEY="$V_X_KEY" \
        -e V_TROVO_URL="$V_TROVO_URL" \
        -e V_TROVO_KEY="$V_TROVO_KEY" \
        -e V_RTMP1_URL="$V_RTMP1_URL" \
        -e V_RTMP1_KEY="$V_RTMP1_KEY" \
        -e OBS_KEY="$OBS_KEY" \
        -e CHAT_HEX_KEY="$CHAT_HEX_KEY" \
        -e CHAT_TWITCH="$CHAT_TWITCH" \
        -e CHAT_YOUTUBE="$CHAT_YOUTUBE" \
        -e CHAT_KICK="$CHAT_KICK" \
        -e CHAT_TIKTOK="$CHAT_TIKTOK" \
        -e APP_NAME="$APP_NAME" \
        -e ACCEPTED_IP="$ACCEPTED_IP" \
        -e CHUNK_SIZE="$CHUNK_SIZE" \
        -e STREAM_BASE_TITLE="$STREAM_BASE_TITLE" \
        -e TWITCH_CLIENT_ID="$TWITCH_CLIENT_ID" \
        -e TWITCH_OAUTH_TOKEN="$TWITCH_OAUTH_TOKEN" \
        -e TWITCH_BROADCASTER_ID="$TWITCH_BROADCASTER_ID" \
        -e SERVER_DOMAIN="$SERVER_DOMAIN" \
        -e NOALBS_ENABLED="$NOALBS_ENABLED" \
        -e LOW_BITRATE="$LOW_BITRATE" \
        -e RESTORE_BITRATE="$RESTORE_BITRATE" \
        -e CLOUD_BRB_TIMEOUT="$CLOUD_BRB_TIMEOUT" \
        -e BRB_VIDEO_URL="$BRB_VIDEO_URL" \
        -v "$(pwd)/data:/app/data" \
        -v "$(pwd)/data/letsencrypt:/etc/letsencrypt" \
        cookie-rtmps

    if [ $? -eq 0 ]; then
        build_site_urls
        echo -e "${GREEN}Container 'cookie-rtmps' is running!${NC}"
        echo -e "You can stream to: rtmp://${SERVER_IP}:${PORT_RTMP}/${APP_NAME}"
        echo -e "Vertical stream:  rtmp://${SERVER_IP}:${PORT_RTMP}/vertical"
        echo -e "Settings website: ${DASHBOARD_URL}  (password: your stream key)"
        if [ "$NOALBS_ENABLED" == "true" ]; then
            echo -e "${YELLOW}Disconnection protection is ON. On first start the backup video is downloaded and formatted;${NC}"
            echo -e "${YELLOW}streams go out to platforms once that finishes (usually under a few minutes).${NC}"
        fi
        echo -e "${YELLOW}Combined Chat Links:${NC}"
        echo -e "  Combined Chat Config Page: ${CHAT_CONFIG_URL}"
        echo -e "  OBS Overlay (Unified):     ${OBS_OVERLAY_URL}"
        echo -e "  Web Dashboard:             ${DASHBOARD_URL}"

        echo -e "${YELLOW}Resetting services and running integration tests...${NC}"
        docker restart cookie-rtmps
        sleep 3

        # Run Integration Tests
        if [ -f "./integration_test.sh" ]; then
            chmod +x ./integration_test.sh
            ./integration_test.sh
        fi
    else
        echo -e "${RED}Failed to start container.${NC}"
    fi
    echo -e "Press Enter to continue..."
    read -r
}

view_logs() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed!${NC}"
        sleep 2
        return
    fi

    echo -e "${YELLOW}Showing live logs for cookie-rtmps (Filtering /stat polling requests)...${NC}"
    echo -e "${YELLOW}(Press Ctrl+C to exit log view)${NC}\n"
    # Use a subshell and trap INT to ensure script doesn't exit on Ctrl+C
    (
        trap 'exit 0' INT
        docker logs --since 24h -f cookie-rtmps 2>&1 | awk '
            /GET \/stat HTTP/ { next }
            /ERROR|error|FAIL|fail|REJECTED|disconnect|Disconnect|failed|Failed/ {
                print "\033[0;31m" $0 "\033[0m"
                fflush()
                next
            }
            /WARNING|warning|LOW|low|taking over/ {
                print "\033[1;33m" $0 "\033[0m"
                fflush()
                next
            }
            /\[Protection\]/ {
                print "\033[0;36m" $0 "\033[0m"
                fflush()
                next
            }
            {
                print $0
                fflush()
            }
        '
    )

    while true; do
        echo -e "\n${GREEN}=== Log Options ===${NC}"
        echo "1) Return to Main Menu"
        echo "2) Clear Logs"
        echo -e "Select an option: \c"
        read -r log_opt

        case $log_opt in
            1) break ;;
            2)
                echo -e "${YELLOW}Clearing logs...${NC}"
                # Truncate internal logs
                docker exec cookie-rtmps sh -c 'truncate -s 0 /var/log/nginx/access.log /var/log/nginx/error.log' 2>/dev/null || true
                # Truncate Docker's own log file for the container
                LOG_PATH=$(docker inspect --format='{{.LogPath}}' cookie-rtmps 2>/dev/null)
                if [ ! -z "$LOG_PATH" ]; then
                    sudo truncate -s 0 "$LOG_PATH" 2>/dev/null || truncate -s 0 "$LOG_PATH" 2>/dev/null || echo -e "${RED}Failed to truncate Docker log file. You may need sudo.${NC}"
                fi
                echo -e "${GREEN}Logs cleared.${NC}"
                sleep 1
                ;;
            *) echo -e "${RED}Invalid option${NC}" ; sleep 1 ;;
        esac
    done
}

deep_cleanup_ports_and_processes() {
    echo -e "${YELLOW}Cleaning up host processes and unbinding ports (1935, 8081, 8443, 19350-19359; port 80 preserved)...${NC}"
    if [ "$EUID" -ne 0 ] && command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        SUDO=""
    fi

    # NOTE: Port 80 is strictly preserved and never stopped, killed, or unbound.
    # Host webservers (apache2, nginx, lighttpd) running on port 80 are not touched.

    local CANDIDATE_PORTS=("$PORT_RTMP" "$PORT_HTTP" "$PORT_STATS" 8081 1935 8443 19350 19351 19352 19353 19354 19355 19356 19357 19358 19359)
    local PORTS=()
    for p in "${CANDIDATE_PORTS[@]}"; do
        # Do not include port 80 under any circumstances
        if [ "$p" != "80" ] && [ "$p" != "443" ] && [ -n "$p" ]; then
            PORTS+=("$p")
        fi
    done

    # Find and stop any docker containers publishing application ports (excluding port 80)
    if command -v docker &> /dev/null; then
        for port in "${PORTS[@]}"; do
            local cids
            cids=$(docker ps -q --filter "publish=$port" 2>/dev/null || true)
            if [ -n "$cids" ]; then
                docker stop $cids 2>/dev/null || true
                docker rm -v -f $cids 2>/dev/null || true
            fi
        done
    fi

    for port in "${PORTS[@]}"; do
        if command -v fuser &> /dev/null; then
            $SUDO fuser -k -9 "${port}/tcp" 2>/dev/null || true
            $SUDO fuser -k -9 "${port}/udp" 2>/dev/null || true
        fi
        if command -v lsof &> /dev/null; then
            local pids
            pids=$($SUDO lsof -t -i :"$port" 2>/dev/null || true)
            if [ -n "$pids" ]; then
                $SUDO kill -9 $pids 2>/dev/null || true
            fi
        fi
        if command -v ss &> /dev/null; then
            local pids
            pids=$($SUDO ss -lptn "sport = :$port" 2>/dev/null | grep -oP 'pid=\K\d+' | sort -u || true)
            if [ -n "$pids" ]; then
                $SUDO kill -9 $pids 2>/dev/null || true
            fi
        fi
    done

    # Terminate leftover host helper processes if any were spawned outside container
    $SUDO pkill -f "tiktok_pusher" 2>/dev/null || true
    $SUDO pkill -f "stream_protection" 2>/dev/null || true
    $SUDO pkill -x "mediamtx" 2>/dev/null || true
    $SUDO pkill -f "stream_validator" 2>/dev/null || true
    $SUDO pkill -f "gunicorn" 2>/dev/null || true
    $SUDO pkill -f "stunnel" 2>/dev/null || true
    # Note: Host nginx is intentionally NOT killed to avoid affecting port 80 web services
}

stop_and_uninstall() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed!${NC}"
        sleep 2
        return
    fi
    echo -e "${YELLOW}Stopping services, unbinding all ports, and performing complete removal...${NC}"
    OLD_CONTAINERS=$(docker ps -a --format '{{.ID}} {{.Names}}' | grep -iE 'rtmp|cookie|prism' | awk '{print $1}')
    if [ ! -z "$OLD_CONTAINERS" ]; then
        docker stop $OLD_CONTAINERS 2>/dev/null && echo -e "${GREEN}Containers stopped.${NC}" || true
        docker rm -v -f $OLD_CONTAINERS 2>/dev/null && echo -e "${GREEN}Containers and volumes removed.${NC}" || true
    else
        docker stop cookie-rtmps 2>/dev/null && echo -e "${GREEN}Container stopped.${NC}" || echo -e "${RED}Container not running.${NC}"
        docker rm -v -f cookie-rtmps 2>/dev/null && echo -e "${GREEN}Container and volumes removed.${NC}" || true
    fi

    echo -e "${YELLOW}Unbinding all ports and killing associated processes...${NC}"
    deep_cleanup_ports_and_processes

    OLD_VOLUMES=$(docker volume ls -q | grep -iE 'rtmp|cookie|prism' || true)
    if [ ! -z "$OLD_VOLUMES" ]; then
        docker volume rm -f $OLD_VOLUMES 2>/dev/null && echo -e "${GREEN}Matching Docker volumes removed.${NC}" || true
    fi

    OLD_IMAGES=$(docker images --format '{{.ID}} {{.Repository}}' | grep -iE 'rtmp|cookie|prism' | awk '{print $1}')
    if [ ! -z "$OLD_IMAGES" ]; then
        docker rmi -f $OLD_IMAGES 2>/dev/null && echo -e "${GREEN}Images removed.${NC}" || true
    else
        docker rmi -f cookie-rtmps 2>/dev/null && echo -e "${GREEN}Image removed.${NC}" || true
    fi

    echo -e "${YELLOW}Pruning Docker build cache, volumes, networks, and unused images...${NC}"
    docker volume prune -f 2>/dev/null || true
    docker network prune -f 2>/dev/null || true
    docker image prune -a -f 2>/dev/null || true
    docker builder prune -a -f 2>/dev/null || true
    docker system prune -a -f 2>/dev/null || true

    echo -e "${YELLOW}Removing local configuration files, build assets, and hosted web pages...${NC}"
    rm -f rtmp_config.env
    rm -rf ./data
    rm -rf ./dist
    rm -rf ./dist-ssr
    rm -rf ./.vite

    # Clean up any static web assets hosted on local webroot directories
    if [ -d "/usr/local/nginx/html" ]; then
        sudo rm -rf /usr/local/nginx/html/* 2>/dev/null || rm -rf /usr/local/nginx/html/* 2>/dev/null || true
    fi
    if [ -d "/var/www/html" ]; then
        sudo rm -rf /var/www/html/* 2>/dev/null || rm -rf /var/www/html/* 2>/dev/null || true
    fi

    echo -e "${GREEN}Local configuration, compiled web pages, and hosted files removed successfully.${NC}"

    echo -e "${GREEN}CookieRTMPS, hosted web pages, and all cached components have been completely uninstalled and all streaming ports unbound (port 80 preserved).${NC}"
    sleep 3
}

# Cache Server IP for UI Performance
SERVER_IP=$(curl -4 -s --max-time 5 ifconfig.me || hostname -I 2>/dev/null | awk '{print $1}')
SERVER_IP=${SERVER_IP:-"<your_server_ip>"}

build_site_urls() {
    local base
    if [ -n "$SERVER_DOMAIN" ]; then
        base="https://${SERVER_DOMAIN}"
    elif [ "$PORT_HTTP" != "80" ]; then
        base="http://${SERVER_IP}:${PORT_HTTP}"
    else
        base="http://${SERVER_IP}"
    fi
    DASHBOARD_URL="${base}/"
    CHAT_CONFIG_URL="${base}/${CHAT_HEX_KEY}"
    OBS_OVERLAY_URL="${base}/chat.html?key=${CHAT_HEX_KEY}&mode=unified"
}

while true; do
    clear
    build_site_urls
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}     CookieRTMPS Quick Installer      ${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${YELLOW}Quick Reference:${NC}"
    echo -e "  RTMP Ingest:     rtmp://${SERVER_IP}:${PORT_RTMP}/${APP_NAME}"
    echo -e "  Vertical Ingest: rtmp://${SERVER_IP}:${PORT_RTMP}/vertical"
    echo -e "  Combined Chat Config Page: ${CHAT_CONFIG_URL}"
    echo -e "  Web Dashboard:   ${DASHBOARD_URL}  (password: stream key)"
    echo "-------------------------------------"
    echo "1) Install Docker (if not installed)"
    echo "2) Configure Stream Keys (Horizontal)"
    echo "3) Configure Stream Keys (Vertical)"
    echo "4) Configure OBS Setup & Security Key"
    echo "5) Configure IP Whitelist (Optional)"
    echo "6) Configure Website Address / Cloudflare Reverse Proxy"
    echo "7) Configure Optimizations (Chunk Size)"
    echo "8) Configure Disconnection Protection (Backup Video)"
    echo "9) Build & Start Server"
    echo "10) Run Integration Tests"
    echo "11) Stop Server & Uninstall"
    echo "12) View Logs"
    echo "13) Quit"
    echo -e "Select an option: \c"
    read -r option

    case $option in
        1) install_docker ;;
        2) configure_keys ;;
        3) configure_vertical_keys ;;
        4) configure_obs ;;
        5) configure_whitelist ;;
        6) configure_domain ;;
        7) configure_optimizations ;;
        8) configure_protection ;;
        9) build_and_run ;;
        10) if [ -f "./integration_test.sh" ]; then chmod +x ./integration_test.sh; ./integration_test.sh; else echo -e "${RED}Test script not found.${NC}"; fi; echo -e "Press Enter to continue..."; read -r ;;
        11) stop_and_uninstall ;;
        12) view_logs ;;
        13|q|Q) clear; echo -e "${GREEN}Goodbye!${NC}"; break ;;
        *) echo -e "${RED}Invalid option${NC}"; sleep 1 ;;
    esac
done
