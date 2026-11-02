## Developer Memory

### Nginx & RTMP Module
- **Version**: Nginx 1.30.3 (stable) with local `cookie-nginx-rtmp` module.
- **Hardening**: AMF recursion limit (128), no VLAs, `ngx_random()` handshakes, and fixed memory leaks in `ngx_rtmp_eval.c`.
- **Codecs**: Support for HEVC (H.265), AV1, and VP9 via Enhanced RTMP FourCC identification.

### Streaming Infrastructure
- **RTMPS**: Handled via local Stunnel proxying (ports 19350-19358). Stunnel config includes SNI and `checkHost` for CDN compatibility.
- **Dual-Streaming**: Supported via separate `live` (horizontal) and `vertical` Nginx applications. `install.sh` handles auto-mirroring and server diversification.

### Management & UI
- **Installer**: `install.sh` Quick Reference provides "Combined Chat Config Page: http://{host}/{8-char-hex}", randomized per fresh download. Menu options #6 (chat CLI config) and #7 (titles/Twitch API) removed. Main menu: 6) Website Address / Cloudflare reverse proxy, 8) Disconnection Protection, 9) Build & Start.
- **Control Dashboard**: `chat.html` integrated with `stream_validator.py` (Flask) for unified multi-platform chat overlay (Twitch, YouTube, Kick) with platform logos.
- **OAuth**: Supported for Twitch and YouTube with background token refresh logic to maintain sessions.
- **Persistence**: Stream keys, chat hex keys, and episode counts persisted in host volume `./data` and `rtmp_config.env`.

### Disconnection Protection (replaces NOALBS)
- `stream_protection.py` controller + MediaMTX (`alwaysAvailable` paths `feed/horizontal|vertical` on 127.0.0.1:1937, API 9997, `moq: false`; offline file must be AAC 48k stereo).
- Pipeline: OBS -> nginx `live`/`vertical` (validated) -> ffmpeg feed -> MediaMTX -> ffmpeg relay -> nginx `broadcast_h`/`broadcast_v` (localhost-only, holds platform pushes).
- Settings: NOALBS_ENABLED, LOW_BITRATE, RESTORE_BITRATE, CLOUD_BRB_TIMEOUT (min 5), BRB_VIDEO_URL. Status JSON at /tmp/stream_protection.json, served via `/api/protection`.
- On timeout: drops ingest publisher and stops relay (platforms end).

### Website & Network Ports
- Ports: Alternative non-privileged ports 8080 (HTTP) -> 8080, 8443 (HTTPS) -> 8443. Ports 80 and 443 are strictly avoided and never used.
- Web Dashboard: Disabled by default (`DISABLE_WEB_UI="true"`, `/app/data/disable_web_ui.flag`), returning 403 Forbidden to public visitors while keeping RTMP ingest and failover 100% active. Can be enabled on-demand via the UI or `install.sh` menu.
- Upload Prioritization & WireGuard: 64MB RTMP max message, 16384 out queue, 32MB wmem, 8MB Stunnel buffers, Google BBR with FQ pacing, and `tcp_mtu_probing=1` + `rp_filter=2` for PMTU discovery over WireGuard 1420/1280 MTU tunnels without packet drops. WireGuard ports (UDP 51820/51821) and `wg` processes are strictly protected.
- Password is OBS_KEY only; protected APIs require `X-Stream-Key` header (frontend `src/api.ts` `authFetch`). Public /stat removed (8081 localhost only).
