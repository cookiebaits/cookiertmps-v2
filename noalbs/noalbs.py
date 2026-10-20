import requests
import time
import os
import logging
import xml.etree.ElementTree as ET
import obsws_python as obs
import subprocess
import signal
import threading
import urllib.request
import shutil

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("NOALBS")

def is_valid_file(path):
    try:
        return os.path.exists(path) and os.path.getsize(path) > 0
    except Exception:
        return False

class Noalbs:
    def __init__(self):
        self.enabled = os.getenv("NOALBS_ENABLED", "false").lower() == "true"
        self.low_threshold = int(os.getenv("LOW_BITRATE", 1000))
        self.restore_threshold = int(os.getenv("RESTORE_BITRATE", 1500))
        self.obs_host = os.getenv("OBS_WS_HOST", "127.0.0.1")
        self.obs_port = int(os.getenv("OBS_WS_PORT", 4455))
        self.obs_password = os.getenv("OBS_WS_PASSWORD", "")
        self.scene_main = os.getenv("OBS_SCENE_LIVE", "Main")
        self.scene_brb = os.getenv("OBS_SCENE_BRB", "BRB")
        self.app_name = os.getenv("APP_NAME", "live")
        # Internal ports
        self.stats_url = "http://127.0.0.1:8081/stat"
        self.control_url = "http://127.0.0.1:8081/control"

        self.fallback_mode = os.getenv("FALLBACK_MODE", "video").lower()
        self.cloud_brb_enabled = os.getenv("CLOUD_BRB", "false").lower() == "true"
        self.brb_video_path = os.getenv("BRB_VIDEO_PATH", "/app/data/brb_video.mp4")
        self.cloud_brb_timeout = int(os.getenv("CLOUD_BRB_TIMEOUT", 300))
        self.cloud_process = None
        self.cloud_brb_start_time = None

        self.is_low = False
        self.is_streaming = False
        self.obs_client = None

        # Detect NVENC support once at init to avoid delay when triggering Cloud BRB
        self.has_nvenc = False
        try:
            res = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True, timeout=5)
            if "h264_nvenc" in res.stdout:
                self.has_nvenc = True
        except Exception:
            self.has_nvenc = False

    def ensure_brb_video_ready(self):
        default_url = "https://filedn.com/lfh40bKbFfD5um9HDFNrJFR/brb.mp4"
        video_url = os.getenv("BRB_VIDEO_URL", "").strip() or default_url

        target_path = self.brb_video_path
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        if not is_valid_file(target_path):
            logger.info(f"BRB video missing. Downloading default video from {video_url}...")
            try:
                tmp_path = target_path + ".tmp"
                req = urllib.request.Request(
                    video_url,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req, timeout=60) as response, open(tmp_path, 'wb') as out_file:
                    out_file.write(response.read())
                logger.info(f"Downloaded video to {tmp_path}")

                # Check if input video has an audio stream
                has_audio = False
                try:
                    probe_cmd = ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "default=noprintwrappers=1:nokey=1", tmp_path]
                    probe_res = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=10)
                    if probe_res.returncode == 0 and probe_res.stdout.strip():
                        has_audio = True
                except Exception:
                    has_audio = False

                # Transcode and verify compatibility using FFmpeg with strict broadcast standards
                logger.info("Transcoding downloaded BRB video with FFmpeg to ensure broadcast standard compatibility (H.264 High/YUV420P 60fps CBR GOP, AAC 48kHz Stereo, +faststart)...")

                duration = 0.0
                try:
                    dur_cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprintwrappers=1:nokey=1", tmp_path]
                    dur_res = subprocess.run(dur_cmd, capture_output=True, text=True, timeout=10)
                    if dur_res.returncode == 0 and dur_res.stdout.strip():
                        duration = float(dur_res.stdout.strip())
                except Exception:
                    duration = 0.0

                transcode_cmd = [
                    "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
                    "-i", tmp_path,
                ]

                if not has_audio:
                    # Input is silent; add synthetic silent 48kHz stereo AAC stream to satisfy Twitch/YouTube requirements
                    transcode_cmd.extend(["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"])

                transcode_cmd.extend([
                    "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p",
                    "-r", "60", "-g", "120", "-keyint_min", "120", "-sc_threshold", "0",
                    "-b:v", "3000k", "-minrate", "3000k", "-maxrate", "3000k", "-bufsize", "3000k",
                    "-c:a", "aac", "-ar", "48000", "-ac", "2", "-b:a", "160k",
                ])

                if not has_audio:
                    transcode_cmd.extend(["-map", "0:v:0", "-map", "1:a:0", "-shortest"])

                transcode_cmd.extend([
                    "-movflags", "+faststart",
                    "-progress", "pipe:1",
                    target_path
                ])

                try:
                    proc = subprocess.Popen(transcode_cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
                    if proc.stdout:
                        for line in proc.stdout:
                            line = line.strip()
                            if line.startswith("out_time_us=") and duration > 0:
                                try:
                                    us = float(line.split("=")[1])
                                    pct = min(100.0, (us / 1000000.0 / duration) * 100.0)
                                    filled = int(pct * 30 / 100)
                                    bar = "=" * filled + (">" if filled < 30 else "") + " " * (29 - filled if filled < 30 else 0)
                                    print(f"\rTranscoding BRB Video: [{bar}] {pct:.1f}%", end="", flush=True)
                                except ValueError:
                                    pass
                    proc.wait()
                    if duration > 0:
                        print("") # New line after progress bar finish

                    if proc.returncode == 0 and is_valid_file(target_path):
                        logger.info("BRB video successfully downloaded and transcoded.")
                    else:
                        logger.warning("FFmpeg transcoding failed or not available. Using downloaded raw file.")
                        if os.path.exists(tmp_path):
                            os.replace(tmp_path, target_path)
                except Exception as ex:
                    logger.warning(f"FFmpeg transcode process error: {ex}. Using downloaded raw file.")
                    if os.path.exists(tmp_path):
                        os.replace(tmp_path, target_path)
                if os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except Exception:
                        pass
            except Exception as e:
                logger.error(f"Failed to download/transcode BRB video: {e}")

    def get_obs_client(self):
        if self.obs_client:
            return self.obs_client
        try:
            self.obs_client = obs.ReqClient(host=self.obs_host, port=self.obs_port, password=self.obs_password, timeout=3)
            return self.obs_client
        except Exception as e:
            logger.debug(f"Failed to connect to OBS: {e}")
            self.obs_client = None
            return None

    def get_stream_info(self):
        """
        Extracts stream status from Nginx RTMP stats XML.
        Returns:
            (total_bitrate, has_publisher, active_streams)
            where active_streams is a list of tuples: (app_name, stream_name, bitrate_kbps)
        """
        try:
            r = requests.get(self.stats_url, timeout=5)
            if r.status_code != 200:
                return 0, False, []

            root = ET.fromstring(r.text)
            total_bitrate = 0
            has_publisher = False
            active_streams = []

            # Monitor both horizontal (app_name) and vertical applications
            for app in root.findall('.//application'):
                app_name_node = app.find('name')
                if app_name_node is not None:
                    app_name_text = app_name_node.text
                    if app_name_text == self.app_name or app_name_text == "vertical":
                        live = app.find('live')
                        if live is not None:
                            for stream in live.findall('stream'):
                                name_node = stream.find('name')
                                stream_name = name_node.text if (name_node is not None and name_node.text) else ""
                                # Ignore fallback cloud_brb streams when calculating source bitrate
                                if stream_name.startswith('cloud_brb'):
                                    continue

                                # Detect publishing publisher:
                                # In real Nginx RTMP XML, <publishing/> is inside <client> (<client><publishing/></client>)
                                # In simple unit test mocks, it may be a direct child (<stream><publishing/></stream>)
                                is_publishing = (
                                    stream.find('.//publishing') is not None or
                                    stream.find('publishing') is not None or
                                    (stream.find('client') is not None and len(stream.findall('client')) > 0) or
                                    (stream.find('bw_in') is not None and int(stream.find('bw_in').text or 0) > 0)
                                )

                                if is_publishing:
                                    has_publisher = True
                                    bw_in = stream.find('bw_in')
                                    kbps = 0
                                    if bw_in is not None and bw_in.text:
                                        try:
                                            # Convert bytes/s to kbps
                                            kbps = int(int(bw_in.text) * 8 / 1024)
                                        except (ValueError, TypeError):
                                            kbps = 0
                                    total_bitrate += kbps
                                    active_streams.append((app_name_text, stream_name, kbps))

            return total_bitrate, has_publisher, active_streams
        except Exception as e:
            logger.debug(f"Stream info fetch error: {e}")
            return 0, False, []

    def get_bitrate(self):
        """Returns total upload bitrate in kbps across all monitored source streams."""
        bitrate, _, _ = self.get_stream_info()
        return bitrate

    def drop_publisher(self, app, name):
        """Drops a publisher connection via Nginx RTMP control module."""
        try:
            url = f"{self.control_url}/drop/publisher?app={app}&name={name}"
            requests.get(url, timeout=3)
            logger.info(f"Dropped low-bitrate publisher on app={app}, name={name} to prioritize MP4 loop.")
        except Exception as e:
            logger.debug(f"Drop publisher error: {e}")

    def start_cloud_brb(self):
        if not self.cloud_brb_enabled and self.fallback_mode != "video":
            return

        if self.cloud_process:
            if self.cloud_process.poll() is None:
                return
            logger.warning("Existing Cloud BRB process exited. Restarting...")
            self.cloud_process = None

        if not is_valid_file(self.brb_video_path):
            self.ensure_brb_video_ready()

        if not is_valid_file(self.brb_video_path):
            logger.error(f"Cloud BRB video not found at {self.brb_video_path}")
            return

        logger.info("Process of noalbs taking over: Starting Cloud BRB fallback video stream...")
        if not self.cloud_brb_start_time:
            self.cloud_brb_start_time = time.time()

        if self.has_nvenc:
            vcodec = ["-c:v", "h264_nvenc", "-preset", "p3", "-tune", "ll"]
        else:
            vcodec = ["-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency"]

        tee_target = f"[f=flv:onfail=ignore]rtmp://127.0.0.1:19359/{self.app_name}/cloud_brb_loop|[f=flv:onfail=ignore]rtmp://127.0.0.1:19359/vertical/cloud_brb_loop"

        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "warning",
            "-fflags", "+nobuffer", "-flags", "+low_delay",
            "-re", "-thread_queue_size", "1024",
            "-stream_loop", "-1", "-i", self.brb_video_path,
            *vcodec,
            "-b:v", "3000k", "-maxrate", "3000k", "-bufsize", "3000k",
            "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
            "-c:a", "aac", "-ac", "2", "-ar", "48000", "-b:a", "160k",
            "-max_muxing_queue_size", "1024",
            "-f", "tee", "-map", "0:v", "-map", "0:a?",
            tee_target
        ]

        try:
            with open("/tmp/cloud_brb.log", "a") as log_file:
                self.cloud_process = subprocess.Popen(cmd, stdout=log_file, stderr=subprocess.STDOUT)
            logger.info("Cloud BRB fallback video process successfully spawned.")
        except Exception as e:
            logger.error(f"Failed to start Cloud BRB process: {e}")

    def stop_cloud_brb(self):
        if self.cloud_process:
            logger.info("Stopping Cloud BRB stream process...")
            proc = self.cloud_process
            self.cloud_process = None
            self.cloud_brb_start_time = None
            def kill_proc():
                try:
                    proc.terminate()
                    proc.wait(timeout=3)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass
            threading.Thread(target=kill_proc, daemon=True).start()

    def switch_scene(self, scene):
        client = self.get_obs_client()
        if not client:
            return
        try:
            client.set_current_program_scene(scene)
            logger.info(f"Successfully switched OBS scene to: {scene}")
        except Exception as e:
            logger.error(f"OBS WebSocket Switch Error: {e}")
            self.obs_client = None # Force reconnect next time

        # Attempt Aitum Vertical Canvas scene switch if plugin vendor request is supported
        try:
            if client:
                client.call_vendor_request("aitum-vertical-canvas", "switch_scene", {"scene": scene})
                logger.info(f"Successfully switched Aitum Vertical Canvas scene to: {scene}")
        except Exception:
            pass

    def run(self):
        if not self.enabled:
            logger.info("NOALBS is disabled.")
            return

        logger.info(f"NOALBS Started. Monitoring {self.app_name} & vertical on {self.stats_url}")

        if (self.cloud_brb_enabled or self.fallback_mode == "video") and not is_valid_file(self.brb_video_path):
            self.ensure_brb_video_ready()

        consecutive_low = 0
        while True:
            bitrate, has_publisher, active_streams = self.get_stream_info()

            # 1. Check timeout or process crash if Cloud BRB is currently active
            if self.cloud_process and self.cloud_brb_start_time:
                if self.cloud_process.poll() is not None:
                    logger.warning("Cloud BRB FFmpeg process exited unexpectedly. Restarting...")
                    self.cloud_process = None
                    self.start_cloud_brb()

                elapsed = time.time() - self.cloud_brb_start_time
                if elapsed >= self.cloud_brb_timeout:
                    logger.error(f"Cloud BRB fallback active for {self.cloud_brb_timeout} seconds without stream recovery. Terminating stream completely.")
                    self.stop_cloud_brb()
                    client = self.get_obs_client()
                    if client:
                        try:
                            client.stop_stream()
                            logger.info("Successfully requested OBS WebSocket to stop stream.")
                        except Exception as e:
                            logger.error(f"Failed to stop OBS stream via WebSocket: {e}")
                    self.is_streaming = False
                    self.is_low = False
                    consecutive_low = 0
                    time.sleep(2)
                    continue

            # 2. Source stream is connected
            if has_publisher and bitrate > 0:
                if not self.is_streaming:
                    logger.info(f"Stream detected at {bitrate}kbps.")
                    self.is_streaming = True

                # Upload speed drop check
                if bitrate < self.low_threshold:
                    consecutive_low += 1
                    if consecutive_low >= 2 and not self.is_low:
                        logger.error(f"Stream disruption: Low bitrate ({bitrate}kbps < {self.low_threshold}kbps).")
                        logger.warning(f"Process of noalbs taking over: Triggering fallback (mode: {self.fallback_mode})")
                        self.is_low = True
                        if self.fallback_mode == "video" or self.cloud_brb_enabled:
                            # Drop degraded publishers on external port so MP4 loop takes over relay cleanly
                            for app_name, stream_name, _ in active_streams:
                                self.drop_publisher(app_name, stream_name)
                            self.start_cloud_brb()
                            self.switch_scene(self.scene_brb)
                        else:
                            self.switch_scene(self.scene_brb)
                else:
                    # Upload speed healthy
                    consecutive_low = 0
                    if bitrate >= self.restore_threshold:
                        if self.is_low or self.cloud_process:
                            logger.info(f"Bitrate restored ({bitrate}kbps >= {self.restore_threshold}kbps). Stopping MP4 fallback video...")
                            self.stop_cloud_brb()
                            self.switch_scene(self.scene_main)
                            self.is_low = False
            else:
                consecutive_low = 0
                if self.is_streaming:
                    logger.error("Process of noalbs taking over: Source stream disconnected / dropped! Bitrate 0 kbps.")
                    self.is_low = True
                    self.is_streaming = False
                    if self.fallback_mode == "video" or self.cloud_brb_enabled:
                        # Immediately start video fallback without delay on disconnect
                        self.start_cloud_brb()
                        self.switch_scene(self.scene_brb)
                    else:
                        self.switch_scene(self.scene_brb)
                elif self.is_low and not self.cloud_process and (self.fallback_mode == "video" or self.cloud_brb_enabled):
                    # Fail-safe watchdog: ensure MP4 loop is broadcasting while in low/disconnected state
                    self.start_cloud_brb()

            time.sleep(1)

if __name__ == "__main__":
    Noalbs().run()
