import unittest
import os
import sys
import time
import tempfile
import shutil
from unittest.mock import patch, MagicMock

# Import FailoverManager
sys.path.insert(0, os.path.abspath("."))
from failover_manager import FailoverManager, is_valid_file

class TestFailoverManager(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.brb_path = os.path.join(self.temp_dir, "brb_video.mp4")

        # Create dummy valid video file
        with open(self.brb_path, "wb") as f:
            f.write(b"dummy video content for unit testing" * 10)

        self.env_patcher = patch.dict(os.environ, {
            "BRB_VIDEO_PATH": self.brb_path,
            "LOW_BITRATE": "1000",
            "RESTORE_BITRATE": "1500",
            "APP_NAME": "live"
        })
        self.env_patcher.start()
        self.fm = FailoverManager()

    def tearDown(self):
        self.env_patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_is_valid_file(self):
        self.assertTrue(is_valid_file(self.brb_path))
        self.assertFalse(is_valid_file(os.path.join(self.temp_dir, "non_existent.mp4")))

    @patch("urllib.request.urlopen")
    def test_get_stream_stats_parsing(self, mock_urlopen):
        mock_xml = """<?xml version="1.0" encoding="UTF-8" ?>
        <rtmp>
            <server>
                <application>
                    <name>live</name>
                    <live>
                        <stream>
                            <name>test_key</name>
                            <bw_in>256000</bw_in>
                            <client><publishing/></client>
                        </stream>
                    </live>
                </application>
            </server>
        </rtmp>
        """
        mock_response = MagicMock()
        mock_response.read.return_value = mock_xml.encode('utf-8')
        mock_urlopen.return_value = mock_response

        stats = self.fm.get_stream_stats()
        self.assertIn("live", stats)
        self.assertIn("test_key", stats["live"])
        # 256000 * 8 / 1024 = 2000 kbps
        self.assertEqual(stats["live"]["test_key"]["bitrate"], 2000)
        self.assertTrue(stats["live"]["test_key"]["publishing"])

    @patch("subprocess.Popen")
    def test_start_relay_process_mp4_fallback(self, mock_popen):
        mock_proc = MagicMock()
        mock_popen.return_value = mock_proc

        proc = self.fm.start_relay_process("horizontal", "MP4")
        self.assertIsNotNone(proc)
        mock_popen.assert_called_once()
        args = mock_popen.call_args[0][0]
        self.assertEqual(args[0], "ffmpeg")
        self.assertIn("-stream_loop", args)
        self.assertIn(self.brb_path, args)
        self.assertIn("rtmp://127.0.0.1:19359/relay/main", args)

    @patch("subprocess.Popen")
    def test_start_relay_process_live_passthrough(self, mock_popen):
        mock_proc = MagicMock()
        mock_popen.return_value = mock_proc

        proc = self.fm.start_relay_process("horizontal", "LIVE", source_stream_name="my_key")
        self.assertIsNotNone(proc)
        mock_popen.assert_called_once()
        args = mock_popen.call_args[0][0]
        self.assertEqual(args[0], "ffmpeg")
        self.assertIn("rtmp://127.0.0.1:19359/live/my_key", args)
        self.assertIn("-c", args)
        self.assertIn("copy", args)
        self.assertIn("rtmp://127.0.0.1:19359/relay/main", args)

if __name__ == "__main__":
    unittest.main()
