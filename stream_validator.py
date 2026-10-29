from flask import Flask, request, Response
import hmac
import json
import os
import logging
from urllib.parse import parse_qs
import threading
import subprocess
from datetime import datetime
import ipaddress

app = Flask(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

active_pushers = {}

# Configuration
VALID_KEYS = []
DESTINATION_KEYS = {
    'youtube': os.getenv('YOUTUBE_KEY', ''),
    'twitch': os.getenv('TWITCH_KEY', ''),
    'kick': os.getenv('KICK_KEY', ''),
    'x': os.getenv('X_KEY', ''),
    'facebook': os.getenv('FACEBOOK_KEY', ''),
    'instagram': os.getenv('INSTAGRAM_KEY', ''),
    'tiktok': os.getenv('TIKTOK_KEY', ''),
    'rtmp1': os.getenv('RTMP1_KEY', ''),
    'rtmp2': os.getenv('RTMP2_KEY', ''),
    'rtmp3': os.getenv('RTMP3_KEY', ''),
    'trovo': os.getenv('TROVO_KEY', ''),
    'obs': os.getenv('OBS_KEY', ''),
}

# Vertical Keys
for i in ['YOUTUBE', 'TWITCH', 'TIKTOK', 'KICK', 'FACEBOOK', 'INSTAGRAM', 'X', 'TROVO', 'RTMP1']:
    DESTINATION_KEYS[f'v_{i.lower()}'] = os.getenv(f'V_{i}_KEY', '')

ACCEPTED_IP = os.getenv('ACCEPTED_IP', '')
EPISODE_FILE = '/app/data/episode_count.txt'
TITLE_LOCK = threading.Lock()

# Populate VALID_KEYS
for key_name, key_value in DESTINATION_KEYS.items():
    if key_value:
        VALID_KEYS.append(key_value)

if VALID_KEYS:
    obscured_keys = [k[:2] + '...' + k[-2:] if len(k) > 4 else '****' for k in VALID_KEYS]
    app.logger.info(f"Stream validator starting. Valid keys: {obscured_keys}")
else:
    app.logger.warning("Stream validator starting. No keys found in environment.")

if ACCEPTED_IP:
    app.logger.info(f"IP Whitelist active: {ACCEPTED_IP}")

def is_ip_allowed(client_ip_str, accepted_ip_setting):
    if not accepted_ip_setting:
        return True
    try:
        client_ip = ipaddress.ip_address(client_ip_str)

        for item in accepted_ip_setting.split(','):
            item = item.strip()
            if not item:
                continue
            try:
                if '/' in item:
                    net = ipaddress.ip_network(item, strict=False)
                    if client_ip in net:
                        return True
                else:
                    allowed_ip = ipaddress.ip_address(item)
                    if client_ip == allowed_ip:
                        return True
            except ValueError:
                continue
    except ValueError:
        pass
    return False

def get_episode_count():
    try:
        if not os.path.exists(EPISODE_FILE):
            os.makedirs(os.path.dirname(EPISODE_FILE), exist_ok=True)
            with open(EPISODE_FILE, 'w') as f:
                f.write('1')
            return 1
        with open(EPISODE_FILE, 'r') as f:
            return int(f.read().strip())
    except Exception as e:
        app.logger.error(f"Error reading episode count: {e}")
        return 1

def increment_episode_count():
    with TITLE_LOCK:
        count = get_episode_count()
        try:
            with open(EPISODE_FILE, 'w') as f:
                f.write(str(count + 1))
        except Exception as e:
            app.logger.error(f"Error writing episode count: {e}")

def run_update_titles():
    # Only run if Twitch credentials exist
    if not (os.getenv('TWITCH_CLIENT_ID') and os.getenv('TWITCH_OAUTH_TOKEN') and os.getenv('TWITCH_BROADCASTER_ID')):
        return

    count = get_episode_count()
    date_str = datetime.now().strftime('%Y-%m-%d')
    base_title = os.getenv('STREAM_BASE_TITLE', 'Live Stream')
    full_title = f"{base_title} | Ep.{count} | {date_str}"

    app.logger.info(f"Updating Twitch title to: {full_title}")

    try:
        # Call the update script
        subprocess.run(['python3', '/app/update_titles.py', full_title], check=False)
        # Note: We don't increment here to avoid double increments from dual horizontal/vertical streams
        # We'll increment on publish_done of the primary app.
    except Exception as e:
        app.logger.error(f"Failed to update titles: {e}")

@app.route('/validate', methods=['POST'])
def validate():
    raw_data = request.get_data(as_text=True)
    parsed_data = parse_qs(raw_data)
    stream_key_attempt = parsed_data.get('name', [''])[0]

    # Robust client IP extraction for VPN and proxy setups
    client_ip = (
        request.form.get('addr') or
        request.args.get('addr') or
        (parsed_data.get('addr') and parsed_data.get('addr')[0]) or
        request.headers.get('CF-Connecting-IP') or
        request.headers.get('X-Real-IP') or
        request.headers.get('X-Forwarded-For') or
        request.remote_addr
    )
    if client_ip and ',' in client_ip:
        client_ip = client_ip.split(',')[0].strip()
    if not client_ip:
        client_ip = '127.0.0.1'

    # IP Whitelist Check for external streams
    if ACCEPTED_IP and not is_ip_allowed(client_ip, ACCEPTED_IP):
        app.logger.warning(f"REJECTED IP: {client_ip}")
        return Response('IP not whitelisted', status=403)

    if not VALID_KEYS:
        return Response('No keys configured', status=403)

    if stream_key_attempt in VALID_KEYS:
        app.logger.info(f"ACCEPTED stream from {client_ip}")

        # Update titles in background to not block Nginx
        threading.Thread(target=run_update_titles).start()
        
        app_name = parsed_data.get('app', [''])[0]
        pusher_key = f"{app_name}_{stream_key_attempt}"
        
        if app_name == os.getenv('APP_NAME', 'live') and os.getenv('TIKTOK_URL') == "auto":
            if pusher_key not in active_pushers:
                app.logger.info(f"Starting TikTok auto-pusher for horizontal stream...")
                active_pushers[pusher_key] = subprocess.Popen(
                    ['python3', '/app/tiktok_pusher.py', f"rtmp://127.0.0.1:19352/{app_name}/{stream_key_attempt}"]
                )
        
        if app_name == 'vertical' and os.getenv('V_TIKTOK_URL') == "auto":
            if pusher_key not in active_pushers:
                app.logger.info(f"Starting TikTok auto-pusher for vertical stream...")
                active_pushers[pusher_key] = subprocess.Popen(
                    ['python3', '/app/tiktok_pusher.py', f"rtmp://127.0.0.1:19352/{app_name}/{stream_key_attempt}"]
                )

        return Response('OK', status=200)
    else:
        app.logger.warning(f"REJECTED invalid key from {client_ip}")
        return Response('Invalid stream key', status=403)

@app.route('/publish_done', methods=['POST', 'GET'])
def publish_done():
    # Nginx sends GET by default for on_publish_done in some versions, but usually POST
    app_name = request.args.get('app', '')
    stream_key = request.args.get('name', '')
    
    if not app_name or not stream_key:
        raw_data = request.get_data(as_text=True)
        parsed_data = parse_qs(raw_data)
        app_name = parsed_data.get('app', [app_name])[0]
        stream_key = parsed_data.get('name', [stream_key])[0]

    pusher_key = f"{app_name}_{stream_key}"
    
    if pusher_key in active_pushers:
        app.logger.info(f"Terminating TikTok auto-pusher for {pusher_key}...")
        active_pushers[pusher_key].terminate()
        del active_pushers[pusher_key]

    if app_name == os.getenv('APP_NAME', 'live'):
        # Increment episode count when horizontal stream finishes
        increment_episode_count()
        app.logger.info("Horizontal stream finished. Episode count incremented.")
    return Response('OK', status=200)

@app.route('/health', methods=['GET'])
def health_check():
    return Response('OK', status=200)

@app.route('/yt_video_id', methods=['GET'])
def yt_video_id():
    channel = request.args.get('channel', '').strip()
    if not channel:
        return Response('Missing channel', status=400)

    # Direct 11-character Video ID bypass
    if len(channel) == 11 and not channel.startswith('@') and '/' not in channel and ' ' not in channel:
        return Response(channel, mimetype='text/plain')

    # Extract clean handle from URL or handle string
    clean_handle = channel
    if 'youtube.com/' in clean_handle or 'youtu.be/' in clean_handle:
        try:
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(clean_handle if clean_handle.startswith('http') else 'https://' + clean_handle)
            qs = parse_qs(parsed.query)
            if 'v' in qs and len(qs['v'][0]) == 11:
                return Response(qs['v'][0], mimetype='text/plain')
            parts = [p for p in parsed.path.split('/') if p]
            for p in parts:
                if p.startswith('@'):
                    clean_handle = p
                    break
                if p not in ('c', 'user', 'channel', 'live', 'watch'):
                    clean_handle = p
        except Exception:
            pass
    clean_handle = clean_handle.lstrip('@').rstrip('/')
    if clean_handle.endswith('/live'):
        clean_handle = clean_handle[:-5]

    candidate_urls = [
        f"https://www.youtube.com/@{clean_handle}/live",
        f"https://www.youtube.com/c/{clean_handle}/live",
        f"https://www.youtube.com/channel/{clean_handle}/live"
    ]

    import urllib.request
    import re

    for target_url in candidate_urls:
        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Cookie': 'CONSENT=PENDING+999; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg'
                }
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                final_url = response.geturl()
                m_url = re.search(r'watch\?v=([a-zA-Z0-9_-]{11})', final_url)
                if m_url:
                    return Response(m_url.group(1), mimetype='text/plain')

                html = response.read().decode('utf-8', errors='ignore')
                
                m = re.search(r'"liveStreamability":.*? "videoId":"([a-zA-Z0-9_-]{11})"', html)
                if not m:
                    m = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
                if not m:
                    m = re.search(r'href="/watch\?v=([a-zA-Z0-9_-]{11})"', html)
                if m:
                    return Response(m.group(1), mimetype='text/plain')
        except Exception as e:
            app.logger.debug(f"Error checking candidate URL {target_url} for {channel}: {e}")

    return Response('Live video not found', status=404)

