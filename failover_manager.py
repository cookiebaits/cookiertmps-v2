import os
import sys
import time
import logging
import threading
import subprocess
import urllib.request
try:
    import defusedxml.ElementTree as ET
except ImportError:
    import xml.etree.ElementTree as ET

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [CloudSceneSwitcher] %(levelname)s - %(message)s')
logger = logging.getLogger("CloudSceneSwitcher")

def is_valid_file(path):
    try:
        return os.path.exists(path) and os.path.getsize(path) > 0
    except Exception:
        return False

class FailoverManager:
    """
    Cloud Scene Switcher:
    - Maintains continuous relay stream to destinations (Twitch, YouTube, Kick, etc.)
    - Plays MP4 fallback video immediately whenever disconnected or bitrate drops below threshold
    - Simulates an automatic 'Scene Change' to the main broadcast when connection is active
    - Automatically switches back to MP4 on disconnection and plays for the configured duration (X minutes)
    - Automatically switches back to main broadcast when connection recovers
    """
    def __init__(self):
        self.stats_url = os.getenv("STATS_URL", "http://127.0.0.1:8081/stat")
        self.control_url = os.getenv("CONTROL_URL", "http://127.0.0.1:8081/control")
        self.low_threshold = int(os.getenv("LOW_BITRATE", 1000))
        self.restore_threshold = int(os.getenv("RESTORE_BITRATE", 1500))
        self.app_name = os.getenv("APP_NAME", "live")
        self.brb_video_path = os.getenv("BRB_VIDEO_PATH", "/app/data/brb_video.mp4")
        self.brb_video_url = os.getenv("BRB_VIDEO_URL", "https://filedn.com/lfh40bKbFfD5um9HDFNrJFR/brb.mp4")
        self.cloud_brb_timeout = int(os.getenv("CLOUD_BRB_TIMEOUT", 300)) # Timeout in seconds (X minutes)

        # OBS WebSocket settings (optional local scene change integration)
        self.obs_host = os.getenv("OBS_WS_HOST", "127.0.0.1")
        self.obs_port = int(os.getenv("OBS_WS_PORT", 4455))
        self.obs_password = os.getenv("OBS_WS_PASSWORD", "")
        self.scene_main = os.getenv("OBS_SCENE_LIVE", "Main")
        self.scene_brb = os.getenv("OBS_SCENE_BRB", "BRB")
        self.obs_client = None

        self.h_process = None
        self.v_process = None

        self.current_h_mode = None # 'LIVE', 'MP4', or 'STANDBY'
        self.current_v_mode = None

        self.h_disconnect_start = None
        self.v_disconnect_start = None

        self.has_nvenc = False
        try:
            res = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True, timeout=5)
            if "h264_nvenc" in res.stdout:
                self.has_nvenc = True
        except Exception:
            self.has_nvenc = False

    def wait_for_nginx(self, max_wait=30):
        start = time.time()
        logger.info(f"Waiting for Nginx RTMP stats endpoint ({self.stats_url})...")
        while time.time() - start < max_wait:
            try:
                req = urllib.request.Request(self.stats_url, headers={'User-Agent': 'CloudSceneSwitcher'})
                with urllib.request.urlopen(req, timeout=1) as resp:
                    if resp.status == 200:
                        logger.info("Nginx RTMP stats endpoint is online and responding.")
                        return True
            except Exception:
                pass
            time.sleep(0.5)
        logger.warning("Timed out waiting for Nginx stats endpoint. Proceeding anyway.")
        return False

    def get_obs_client(self):
        if self.obs_client:
            return self.obs_client
        try:
            import obsws_python as obs
            self.obs_client = obs.ReqClient(host=self.obs_host, port=self.obs_port, password=self.obs_password, timeout=2)
            return self.obs_client
        except Exception:
            self.obs_client = None
            return None

    def trigger_obs_scene(self, scene_name):
        client = self.get_obs_client()
        if not client:
            return
        try:
            client.set_current_program_scene(scene_name)
            logger.info(f"OBS WebSocket: Switched scene to {scene_name}")
        except Exception:
            self.obs_client = None

        try:
            if client:
                client.call_vendor_request("aitum-vertical-canvas", "switch_scene", {"scene": scene_name})
        except Exception:
            pass

    def ensure_brb_video_ready(self):
        target_path = self.brb_video_path
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        if not is_valid_file(target_path):
            logger.info(f"BRB fallback video missing. Downloading default video from {self.brb_video_url}...")
            try:
                tmp_path = target_path + ".tmp"
                req = urllib.request.Request(
                    self.brb_video_url,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=60) as response, open(tmp_path, 'wb') as out_file:
                    out_file.write(response.read())
                logger.info(f"Downloaded raw video to {tmp_path}")

                has_audio = False
                try:
                    probe_cmd = ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "default=noprintwrappers=1:nokey=1", tmp_path]
                    probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
                    if probe_res.returncode == 0 and probe_res.stdout.strip():
                        has_audio = True
                except Exception:
                    has_audio = False

                logger.info("Transcoding BRB video with FFmpeg to strict broadcast standards (H.264 High/AAC 48kHz Stereo)...")
                transcode_cmd = [
                    "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
                    "-i", tmp_path,
                ]

                if not has_audio:
                    transcode_cmd.extend(["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"])

                transcode_cmd.extend([
                    "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p",
                    "-r", "60", "-g", "120", "-keyint_min", "120", "-sc_threshold", "0",
                    "-b:v", "3000k", "-minrate", "3000k", "-maxrate", "3000k", "-bufsize", "3000k",
                    "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k",
                ])

                if not has_audio:
                    transcode_cmd.extend(["-map", "0:v:0", "-map", "1:a:0", "-shortest"])

                transcode_cmd.extend(["-movflags", "+faststart", target_path])

                res = subprocess.run(transcode_cmd, capture_output=True, text=True, timeout=120)
                if res.returncode == 0 and is_valid_file(target_path):
                    logger.info("BRB video successfully prepared for instant failover.")
                else:
                    logger.warning("FFmpeg transcode warning. Falling back to downloaded raw video.")
                    if os.path.exists(tmp_path):
                        os.replace(tmp_path, target_path)
            except Exception as e:
                logger.error(f"Error preparing BRB video: {e}")

        if not is_valid_file(target_path):
            logger.warning(f"BRB video not found or download failed. Generating broadcast-standard fallback video at {target_path}...")
            try:
                gen_cmd = [
                    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                    "-f", "lavfi", "-i", "color=c=0x0f172a:s=1920x1080:r=60",
                    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
                    "-t", "5",
                    "-c:v", "libx264", "-preset", "ultrafast", "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p",
                    "-r", "60", "-g", "120", "-keyint_min", "120", "-sc_threshold", "0",
                    "-b:v", "3000k", "-minrate", "3000k", "-maxrate", "3000k", "-bufsize", "3000k",
                    "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k",
                    "-map", "0:v:0", "-map", "1:a:0",
                    "-movflags", "+faststart",
                    target_path
                ]
                subprocess.run(gen_cmd, capture_output=True, timeout=30)
                if is_valid_file(target_path):
                    logger.info("Broadcast standard fallback video generated successfully.")
            except Exception as ex_gen:
                logger.error(f"Failed to generate fallback video: {ex_gen}")

    def get_stream_stats(self):
        try:
            req = urllib.request.Request(self.stats_url, headers={'User-Agent': 'CloudSceneSwitcher'})
            with urllib.request.urlopen(req, timeout=2) as r:
                xml_text = r.read().decode('utf-8')
            # Hardened XML parsing: Use defusedxml.ElementTree or configure XMLParser to disable entities/DTDs
            try:
                import defusedxml.ElementTree as defused_ET
                root = defused_ET.fromstring(xml_text)
            except ImportError:
                parser = ET.XMLParser()
                if hasattr(parser, 'entity'):
                    parser.entity.clear()
                root = ET.fromstring(xml_text, parser=parser)

            result = {}
            for app in root.findall('.//application'):
                app_name_node = app.find('name')
                if app_name_node is None or not app_name_node.text:
                    continue
                app_name = app_name_node.text
                result[app_name] = {}

                live = app.find('live')
                if live is not None:
                    for stream in live.findall('stream'):
                        name_node = stream.find('name')
                        stream_name = name_node.text if (name_node is not None and name_node.text) else ""

                        bw_in = stream.find('bw_in')
                        kbps = 0
                        if bw_in is not None and bw_in.text:
                            try:
                                kbps = int(int(bw_in.text) * 8 / 1024)
                            except (ValueError, TypeError):
                                kbps = 0

                        is_publishing = (
                            stream.find('.//publishing') is not None or
                            stream.find('publishing') is not None or
                            (stream.find('client') is not None and len(stream.findall('client')) > 0) or
                            kbps > 0
                        )

                        result[app_name][stream_name] = {
                            "bitrate": kbps,
                            "publishing": is_publishing
                        }
            return result
        except Exception:
            return {}

    def drop_publisher(self, app, stream_name=None):
        try:
            url = f"{self.control_url}/drop/publisher?app={app}"
            if stream_name:
                url += f"&name={stream_name}"
            req = urllib.request.Request(url, headers={'User-Agent': 'CloudSceneSwitcher'})
            with urllib.request.urlopen(req, timeout=2) as resp:
                pass
            logger.info(f"Dropped publisher connection on app={app}, name={stream_name}")
        except Exception as e:
            logger.debug(f"Drop publisher error: {e}")

    def kill_process(self, proc):
        if not proc:
            return
        def _terminate():
            try:
                proc.terminate()
                proc.wait(timeout=2)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass
        threading.Thread(target=_terminate, daemon=True).start()

    def start_relay_process(self, app_type, mode, source_stream_name=None):
        target_app = "relay" if app_type == "horizontal" else "vertical_relay"
        target_url = f"rtmp://127.0.0.1:19359/{target_app}/main"

        if mode == "LIVE" and source_stream_name:
            source_app = self.app_name if app_type == "horizontal" else "vertical"
            source_url = f"rtmp://127.0.0.1:19359/{source_app}/{source_stream_name}"

            logger.info(f"[{app_type.upper()}] [SCENE CHANGE -> LIVE] Piping live broadcast into {target_url}...")
            self.trigger_obs_scene(self.scene_main)

            cmd = [
                "ffmpeg", "-hide_banner", "-loglevel", "warning",
                "-fflags", "+nobuffer", "-flags", "+low_delay",
                "-i", source_url,
                "-c", "copy",
                "-f", "flv", target_url
            ]
        elif mode == "MP4":
            self.ensure_brb_video_ready()
            logger.info(f"[{app_type.upper()}] [SCENE CHANGE -> MP4 LOOP] Playing failover video into {target_url} (Timeout: {self.cloud_brb_timeout}s)...")
            self.trigger_obs_scene(self.scene_brb)

            if self.has_nvenc:
                vcodec = ["-c:v", "h264_nvenc", "-preset", "p3", "-tune", "ll"]
            else:
                vcodec = ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency"]

            cmd = [
                "ffmpeg", "-hide_banner", "-loglevel", "warning",
                "-fflags", "+nobuffer", "-flags", "+low_delay",
                "-re", "-stream_loop", "-1", "-i", self.brb_video_path,
                *vcodec,
                "-b:v", "3000k", "-maxrate", "3000k", "-bufsize", "3000k",
                "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
                "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k",
                "-f", "flv", target_url
            ]
        else:
            return None

        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return proc
        except Exception as e:
            logger.error(f"Failed to start {mode} process for {app_type}: {e}")
            return None

    def run(self):
        logger.info("Initializing Cloud Scene Switcher...")
        self.wait_for_nginx(max_wait=30)
        self.ensure_brb_video_ready()

        # Main is MP4 by default: immediately plays MP4 loop to all destinations as standby / failover
        logger.info("Starting initial MP4 failover loop as primary standby scene...")
        self.h_process = self.start_relay_process("horizontal", "MP4")
        self.v_process = self.start_relay_process("vertical", "MP4")
        self.current_h_mode = "MP4"
        self.current_v_mode = "MP4"
        self.h_disconnect_start = None
        self.v_disconnect_start = None

        consecutive_low_h = 0
        consecutive_low_v = 0

        while True:
            try:
                stats = self.get_stream_stats()

                # --- 1. Horizontal Stream Management ---
                h_app_stats = stats.get(self.app_name, {})
                active_h_stream = None
                active_h_bitrate = 0

                for s_name, s_data in h_app_stats.items():
                    if s_name.startswith('cloud_brb'):
                        continue
                    if s_data.get('publishing', False):
                        active_h_stream = s_name
                        active_h_bitrate = s_data.get('bitrate', 0)
                        break

                # Check if currently in LIVE mode but process died (instant disconnect detection)
                h_proc_died = (self.current_h_mode == "LIVE" and self.h_process and self.h_process.poll() is not None)

                if active_h_stream and active_h_bitrate >= self.low_threshold and not h_proc_died:
                    # Healthy live broadcast detected
                    consecutive_low_h = 0
                    self.h_disconnect_start = None
                    if self.current_h_mode != "LIVE":
                        logger.info(f"[HORIZONTAL] Live broadcaster detected ({active_h_bitrate} kbps). Switching scene to LIVE broadcast.")
                        if self.h_process:
                            self.kill_process(self.h_process)
                        self.h_process = self.start_relay_process("horizontal", "LIVE", active_h_stream)
                        self.current_h_mode = "LIVE"
                else:
                    # Broadcaster is missing, disconnected, or low bitrate
                    if self.current_h_mode == "LIVE":
                        if active_h_stream and active_h_bitrate < self.low_threshold:
                            consecutive_low_h += 1
                            if consecutive_low_h >= 2:
                                logger.warning(f"[HORIZONTAL] Low bitrate detected ({active_h_bitrate} kbps < {self.low_threshold} kbps). Dropping publisher and switching scene to MP4.")
                                self.drop_publisher(self.app_name, active_h_stream)
                                if self.h_process:
                                    self.kill_process(self.h_process)
                                self.h_process = self.start_relay_process("horizontal", "MP4")
                                self.current_h_mode = "MP4"
                                self.h_disconnect_start = time.time()
                        else:
                            # Total disconnection
                            logger.error("[HORIZONTAL] Broadcaster disconnected! Immediately switching scene to MP4 video loop.")
                            if active_h_stream:
                                self.drop_publisher(self.app_name, active_h_stream)
                            if self.h_process:
                                self.kill_process(self.h_process)
                            self.h_process = self.start_relay_process("horizontal", "MP4")
                            self.current_h_mode = "MP4"
                            self.h_disconnect_start = time.time()
                    elif self.current_h_mode == "MP4":
                        # In MP4 mode: check timeout duration
                        if self.h_disconnect_start and (time.time() - self.h_disconnect_start >= self.cloud_brb_timeout):
                            logger.warning(f"[HORIZONTAL] Disconnection duration exceeded {self.cloud_brb_timeout} seconds ({self.cloud_brb_timeout // 60} mins). Stopping MP4 stream to gracefully finish broadcast.")
                            if self.h_process:
                                self.kill_process(self.h_process)
                                self.h_process = None
                            self.current_h_mode = "STANDBY"
                        elif self.h_process and self.h_process.poll() is not None:
                            # MP4 loop crashed or restarted; ensure loop continues
                            self.h_process = self.start_relay_process("horizontal", "MP4")
                    elif self.current_h_mode == "STANDBY":
                        # Waiting for broadcaster to reconnect
                        if active_h_stream and active_h_bitrate >= self.restore_threshold:
                            logger.info(f"[HORIZONTAL] Broadcaster reconnected ({active_h_bitrate} kbps). Resuming stream and switching scene to LIVE.")
                            self.h_process = self.start_relay_process("horizontal", "LIVE", active_h_stream)
                            self.current_h_mode = "LIVE"
                            self.h_disconnect_start = None

                # --- 2. Vertical Stream Management ---
                v_app_stats = stats.get("vertical", {})
                active_v_stream = None
                active_v_bitrate = 0

                for s_name, s_data in v_app_stats.items():
                    if s_name.startswith('cloud_brb'):
                        continue
                    if s_data.get('publishing', False):
                        active_v_stream = s_name
                        active_v_bitrate = s_data.get('bitrate', 0)
                        break

                v_proc_died = (self.current_v_mode == "LIVE" and self.v_process and self.v_process.poll() is not None)

                if active_v_stream and active_v_bitrate >= self.low_threshold and not v_proc_died:
                    consecutive_low_v = 0
                    self.v_disconnect_start = None
                    if self.current_v_mode != "LIVE":
                        logger.info(f"[VERTICAL] Live vertical broadcaster detected ({active_v_bitrate} kbps). Switching scene to LIVE.")
                        if self.v_process:
                            self.kill_process(self.v_process)
                        self.v_process = self.start_relay_process("vertical", "LIVE", active_v_stream)
                        self.current_v_mode = "LIVE"
                else:
                    if self.current_v_mode == "LIVE":
                        if active_v_stream and active_v_bitrate < self.low_threshold:
                            consecutive_low_v += 1
                            if consecutive_low_v >= 2:
                                logger.warning(f"[VERTICAL] Low bitrate detected ({active_v_bitrate} kbps). Switching scene to MP4.")
                                self.drop_publisher("vertical", active_v_stream)
                                if self.v_process:
                                    self.kill_process(self.v_process)
                                self.v_process = self.start_relay_process("vertical", "MP4")
                                self.current_v_mode = "MP4"
                                self.v_disconnect_start = time.time()
                        else:
                            logger.error("[VERTICAL] Vertical stream disconnected! Switching scene to MP4.")
                            if active_v_stream:
                                self.drop_publisher("vertical", active_v_stream)
                            if self.v_process:
                                self.kill_process(self.v_process)
                            self.v_process = self.start_relay_process("vertical", "MP4")
                            self.current_v_mode = "MP4"
                            self.v_disconnect_start = time.time()
                    elif self.current_v_mode == "MP4":
                        if self.v_disconnect_start and (time.time() - self.v_disconnect_start >= self.cloud_brb_timeout):
                            logger.warning(f"[VERTICAL] Disconnection duration exceeded {self.cloud_brb_timeout} seconds. Stopping vertical MP4 stream.")
                            if self.v_process:
                                self.kill_process(self.v_process)
                                self.v_process = None
                            self.current_v_mode = "STANDBY"
                        elif self.v_process and self.v_process.poll() is not None:
                            self.v_process = self.start_relay_process("vertical", "MP4")
                    elif self.current_v_mode == "STANDBY":
                        if active_v_stream and active_v_bitrate >= self.restore_threshold:
                            logger.info(f"[VERTICAL] Vertical stream reconnected. Switching scene to LIVE.")
                            self.v_process = self.start_relay_process("vertical", "LIVE", active_v_stream)
                            self.current_v_mode = "LIVE"
                            self.v_disconnect_start = None

            except Exception as e:
                logger.error(f"Switcher loop error: {e}")

            time.sleep(1)

if __name__ == "__main__":
    FailoverManager().run()
