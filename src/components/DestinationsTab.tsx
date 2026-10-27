import React, { useState } from 'react';
import { DestinationKey } from '../types';
import { Key, Eye, EyeOff, Copy, Check, Server, Terminal, ShieldAlert, Sparkles } from 'lucide-react';

export const DestinationsTab: React.FC = () => {
  const [keys, setKeys] = useState<DestinationKey[]>([
    { id: 'youtube', name: 'YouTube Live', envKey: 'YOUTUBE_KEY', icon: '🔴', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2/', category: 'horizontal', value: 'yt_live_key_sample123', enabled: true },
    { id: 'twitch', name: 'Twitch Stream Key', envKey: 'TWITCH_KEY', icon: '🟣', rtmpUrl: 'rtmp://live.twitch.tv/app/', category: 'horizontal', value: 'live_tw_abc987654321', enabled: true },
    { id: 'kick', name: 'Kick.com', envKey: 'KICK_KEY', icon: '🟢', stunnelPort: 19353, rtmpUrl: 'rtmp://127.0.0.1:19353/kick/', category: 'horizontal', value: 'sk_us_kick_9988776655', enabled: true },
    { id: 'tiktok', name: 'TikTok (Streamlabs Auto)', envKey: 'TIKTOK_KEY', icon: '🖤', rtmpUrl: 'rtmp://127.0.0.1:19358/s_v/', category: 'horizontal', value: 'auto', enabled: true },
    { id: 'x', name: 'X / Twitter', envKey: 'X_KEY', icon: '𝕏', stunnelPort: 19354, rtmpUrl: 'rtmp://127.0.0.1:19354/x/', category: 'horizontal', value: 'x_live_stream_key_1122', enabled: true },
    { id: 'facebook', name: 'Facebook Live', envKey: 'FACEBOOK_KEY', icon: '🔵', stunnelPort: 19350, rtmpUrl: 'rtmp://127.0.0.1:19350/rtmp/', category: 'horizontal', value: '', enabled: false },
    { id: 'instagram', name: 'Instagram Live', envKey: 'INSTAGRAM_KEY', icon: '📸', stunnelPort: 19351, rtmpUrl: 'rtmp://127.0.0.1:19351/rtmp/', category: 'horizontal', value: '', enabled: false },
    { id: 'trovo', name: 'Trovo', envKey: 'TROVO_KEY', icon: '🟩', rtmpUrl: 'rtmp://livepush.trovo.live/live/', category: 'horizontal', value: '', enabled: false },
    { id: 'obs', name: 'Master OBS Stream Key', envKey: 'OBS_KEY', icon: '🎛️', rtmpUrl: 'Inbound Ingest Check Key', category: 'horizontal', value: 'my_secret_master_key_99', enabled: true },
    
    // Vertical Keys (Aitum Vertical Plugin)
    { id: 'v_youtube', name: 'YouTube Vertical', envKey: 'V_YOUTUBE_KEY', icon: '📱🔴', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2/', category: 'vertical', value: 'yt_vert_key_8877', enabled: true },
    { id: 'v_twitch', name: 'Twitch Vertical', envKey: 'V_TWITCH_KEY', icon: '📱🟣', rtmpUrl: 'rtmp://live.twitch.tv/app/', category: 'vertical', value: '', enabled: false },
    { id: 'v_tiktok', name: 'TikTok Vertical Auto', envKey: 'V_TIKTOK_KEY', icon: '📱🖤', rtmpUrl: 'auto', category: 'vertical', value: 'auto', enabled: true },
  ]);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [copiedDocker, setCopiedDocker] = useState(false);

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleKeyChange = (id: string, value: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, value, enabled: value.trim().length > 0 } : k))
    );
  };

  const handleToggleEnable = (id: string) => {
    setKeys((prev) =>
      prev.map((k) => (k.id === id ? { ...k, enabled: !k.enabled } : k))
    );
  };

  // Generate docker run command
  const activeKeys = keys.filter((k) => k.enabled && k.value.trim());
  const envFlags = activeKeys
    .map((k) => `-e ${k.envKey}="${k.value.trim()}"`)
    .join(' \\\n  ');

  const dockerRunCmd = `docker run -d \\
  --name cookie-rtmps \\
  --restart unless-stopped \\
  -p 1935:1935 \\
  -p 80:80 \\
  -p 443:8443 \\
  -v ./data:/app/data \\
  ${envFlags || '-e YOUTUBE_KEY="your_key"'} \\
  cookiebaits/cookie-rtmps:latest`;

  const handleCopyDocker = () => {
    navigator.clipboard.writeText(dockerRunCmd);
    setCopiedDocker(true);
    setTimeout(() => setCopiedDocker(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">Stream Key & Relay Destination Manager</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Configure target platform keys for Horizontal and Vertical feeds. Every incoming stream is validated strictly via <code className="text-amber-300 font-mono">stream_validator.py</code> before relaying.
          </p>
        </div>

        <button
          onClick={handleCopyDocker}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/20 whitespace-nowrap"
        >
          {copiedDocker ? <Check className="w-4 h-4 text-emerald-950" /> : <Terminal className="w-4 h-4" />}
          <span>{copiedDocker ? 'Command Copied!' : 'Copy Docker Run Command'}</span>
        </button>
      </div>

      {/* Main Keys Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Horizontal Destinations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <span>📺 Horizontal Feed Targets</span>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                  rtmp://...:1935/live
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Primary 16:9 stream destinations</p>
            </div>
            <span className="text-xs font-mono text-amber-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {keys.filter((k) => k.category === 'horizontal' && k.enabled).length} Active
            </span>
          </div>

          <div className="space-y-3">
            {keys
              .filter((k) => k.category === 'horizontal')
              .map((k) => (
                <div
                  key={k.id}
                  className={`p-3.5 rounded-xl border transition ${
                    k.enabled
                      ? 'bg-slate-950 border-slate-800 ring-1 ring-amber-500/10'
                      : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{k.icon}</span>
                      <span className="text-xs font-bold text-slate-200">{k.name}</span>
                      <code className="text-[10px] text-slate-500 font-mono">({k.envKey})</code>
                    </div>
                    <div className="flex items-center space-x-2">
                      {k.stunnelPort && (
                        <span className="text-[10px] bg-slate-900 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
                          Stunnel :{k.stunnelPort}
                        </span>
                      )}
                      <input
                        type="checkbox"
                        checked={k.enabled}
                        onChange={() => handleToggleEnable(k.id)}
                        className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer w-4 h-4"
                      />
                    </div>
                  </div>

                  <div className="relative flex items-center mt-2">
                    <input
                      type={showKeys[k.id] ? 'text' : 'password'}
                      value={k.value}
                      onChange={(e) => handleKeyChange(k.id, e.target.value)}
                      placeholder={k.value === 'auto' ? 'auto (Streamlabs Relay)' : `Enter ${k.name} key`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => toggleShowKey(k.id)}
                      className="absolute right-2 text-slate-400 hover:text-slate-200"
                    >
                      {showKeys[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Vertical Destinations & Settings */}
        <div className="space-y-6">
          
          {/* Vertical Targets */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>📱 Vertical Feed Targets</span>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                    rtmp://...:1935/vertical
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Aitum Vertical plugin feed targets</p>
              </div>
              <span className="text-xs font-mono text-purple-400 font-bold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                {keys.filter((k) => k.category === 'vertical' && k.enabled).length} Active
              </span>
            </div>

            <div className="space-y-3">
              {keys
                .filter((k) => k.category === 'vertical')
                .map((k) => (
                  <div
                    key={k.id}
                    className={`p-3.5 rounded-xl border transition ${
                      k.enabled
                        ? 'bg-slate-950 border-slate-800 ring-1 ring-purple-500/10'
                        : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{k.icon}</span>
                        <span className="text-xs font-bold text-slate-200">{k.name}</span>
                        <code className="text-[10px] text-slate-500 font-mono">({k.envKey})</code>
                      </div>
                      <input
                        type="checkbox"
                        checked={k.enabled}
                        onChange={() => handleToggleEnable(k.id)}
                        className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-purple-500 cursor-pointer w-4 h-4"
                      />
                    </div>

                    <div className="relative flex items-center mt-2">
                      <input
                        type={showKeys[k.id] ? 'text' : 'password'}
                        value={k.value}
                        onChange={(e) => handleKeyChange(k.id, e.target.value)}
                        placeholder={`Enter ${k.name} key`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-3 pr-10 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={() => toggleShowKey(k.id)}
                        className="absolute right-2 text-slate-400 hover:text-slate-200"
                      >
                        {showKeys[k.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Generated Docker Run Command Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Generated Host Launch Script</span>
              </span>
              <button
                onClick={handleCopyDocker}
                className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center space-x-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-amber-300/90 overflow-x-auto whitespace-pre">
              {dockerRunCmd}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