@app.route('/api/yt_live_messages', methods=['GET'])
def yt_live_messages():
    channel = request.args.get('channel', '').strip()
    video_id = request.args.get('v', '').strip()

    if len(channel) == 11 and not channel.startswith('@') and '/' not in channel:
        video_id = channel

    if not video_id and channel:
        # Resolve video ID
        try:
            with app.test_client() as client:
                resp = client.get(f'/yt_video_id?channel={channel}')
                if resp.status_code == 200:
                    video_id = resp.get_data(as_text=True).strip()
        except Exception:
            pass

    if not video_id:
        return Response(json.dumps({'status': 'waiting', 'isLive': False, 'channel': channel, 'messages': []}), mimetype='application/json')

    import urllib.request
    import re
    try:
        req = urllib.request.Request(
            f"https://www.youtube.com/live_chat?v={video_id}",
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            m = re.search(r'window\["ytInitialData"\]\s*=\s*({.+?});\s*</script>', html)
            messages = []
            if m:
                try:
                    yt_data = json.loads(m.group(1))
                    actions = yt_data.get('contents', {}).get('liveChatRenderer', {}).get('actions', [])
                    for act in actions:
                        item = act.get('addChatItemAction', {}).get('item', {}).get('liveChatTextMessageRenderer')
                        if item:
                            author = item.get('authorName', {}).get('simpleText', 'YouTubeUser')
                            runs = item.get('message', {}).get('runs', [])
                            text = ''.join([r.get('text', '') for r in runs])
                            msg_id = item.get('id', '')
                            if text:
                                messages.append({
                                    'id': msg_id,
                                    'author': author,
                                    'text': text,
                                    'color': '#ef4444',
                                    'timestamp': int(item.get('timestampUsec', 0)) / 1000
                                })
                except Exception:
                    pass
            return Response(json.dumps({'status': 'ok', 'videoId': video_id, 'isLive': True, 'messages': messages[-25:]}), mimetype='application/json')
    except Exception as e:
        return Response(json.dumps({'status': 'error', 'videoId': video_id, 'isLive': True, 'messages': []}), mimetype='application/json')

@app.route('/api/chat_hex_key', methods=['GET'])
def get_chat_hex_key():
    key = os.getenv('CHAT_HEX_KEY', '')
    if not key:
        try:
            with open('/app/data/chat_hex_key.txt', 'r') as f:
                key = f.read().strip()
        except Exception:
            pass
    if not key:
        key = 'c00k1e88'
    return Response(json.dumps({'hexKey': key}), mimetype='application/json')

def json_response(payload, status=200):
    return Response(json.dumps(payload), status=status, mimetype='application/json')

def password_matches(candidate):
    # The website password is the OBS stream key set in the installer menu.
    obs_key = os.getenv('OBS_KEY', '').strip()
    if not obs_key:
        return False
    return hmac.compare_digest(candidate.strip().encode(), obs_key.encode())

def is_authorized():
    return password_matches(request.headers.get('X-Stream-Key', ''))

def unauthorized():
    return json_response({'success': False, 'message': 'Stream key required'}, 401)

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    obs_key = os.getenv('OBS_KEY', '').strip()
    return json_response({
        'isPasswordProtected': True,
        'hasObsKey': bool(obs_key),
    })

@app.route('/api/auth/verify', methods=['POST'])
def auth_verify():
    data = request.get_json(silent=True) or {}
    password = data.get('password') or ''
    if not os.getenv('OBS_KEY', '').strip():
        return json_response({'success': False, 'message': 'No stream key is set yet. Set one from the installer menu (Configure OBS stream key).'}, 401)
    if isinstance(password, str) and password_matches(password):
        return json_response({'success': True})
    return json_response({'success': False, 'message': 'Invalid stream key'}, 401)

@app.route('/api/episode', methods=['GET', 'POST'])
def episode():
    if not is_authorized():
        return unauthorized()
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        action = data.get('action')
        with TITLE_LOCK:
            count = get_episode_count()
            if action == 'increment':
                count += 1
            elif action == 'decrement':
                count = max(1, count - 1)
            elif action == 'set' and isinstance(data.get('count'), int) and 1 <= data['count'] <= 100000:
                count = data['count']
            else:
                return json_response({'success': False, 'message': 'Invalid action'}, 400)
            try:
                with open(EPISODE_FILE, 'w') as f:
                    f.write(str(count))
            except OSError as e:
                app.logger.error(f"Error writing episode count: {e}")
                return json_response({'success': False, 'message': 'Could not save episode count'}, 500)
        return json_response({'success': True, 'count': count})
    return json_response({'count': get_episode_count()})

@app.route('/api/protection', methods=['GET'])
def protection_status():
    if not is_authorized():
        return unauthorized()
    try:
        with open(os.getenv('PROTECTION_STATUS_FILE', '/tmp/stream_protection.json')) as f:
            data = json.load(f)
    except (OSError, ValueError):
        return json_response({'running': False})
    data['running'] = True
    data['videoUrl'] = os.getenv('BRB_VIDEO_URL', '')
    return json_response(data)

DISABLE_WEB_UI_FLAG = '/app/data/disable_web_ui.flag'

if os.getenv('DISABLE_WEB_UI', 'false').lower() == 'true':
    try:
        os.makedirs('/app/data', exist_ok=True)
        open(DISABLE_WEB_UI_FLAG, 'a').close()
    except Exception as e:
        app.logger.error(f"Error creating disable_web_ui.flag: {e}")

@app.route('/api/web_ui/status', methods=['GET'])
def web_ui_status():
    if not is_authorized():
        return unauthorized()
    is_disabled = os.path.exists(DISABLE_WEB_UI_FLAG)
    return json_response({'disabled': is_disabled})

@app.route('/api/web_ui/toggle', methods=['POST'])
def web_ui_toggle():
    if not is_authorized():
        return unauthorized()
    data = request.get_json(silent=True) or {}
    target_state = data.get('disabled')
    try:
        os.makedirs('/app/data', exist_ok=True)
        if target_state is None:
            if os.path.exists(DISABLE_WEB_UI_FLAG):
                os.remove(DISABLE_WEB_UI_FLAG)
                new_disabled = False
            else:
                open(DISABLE_WEB_UI_FLAG, 'w').close()
                new_disabled = True
        elif target_state is True:
            open(DISABLE_WEB_UI_FLAG, 'w').close()
            new_disabled = True
        else:
            if os.path.exists(DISABLE_WEB_UI_FLAG):
                os.remove(DISABLE_WEB_UI_FLAG)
            new_disabled = False
        return json_response({'success': True, 'disabled': new_disabled})
    except Exception as e:
        app.logger.error(f"Error toggling web UI: {e}")
        return json_response({'success': False, 'message': str(e)}, 500)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8082, debug=False)

