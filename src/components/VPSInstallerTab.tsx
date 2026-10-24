import React, { useState } from 'react';
import { Terminal, Copy, Check, Shield, Server, FileText, Download, ShieldCheck, Zap } from 'lucide-react';

export const VPSInstallerTab: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedStunnel, setCopiedStunnel] = useState(false);
  const [activeFile, setActiveFile] = useState<'install' | 'stunnel'>('install');

  const oneLinerCmd = `if [ -f "./install.sh" ]; then (git pull 2>/dev/null || true); elif [ -d "CookieRTMP-v2" ]; then cd CookieRTMP-v2 && (git pull 2>/dev/null || true); else git clone https://github.com/cookiebaits/CookieRTMP-v2.git && cd CookieRTMP-v2; fi && chmod +x install.sh && ./install.sh`;

  const handleCopyOneLiner = () => {
    navigator.clipboard.writeText(oneLinerCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const stunnelConfigSnippet = `; Stunnel RTMPS Proxy Configuration for CookieRTMPS
[youtube]
client = yes
accept = 127.0.0.1:19352
connect = a.rtmp.youtube.com:443
checkHost = a.rtmp.youtube.com

[facebook]
client = yes
accept = 127.0.0.1:19350
connect = live-api-s.facebook.com:443
checkHost = live-api-s.facebook.com

[kick]
client = yes
accept = 127.0.0.1:19353
connect = fa723fc1b01a.global-contribute.live-video.net:443

[x-twitter]
client = yes
accept = 127.0.0.1:19354
connect = va.pscp.tv:443`;

  const copyText = (txt: string, setFn: (v: boolean) => void) => {
    navigator.clipboard.writeText(txt);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-amber-400" />
            <span>VPS Deployment Assistant</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Universal one-step deployment script and configuration inspector for CookieRTMPS dual-pipeline streaming.
          </p>
        </div>

        <button
          onClick={handleCopyOneLiner}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/20"
        >
          {copiedCmd ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
          <span>{copiedCmd ? 'Command Copied!' : 'Copy Quick Install Command'}</span>
        </button>
      </div>

      {/* Installer Script Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Universal One-Step Deployment & Upgrade Command</span>
          </span>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
            Interactive Shell Installer
          </span>
        </div>
        <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 font-semibold overflow-x-auto whitespace-pre-wrap break-all">
          {oneLinerCmd}
        </pre>
        <p className="text-[11px] text-slate-400">
          Paste into your VPS terminal as root or sudoer. Runs the complete, automated CookieRTMPS setup menu.
        </p>
      </div>

      {/* File & Config Inspector Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center space-x-2 border-b border-slate-800 pb-3 gap-y-2">
          <button
            onClick={() => setActiveFile('install')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeFile === 'install' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>install.sh Sequential Flow (13 Options)</span>
          </button>
          <button
            onClick={() => setActiveFile('stunnel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeFile === 'stunnel' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>stunnel.conf Proxies</span>
          </button>
        </div>

        <div>
          {activeFile === 'install' && (
            <div className="space-y-4 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-amber-400">Sequential Menu Options in <code className="font-mono">install.sh</code>:</p>
                <span className="text-[10px] text-slate-500 font-mono">Clean 13-Option Menu</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 font-mono text-[12px] text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Install Docker (if not installed)</span> — Official Docker engine bootstrap</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure Stream Keys (Horizontal)</span> — Main multi-relay destinations (Twitch, Kick, YouTube, Facebook, Twitter)</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure Stream Keys (Vertical)</span> — Dedicated 9:16 mobile destinations (TikTok, YouTube Shorts, Kick, Instagram)</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure OBS Setup & Security Key</span> — Ingest credentials, auth verification token, and OBS connection parameters</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure IP Whitelist (Optional)</span> — Lock down broadcast ingest to specific IPs or VPN subnets</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure Domain / Reverse Proxy (Optional)</span> — Setup custom domain or Nginx reverse proxy headers</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure Optimizations (Chunk Size)</span> — RTMP chunk size, TCP BBR congestion control, network buffer tuning</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Configure NOALBS Scene Switcher</span> — Disconnection failover MP4 looping fallback with zero stream collisions</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Build & Start Server</span> — Compiles Nginx 1.30.3 with RTMP module & launches full dockerized stack</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Run Integration Tests</span> — Automated test suite verifying health, authentication, audio, and failover</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Stop Server & Uninstall</span> — Cleanly tears down containers, networks, and cleans temporary files</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">View Logs</span> — Live log viewer for Nginx RTMP, Stunnel, and Python stream validator</li>
                <li className="text-slate-200"><span className="text-amber-400 font-semibold">Quit</span> — Safe exit without modifying running server state</li>
              </ol>
            </div>
          )}

          {activeFile === 'stunnel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Stunnel RTMPS Local Encrypted Proxies</span>
                <button
                  onClick={() => copyText(stunnelConfigSnippet, setCopiedStunnel)}
                  className="text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-lg transition flex items-center space-x-1"
                >
                  {copiedStunnel ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedStunnel ? 'Copied' : 'Copy stunnel.conf'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
                {stunnelConfigSnippet}
              </pre>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
