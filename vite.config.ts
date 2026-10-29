import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

// Cache for YouTube video IDs by channel handle to reduce YouTube requests
const ytVideoIdCache: Record<string, { videoId: string; timestamp: number }> = {};
const CACHE_TTL_MS = 15000; // 15 seconds cache

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cookie-rtmps-api-emulator',
      configureServer(server) {
        let episodeCount = 1;
        let activePushers: string[] = [];
        const mockObsKey = 'cookiepass';
        const isAuthorized = (req: { headers: Record<string, string | string[] | undefined> }) =>
          req.headers['x-stream-key'] === mockObsKey;

        server.middlewares.use(async (req, res, next) => {
          const url = req.url || '';

          if (url.startsWith('/chat.html')) {
            try {
              const chatPath = path.join(process.cwd(), 'chat.html');
              if (fs.existsSync(chatPath)) {
                const content = fs.readFileSync(chatPath, 'utf-8');
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(content);
                return;
              }
            } catch (e) {
              console.error('Error serving chat.html:', e);
            }
          }

          if (url.startsWith('/health')) {
            res.setHeader('Content-Type', 'text/plain');
            res.end('OK');
            return;
          }

          // YouTube Automatic Live Video ID Resolver
          if (url.startsWith('/yt_video_id')) {
            const urlObj = new URL(url, `http://${req.headers.host}`);
            let rawChannel = (urlObj.searchParams.get('channel') || '').trim();
            res.setHeader('Content-Type', 'text/plain');

            if (!rawChannel) {
              res.statusCode = 400;
              res.end('Missing channel');
              return;
            }

            // Direct 11-character Video ID bypass
            if (rawChannel.length === 11 && !rawChannel.startsWith('@') && !rawChannel.startsWith('UC') && !rawChannel.includes('/')) {
              res.end(rawChannel);
              return;
            }

            // Extract clean handle from URL or handle string
            let cleanHandle = rawChannel;
            if (cleanHandle.includes('youtube.com/') || cleanHandle.includes('youtu.be/')) {
              try {
                const parsedUrl = new URL(cleanHandle.startsWith('http') ? cleanHandle : 'https://' + cleanHandle);
                // Check if user pasted a watch?v= link
                const v = parsedUrl.searchParams.get('v');
                if (v && v.length === 11) {
                  res.end(v);
                  return;
                }
                const parts = parsedUrl.pathname.split('/').filter(Boolean);
                const handleMatch = parts.find(p => p.startsWith('@'));
                if (handleMatch) {
                  cleanHandle = handleMatch;
                } else if (parts[0] && parts[0] !== 'live' && parts[0] !== 'watch') {
                  cleanHandle = parts[0] === 'c' || parts[0] === 'user' || parts[0] === 'channel' ? (parts[1] || parts[0]) : parts[0];
                }
              } catch (e) {}
            }
            cleanHandle = cleanHandle.replace(/^@/, '').replace(/\/live\/?$/, '');

            const now = Date.now();
            if (ytVideoIdCache[cleanHandle] && (now - ytVideoIdCache[cleanHandle].timestamp) < CACHE_TTL_MS) {
              res.end(ytVideoIdCache[cleanHandle].videoId);
              return;
            }

            const candidateUrls = [
              `https://www.youtube.com/@${cleanHandle}/live`,
              `https://www.youtube.com/c/${cleanHandle}/live`,
              `https://www.youtube.com/channel/${cleanHandle}/live`,
            ];

            let resolvedVideoId = '';

            for (const targetUrl of candidateUrls) {
              try {
                const fetchResp = await fetch(targetUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cookie': 'CONSENT=PENDING+999; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg',
                  },
                });

                const finalUrl = fetchResp.url;
                const watchMatch = finalUrl.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
                if (watchMatch && watchMatch[1]) {
                  resolvedVideoId = watchMatch[1];
                  break;
                }

                const html = await fetchResp.text();
                const m1 = html.match(/"liveStreamability":.*? "videoId":"([a-zA-Z0-9_-]{11})"/);
                if (m1 && m1[1]) {
                  resolvedVideoId = m1[1];
                  break;
                }

                const m2 = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                if (m2 && m2[1]) {
                  resolvedVideoId = m2[1];
                  break;
                }

                const m3 = html.match(/href="\/watch\?v=([a-zA-Z0-9_-]{11})"/);
                if (m3 && m3[1]) {
                  resolvedVideoId = m3[1];
                  break;
                }
              } catch (e) {}
            }

            if (resolvedVideoId) {
              ytVideoIdCache[cleanHandle] = { videoId: resolvedVideoId, timestamp: now };
              res.end(resolvedVideoId);
            } else {
              res.statusCode = 404;
              res.end('Offline');
            }
            return;
          }

          // YouTube Live Messages Poller Endpoint for Unified Chat Overlay
          if (url.startsWith('/api/yt_live_messages')) {
            const urlObj = new URL(url, `http://${req.headers.host}`);
            let rawChannel = (urlObj.searchParams.get('channel') || '').trim();
            let videoId = (urlObj.searchParams.get('v') || '').trim();
            res.setHeader('Content-Type', 'application/json');

            // Direct video ID extraction
            if (rawChannel.length === 11 && !rawChannel.startsWith('@') && !rawChannel.includes('/')) {
              videoId = rawChannel;
            }

            // If videoId is still empty, attempt to resolve from channel
            if (!videoId && rawChannel) {
              let cleanHandle = rawChannel;
              if (cleanHandle.includes('youtube.com/') || cleanHandle.includes('youtu.be/')) {
                try {
                  const parsedUrl = new URL(cleanHandle.startsWith('http') ? cleanHandle : 'https://' + cleanHandle);
                  const v = parsedUrl.searchParams.get('v');
                  if (v && v.length === 11) videoId = v;
                  else {
                    const parts = parsedUrl.pathname.split('/').filter(Boolean);
                    const handleMatch = parts.find(p => p.startsWith('@'));
                    if (handleMatch) cleanHandle = handleMatch;
                    else if (parts[0] && parts[0] !== 'live' && parts[0] !== 'watch') {
                      cleanHandle = parts[0] === 'c' || parts[0] === 'user' || parts[0] === 'channel' ? (parts[1] || parts[0]) : parts[0];
                    }
                  }
                } catch (e) {}
              }

              if (!videoId) {
                cleanHandle = cleanHandle.replace(/^@/, '').replace(/\/live\/?$/, '');
                if (ytVideoIdCache[cleanHandle] && (Date.now() - ytVideoIdCache[cleanHandle].timestamp) < CACHE_TTL_MS) {
                  videoId = ytVideoIdCache[cleanHandle].videoId;
                } else {
                  const candidateUrls = [
                    `https://www.youtube.com/@${cleanHandle}/live`,
                    `https://www.youtube.com/c/${cleanHandle}/live`,
                    `https://www.youtube.com/channel/${cleanHandle}/live`,
                  ];
                  for (const targetUrl of candidateUrls) {
                    try {
                      const fetchResp = await fetch(targetUrl, {
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                        },
                      });
                      const finalUrl = fetchResp.url;
                      const watchMatch = finalUrl.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
                      if (watchMatch && watchMatch[1]) {
                        videoId = watchMatch[1];
                        break;
                      }
                      const html = await fetchResp.text();
                      const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
                      if (m && m[1]) {
                        videoId = m[1];
                        break;
                      }
                    } catch (e) {}
                  }
                  if (videoId) {
                    ytVideoIdCache[cleanHandle] = { videoId, timestamp: Date.now() };
                  }
                }
              }
            }

            if (!videoId) {
              res.end(JSON.stringify({ status: 'waiting', isLive: false, channel: rawChannel, messages: [] }));
              return;
            }

            // Fetch live chat page
            try {
              const chatResp = await fetch(`https://www.youtube.com/live_chat?v=${encodeURIComponent(videoId)}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                },
              });

              const chatHtml = await chatResp.text();
              const extractedMessages: Array<{ id: string; author: string; text: string; color: string; timestamp: number }> = [];

              // Extract messages from ytInitialData
              const jsonMatch = chatHtml.match(/window\["ytInitialData"\]\s*=\s*({.+?});\s*<\/script>/) ||
                                chatHtml.match(/var\s+ytInitialData\s*=\s*({.+?});\s*<\/script>/);

              if (jsonMatch && jsonMatch[1]) {
                try {
                  const ytData = JSON.parse(jsonMatch[1]);
                  const actions = ytData?.contents?.liveChatRenderer?.actions || [];
                  for (const act of actions) {
                    const item = act?.addChatItemAction?.item?.liveChatTextMessageRenderer;
                    if (item) {
                      const msgId = item.id || `yt_${Date.now()}_${Math.random()}`;
                      const author = item.authorName?.simpleText || 'YouTubeUser';
                      const runs = item.message?.runs || [];
                      const text = runs.map((r: { text?: string }) => r.text || '').join('');
                      if (text) {
                        extractedMessages.push({
                          id: msgId,
                          author,
                          text,
                          color: '#ef4444',
                          timestamp: parseInt(item.timestampUsec || `${Date.now()}000`, 10) / 1000,
                        });
                      }
                    }
                  }
                } catch (pe) {}
              }

              res.end(JSON.stringify({
                status: 'ok',
                videoId,
                isLive: true,
                messages: extractedMessages.slice(-25),
              }));
            } catch (err) {
              res.end(JSON.stringify({ status: 'error', videoId, isLive: true, messages: [] }));
            }
            return;
          }

          if (url.startsWith('/api/protection')) {
            res.setHeader('Content-Type', 'application/json');
            if (!isAuthorized(req)) {
              res.statusCode = 401;
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }
            const cycle = Math.floor(Date.now() / 1000) % 40;
            const inBackup = cycle >= 25;
            res.end(JSON.stringify({
              running: true,
              enabled: true,
              lowBitrateKbps: 1000,
              restoreBitrateKbps: 1500,
              timeoutSeconds: 30,
              videoUrl: 'https://filedn.com/lfh40bKbFfD5um9HDFNrJFR/brb.mp4',
              updatedAt: Date.now() / 1000,
              channels: {
                horizontal: inBackup
                  ? { state: 'backup', kbps: 420, backupElapsed: cycle - 25, lastEvent: 'Bitrate below 1000 kbps - backup video playing' }
                  : { state: 'live', kbps: 6000 + Math.round(Math.random() * 400), backupElapsed: 0, lastEvent: 'Stream live' },
                vertical: { state: 'idle', kbps: null, backupElapsed: 0, lastEvent: 'Waiting for stream' },
              },
            }));
            return;
          }

          if (url.startsWith('/api/episode')) {
            if (!isAuthorized(req)) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (data.action === 'increment') episodeCount += 1;
                  else if (data.action === 'decrement' && episodeCount > 1) episodeCount -= 1;
                  else if (typeof data.count === 'number') episodeCount = data.count;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, count: episodeCount }));
                } catch {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
              });
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ count: episodeCount }));
            }
            return;
          }

          if (url.startsWith('/validate')) {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                const params = new URLSearchParams(body);
                const key = params.get('name') || '';
                const appName = params.get('app') || 'live';
                
                if (key === mockObsKey) {
                  if (appName === 'live' && !activePushers.includes('horizontal')) {
                    activePushers.push('horizontal');
                  }
                  if (appName === 'vertical' && !activePushers.includes('vertical')) {
                    activePushers.push('vertical');
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'text/plain');
                  res.end('OK');
                } else {
                  res.statusCode = 403;
                  res.setHeader('Content-Type', 'text/plain');
                  res.end('Invalid stream key');
                }
              });
            } else {
              res.setHeader('Content-Type', 'text/plain');
              res.end('OK');
            }
            return;
          }

          if (url.startsWith('/api/auth/status')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              isPasswordProtected: true,
              hasObsKey: true,
            }));
            return;
          }

          if (url.startsWith('/api/auth/verify')) {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                try {
                  const data = JSON.parse(body || '{}');
                  const password = (data.password || '').trim();
                  if (password === mockObsKey) {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: true }));
                  } else {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ success: false, message: 'Invalid Stream Key / Password' }));
                  }
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, message: 'Invalid JSON request' }));
                }
              });
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            }
            return;
          }

          if (url.startsWith('/api/web_ui/status')) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ disabled: false }));
            return;
          }

          if (url.startsWith('/api/web_ui/toggle')) {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                try {
                  const data = JSON.parse(body || '{}');
                  const nextState = typeof data.disabled === 'boolean' ? data.disabled : true;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, disabled: nextState }));
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, message: 'Invalid JSON request' }));
                }
              });
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ disabled: false }));
            }
            return;
          }

          if (url.startsWith('/publish_done')) {
            res.setHeader('Content-Type', 'text/plain');
            res.end('OK');
            return;
          }

          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true
  }
});
