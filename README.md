# CookieRTMPS v2: Secure, Self-Hosted Multistreaming & Cloud Failover Solution

[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](http://wubu.cookiebaits.com)
[![Version](https://img.shields.io/badge/Version-v2.0-blue.svg)](https://github.com/cookiebaits/cookiertmps-v2)
[![Nginx](https://img.shields.io/badge/Nginx-1.30.3-brightgreen.svg)](https://nginx.org)
[![Enhanced%20RTMP](https://img.shields.io/badge/Enhanced%20RTMP-HEVC%20%7C%20AV1%20%7C%20VP9-orange.svg)](#enhanced-codecs)

---

## Project Overview

**CookieRTMPS v2** (`cookiebaits/cookiertmps-v2`) is a standalone, enterprise-grade, self-hosted RTMP/RTMPS relay engine designed for content creators and streamers. It enables simultaneous multistreaming across Twitch, YouTube, Kick, TikTok, Facebook, Trovo, Instagram, X (Twitter), and custom RTMP endpoints—**without putting upload strain on your local connection or paying recurring fees to commercial cloud restreamers.**

You send **one** high-quality feed to your VPS, and CookieRTMPS handles validation, hardware/network proxying, vertical aspect ratio mirroring, chat aggregation, and automated failover.

---

## What Sets CookieRTMPS Apart

### 1. Strict Stream Key Authentication (`on_publish`)
* **The Obscurity Trap:** Many relays rely on obfuscated RTMP stream endpoints as their only defense. If the URL is intercepted, anyone can hijack your ingest and broadcast to your channels.
* **The CookieRTMPS Standard:** Ingest keys are strictly checked against destination keys or a dedicated Master Ingest Key in real time via an embedded Python/Flask validator. Streams failing verification are instantly rejected at the socket level.

### 2. Server-Side Disconnection Protection (Backup Video)
* **100% Server-Side:** No OBS WebSocket, NOALBS, or second PC required. Uses MediaMTX's always-available fallback, a proven method for keeping outputs alive.
* If your incoming bitrate falls below your **Low Bitrate Threshold** (kbps) for 3 seconds, or OBS disconnects entirely:
  * The server instantly switches every platform to your **backup `.mp4` (set by URL) on loop**, without the platforms ever seeing a disconnect.
  * It switches back to your live feed once your bitrate holds above the **Restore Bitrate** for 3 seconds.
  * If you are not back within the **Timeout** (seconds), the backup stops and the broadcast to all platforms ends.
* All settings are in installer option **8) Configure Disconnection Protection**. Live status is visible on the website's "Disconnection Protection" tab.
* The backup video is automatically converted at startup (H.264 + AAC 48 kHz stereo) so it plays cleanly on every platform.

### 3. Password-Protected Combined Chat Config Page
* Access URL: `http://{your_vps_ip}/{8-character-hex}` (or via reverse proxy domain: `https://yourdomain.com/{8-character-hex}`).
* **Stream Key Password Protection:**
  * When a stream key or Master OBS Key is configured in **Option 4**, that key automatically becomes the password required to unlock the Combined Chat Configuration Page.
  * If no stream key is configured, access remains open.
* **Multi-Platform Chat Aggregator:**
  * Aggregates live chat from Twitch, YouTube, and Kick with official platform branding badges.
  * Built, hosted, and reverse-proxied directly on your VPS during server deployment.
  * Clean removal: Completely deleted upon server uninstallation.

### 4. Seamless In-Place File Updates & Running Instance Preservation
* When executing `./install.sh`:
  * Automatically checks for newer files or changes, replacing updated files while preserving existing configuration (`rtmp_config.env`) and `./data`.
  * **Leaves active streaming containers running uninterrupted**, only stopping and rebuilding the container when you explicitly select Option 9 ("Build & Start Server").

### 5. Horizontal & Vertical Dual-Streaming
* Native support for horizontal widescreen (`rtmp://<vps_ip>:1935/live`) and vertical feeds (`rtmp://<vps_ip>:1935/vertical`) for the **Aitum Vertical OBS plugin**.
* Independent destination control for TikTok, YouTube Shorts, and Twitch Vertical.
* Includes a **TikTok Auto-Pusher** via Streamlabs API to bypass TikTok Studio desktop restrictions.

### 6. Hardened Nginx 1.30.3 & Enhanced RTMP Codecs
* Stable **Nginx 1.30.3** compiled with custom `cookie-nginx-rtmp` module.
* Memory protections: AMF recursion depth limit (128), zero variable-length arrays (VLAs), and leak-free evaluation.
* Enhanced RTMP FourCC negotiation supporting **HEVC (H.265)**, **AV1**, and **VP9**.
* Built-in **Stunnel** proxy (ports 19350–19358) with SNI and CDN host verification for platforms requiring RTMPS (Facebook, YouTube, etc.).

---

## Prerequisites

* **Operating System:** Linux VPS (Ubuntu 20.04+, Debian 11+, AlmaLinux 8+, or Rocky Linux).
* **Hardware:** 2 vCPU cores, 2 GB RAM minimum.
* **Network:** Minimum 1 Gbps port speed with unmetered or high bandwidth allowance.
* **Root Access:** SSH access with `root` or `sudo` privileges.

---

## Quick Installation & Launch

### 1. SSH into your VPS
```bash
ssh root@<your_server_ip>
```

### 2. Universal One-Step Deployment & Upgrade Command
```bash
if [ -f "./install.sh" ]; then (git pull 2>/dev/null || true); elif [ -d "cookiertmps-v2" ]; then cd cookiertmps-v2 && (git pull 2>/dev/null || true); else git clone https://github.com/cookiebaits/cookiertmps-v2.git && cd cookiertmps-v2; fi && chmod +x install.sh && ./install.sh
```

> **Automatic Directory & File Handling:**
> - **Existing Directory?** If `cookiertmps-v2` is already on your server, it pulls updates cleanly without throwing `fatal: destination path already exists`.
> - **Already Inside Repo?** Automatically detects current directory and executes the installer.
> - **Running Instances?** Running streaming containers (`cookie-rtmps`) are left **untouched and running** when starting `install.sh`. It automatically checks for newer files/updates, replaces them, preserves configuration and data, and only stops/rebuilds the container when you explicitly choose Option 9 ("Build & Start Server").

---

## Interactive Menu Structure (`install.sh`)

The installer provides a clean, numbered menu:

| # | Menu Option | Description |
|---|---|---|
| **1** | **Install Docker** | Sets up Docker and required tools. |
| **2** | **Configure Stream Keys (Horizontal)** | Setup Twitch, YouTube, Kick, Facebook, Trovo, TikTok, X, and Custom RTMP targets. |
| **3** | **Configure Stream Keys (Vertical)** | Setup independent feeds for TikTok, YouTube Shorts, Instagram, and custom vertical targets. |
| **4** | **Configure OBS Setup & Security Key** | Set the OBS stream key (required). This is also the website password. |
| **5** | **Configure IP Whitelist** | Restrict ingest to your IP or leave open. |
| **6** | **Configure Website Address / Cloudflare Reverse Proxy** | Use the VPS IP (default) or a Cloudflare-proxied domain for the settings site. |
| **7** | **Configure Optimizations** | Nginx `chunk_size` tuning. |
| **8** | **Configure Disconnection Protection** | On/off, backup MP4 URL, low/restore bitrate (kbps), and timeout (seconds). |
| **9** | **Build & Start Server** | Builds the Docker image and starts the server. |
| **10** | **Run Integration Tests** | Verifies the server, protection engine, and website are running. |
| **11** | **Stop Server & Uninstall** | Stops the container and removes host configs. |
| **12** | **View Logs** | Shows server logs. |
| **13** | **Quit** | Exits the menu. |

---

## OBS Studio Configuration

1. In OBS, open **Settings** > **Stream**.
2. **Service:** Choose `Custom...`
3. **Horizontal (Main) Feed:**
   * **Server:** `rtmp://<your_vps_ip>:1935/live`
   * **Stream Key:** Enter your configured Master Ingest Key (or any active horizontal platform key).
4. **Vertical Feed (Aitum Vertical Plugin):**
   * **Server:** `rtmp://<your_vps_ip>:1935/vertical`
   * **Stream Key:** Enter your configured Vertical stream key.
5. Click **Apply** and start streaming!

---

## Cloud BRB Video Specifications

When configuring Option 10, the installer automatically validates and transcodes your `.mp4` fallback file to the following broadcast standard:

```text
Container:       MP4 (ISO / IEC 14496-14) with +faststart
Video Codec:     H.264 / AVC (High Profile @ Level 4.1, yuv420p)
Framerate:       60.0 fps (CFR)
GOP Size:        60 frames (1.0s Keyframe Interval, closed GOP)
Bitrate:         6000 kbps CBR (maxrate 6000k, bufsize 6000k)
Audio Codec:     AAC (LC)
Audio Channels:  2 (Stereo)
Sample Rate:     48,000 Hz
Audio Bitrate:   160 kbps
```

This guarantees seamless platform acceptance with zero stream tearing or reconnect delays when switching between live video and the standby loop.

---

## Server Management & Maintenance

* **Check Service Status:**
  ```bash
  docker ps -f name=cookie-rtmps
  ```
* **View Live Validator & Ingest Logs:**
  ```bash
  docker logs -f cookie-rtmps
  ```
* **Stop Server:**
  ```bash
  docker stop cookie-rtmps
  ```
* **Start Server:**
  ```bash
  docker start cookie-rtmps
  ```
* **Reconfigure / Update:**
  Run `./install.sh` at any time to open the configuration dashboard.

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| **Stream Rejected ("Invalid Stream Key")** | Key sent from OBS does not match server config. | Verify your OBS Stream Key matches your Option 4 settings or destination keys. Check `docker logs cookie-rtmps`. |
| **Chat Page Returns 404** | Web server not built or incorrect randomized hex. | Ensure Option 9 completed successfully. Check the Quick Reference URL printed at the end of deployment. |
| **Chat Page Password Prompt** | Stream key password is enabled. | Enter the exact Stream Key configured in Option 4. |
| **Stream Buffering / Dropping Frames** | Bandwidth congestion between OBS and VPS, or VPS and platform. | Adjust chunk size in Option 5, or lower OBS output bitrate (e.g., from 8000k to 6000k). |
| **Backup Video Not Playing** | Backup MP4 URL unreachable, or first-start conversion still running. | Check the URL in Option 8, then view logs (Option 12) for `[Protection]` messages. |
| **Cloudflare Domain Not Loading** | DNS record not proxied or SSL mode wrong. | Set the A record to the VPS IP with the orange cloud on, and SSL/TLS mode to "Full". RTMP must still use the VPS IP. |

---

## Support & Community

* **Report Issues:** [GitHub Issues](https://github.com/cookiebaits/cookiertmps-v2/issues)
* **Discord Server:** [Cookiebaits Discord](http://wubu.cookiebaits.com)

---

## Legal & Licensing Notice

CookieRTMPS is a specialized, proprietary streaming utility created for the Cookiebaits and Ruinscam platforms. Provided "as-is" without warranty or commercial distribution rights without prior authorization.
