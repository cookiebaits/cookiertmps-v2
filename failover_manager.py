import os
import sys
import time
import logging
import threading
import subprocess
import urllib.request
import xml.etree.ElementTree as ET

logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(name)s] %(levelname)s - %(message)s')
logger = logging.getLogger("FailoverManager")

def is_valid_file(path):
    try:
        return os.path.exists(path) and os.path.getsize(path) > 0
    except Exception:
        return False

class FailoverManager:
    def __init__(self):
        self.stats_url = os.getenv("STATS_URL", "http://127.0.0.1:8081/stat")
        self.control_url = os.getenv("CONTROL_URL", "http://127.0.0.1:8081/control")
        self.low_threshold = int(os.getenv("LOW_BITRATE", 1000))
        self.restore_threshold = int(os.getenv("RESTORE_BITRATE", 1500))
        self.app_name = os.getenv("APP_NAME", "live")
        self.brb_video_path = os.getenv("BRB_VIDEO_PATH", "/app/data/brb_video.mp4")
        self.brb_video_url = os.getenv("BRB_VIDEO_URL", "https://filedn.com/lfh40bKbFfD5um9HDFNrJFR/brb.mp4")

        self.h_process = None
        self.v_process = None

        self.current_h_mode = None # 'LIVE' or 'MP4'
        self.current_v_mode = None # 'LIVE' or 'MP4'

        self.has_nvenc = False
        try:
            res = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True, timeout=5)
            if "h264_nvenc" in res.stdout:
                self.has_nvenc = True
        except Exception:
            self.has_nvenc = False

    def ensure_brb_video_ready(self):
        target_path = self.brb_video_path
        os.makedirs(os.path.dirname(target_path), exist_ok=True)

        if not is_valid_file(target_path):
            logger.info(f"BRB video missing. Downloading default fallback video from {self.brb_video_url}...")
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

                logger.info("Transcoding BRB video with FFmpeg to broadcast standards (H.264/AAC 48kHz Stereo)...")
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
                    logger.warning(f"FFmpeg transcode warning. Falling back to raw file. Details: {res.stderr}")
                    if os.path.exists(tmp_path):
                        os.replace(tmp_path, target_path)
            except Exception as e:
                logger.error(f"Error preparing BRB video: {e}")

    def get_stream_stats(self):
        """
        Returnsdict mapping app_name -> dict(stream_name -> dict(bitrate, is_publishing))
        """
        try:
            r = urllib.request.urlopen(self.stats_url, timeout=3)
            xml_text = r.read().decode('utf-8')
            root = ET.fromstring(xml_text)

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
        except Exception as e:
            logger.debug(f"Error fetching RTMP stats: {e}")
            return {}

    def kill_process(self, proc):
        if not proc:
            return
        def _terminate():
            try:
                proc.terminate()
                proc.wait(timeout=3)
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

            logger.info(f"[{app_type.upper()}] Switching relay to LIVE source stream: {source_url}")
            cmd = [
                "ffmpeg", "-hide_banner", "-loglevel", "warning",
                "-fflags", "+nobuffer", "-flags", "+low_delay",
                "-i", source_url,
                "-c", "copy",
                "-f", "flv", target_url
            ]
        else:
            self.ensure_brb_video_ready()
            logger.info(f"[{app_type.upper()}] Switching relay to MP4 FAILOVER loop: {self.brb_video_path}")

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

        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return proc
        except Exception as e:
            logger.error(f"Failed to start relay process for {app_type} ({mode}): {e}")
            return None

    def run(self):
        logger.info("Starting Server-Side MP4 Failover Manager...")
        self.ensure_brb_video_ready()

        consecutive_low_h = 0
        consecutive_low_v = 0

        while True:
            try:
                stats = self.get_stream_stats()

                # Check Horizontal App
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

                # Determine Horizontal Mode
                if active_h_stream and active_h_bitrate >= self.low_threshold:
                    consecutive_low_h = 0
                    target_h_mode = "LIVE"
                else:
                    consecutive_low_h += 1
                    target_h_mode = "MP4"

                # Check Vertical App
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

                if active_v_stream and active_v_bitrate >= self.low_threshold:
                    consecutive_low_v = 0
                    target_v_mode = "LIVE"
                else:
                    consecutive_low_v += 1
                    target_v_mode = "MP4"

                # Apply Horizontal Switch
                if self.current_h_mode != target_h_mode or (self.h_process and self.h_process.poll() is not None):
                    if self.h_process:
                        self.kill_process(self.h_process)
                    self.h_process = self.start_relay_process("horizontal", target_h_mode, active_h_stream)
                    self.current_h_mode = target_h_mode

                # Apply Vertical Switch
                if self.current_v_mode != target_v_mode or (self.v_process and self.v_process.poll() is not None):
                    if self.v_process:
                        self.kill_process(self.v_process)
                    self.v_process = self.start_relay_process("vertical", target_v_mode, active_v_stream)
                    self.current_v_mode = target_v_mode

            except Exception as e:
                logger.error(f"Failover loop error: {e}")

            time.sleep(1)

if __name__ == "__main__":
    FailoverManager().run()
