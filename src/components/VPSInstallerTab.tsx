import React, { useState } from 'react';
import { Terminal, Copy, Check, Shield, Server, FileText, Download, ShieldCheck, Zap } from 'lucide-react';

export const VPSInstallerTab: React.FC = () => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeFile, setActiveFile] = useState<'install' | 'wireguard' | 'stunnel'>('wireguard');
  const [wgVariant, setWgVariant] = useState<'with_cf' | 'without_cf'>('with_cf');
  const [copiedWg1, setCopiedWg1] = useState(false);
  const [copiedWg2, setCopiedWg2] = useState(false);

  const oneLinerCmd = `if [ -f "./install.sh" ]; then (git pull 2>/dev/null || true); elif [ -d "CookieRTMP-v2" ]; then cd CookieRTMP-v2 && (git pull 2>/dev/null || true); else git clone https://github.com/cookiebaits/CookieRTMP-v2.git && cd CookieRTMP-v2; fi && chmod +x install.sh && ./install.sh`;

  const handleCopyOneLiner = () => {
    navigator.clipboard.writeText(oneLinerCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  // WireGuard Configs: WITH Cloudflare Anti-Flag & ISP Host Masking
  const wg1ConfigWithCF = `# --- Instance 1: Primary Ingest Gateway (Port 51820) [/etc/wireguard/wg0.conf] ---
[Interface]
Address = 10.8.0.1/24
PrivateKey = <SERVER_INSTANCE_1_PRIVATE_KEY>
ListenPort = 51820
MTU = 1280
DNS = 1.1.1.1, 1.0.0.1
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; sysctl -w net.ipv4.ip_forward=1
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Broadcaster / OBS Studio Client
PublicKey = <CLIENT_OBS_PUBLIC_KEY>
AllowedIPs = 10.8.0.2/32

[Peer]
# Instance 2 Failover Peer (Cloudflare Anti-Flag Tunnel)
PublicKey = <SERVER_INSTANCE_2_PUBLIC_KEY>
AllowedIPs = 10.8.0.3/32
Endpoint = 162.159.192.1:2408
PersistentKeepalive = 25`;

  const wg2ConfigWithCF = `# --- Instance 2: Secondary Failover Gateway (Port 51821) [/etc/wireguard/wg1.conf] ---
[Interface]
Address = 10.9.0.1/24
PrivateKey = <SERVER_INSTANCE_2_PRIVATE_KEY>
ListenPort = 51821
MTU = 1280
DNS = 1.1.1.1, 1.0.0.1
PostUp = iptables -A FORWARD -i wg1 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; sysctl -w net.ipv4.ip_forward=1
PostDown = iptables -D FORWARD -i wg1 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Broadcaster / OBS Studio Client
PublicKey = <CLIENT_OBS_PUBLIC_KEY>
AllowedIPs = 10.9.0.2/32
Endpoint = 162.159.192.2:2408
PersistentKeepalive = 25`;

  // WireGuard Configs: WITHOUT Cloudflare Anti-Flag (Standard Direct)
  const wg1ConfigWithoutCF = `# --- Instance 1: Primary Ingest Gateway (Port 51820) [/etc/wireguard/wg0.conf] ---
[Interface]
Address = 10.8.0.1/24
PrivateKey = <SERVER_INSTANCE_1_PRIVATE_KEY>
ListenPort = 51820
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; sysctl -w net.ipv4.ip_forward=1
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Broadcaster / OBS Studio Client
PublicKey = <CLIENT_OBS_PUBLIC_KEY>
AllowedIPs = 10.8.0.2/32

[Peer]
# Instance 2 Failover Peer (Direct Public IP)
PublicKey = <SERVER_INSTANCE_2_PUBLIC_KEY>
AllowedIPs = 10.8.0.3/32
Endpoint = <INSTANCE_2_DIRECT_IP>:51821
PersistentKeepalive = 25`;

  const wg2ConfigWithoutCF = `# --- Instance 2: Secondary Failover Gateway (Port 51821) [/etc/wireguard/wg1.conf] ---
[Interface]
Address = 10.9.0.1/24
PrivateKey = <SERVER_INSTANCE_2_PRIVATE_KEY>
ListenPort = 51821
PostUp = iptables -A FORWARD -i wg1 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE; sysctl -w net.ipv4.ip_forward=1
PostDown = iptables -D FORWARD -i wg1 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
# Broadcaster / OBS Studio Client
PublicKey = <CLIENT_OBS_PUBLIC_KEY>
AllowedIPs = 10.9.0.2/32
Endpoint = <INSTANCE_1_DIRECT_IP>:51820
PersistentKeepalive = 25`;

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
            <span>VPS Deployment Assistant & WireGuard Dual Gateway</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Universal one-step deployment with automatic dual WireGuard configuration output (with and without Cloudflare Anti-Flag).
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
            Directly outputs both WireGuard configs (No prompt)
          </span>
        </div>
        <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 font-semibold overflow-x-auto whitespace-pre-wrap break-all">
          {oneLinerCmd}
        </pre>
        <p className="text-[11px] text-slate-400">
          Paste into your terminal. Selecting <code className="text-amber-400">[1] Setup WireGuard Servers (Instances 1 & 2)</code> outputs both configurations directly without asking any interactive Cloudflare prompts.
        </p>
      </div>

      {/* File & Config Inspector Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center space-x-2 border-b border-slate-800 pb-3 gap-y-2">
          <button
            onClick={() => setActiveFile('wireguard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeFile === 'wireguard' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>[1] WireGuard Servers (Instances 1 & 2)</span>
          </button>
          <button
            onClick={() => setActiveFile('install')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeFile === 'install' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            install.sh Sequential Flow (14 Steps)
          </button>
          <button
            onClick={() => setActiveFile('stunnel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeFile === 'stunnel' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            stunnel.conf Proxies
          </button>
        </div>

        <div>
          {/* WireGuard Section */}
          {activeFile === 'wireguard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>WireGuard Configuration Output Variant:</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setWgVariant('with_cf')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      wgVariant === 'with_cf'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ☁️ With Cloudflare Anti-Flag & ISP Masking
                  </button>
                  <button
                    onClick={() => setWgVariant('without_cf')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      wgVariant === 'without_cf'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Without Cloudflare (Standard Direct)
                  </button>
                </div>
              </div>

              {/* Dual Output Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Instance 1 */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      Instance 1: Primary Gateway (/etc/wireguard/wg0.conf)
                    </span>
                    <button
                      onClick={() =>
                        copyText(
                          wgVariant === 'with_cf' ? wg1ConfigWithCF : wg1ConfigWithoutCF,
                          setCopiedWg1
                        )
                      }
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded transition flex items-center space-x-1"
                    >
                      {copiedWg1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWg1 ? 'Copied' : 'Copy wg0.conf'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                    {wgVariant === 'with_cf' ? wg1ConfigWithCF : wg1ConfigWithoutCF}
                  </pre>
                </div>

                {/* Instance 2 */}
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      Instance 2: Failover Gateway (/etc/wireguard/wg1.conf)
                    </span>
                    <button
                      onClick={() =>
                        copyText(
                          wgVariant === 'with_cf' ? wg2ConfigWithCF : wg2ConfigWithoutCF,
                          setCopiedWg2
                        )
                      }
                      className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded transition flex items-center space-x-1"
                    >
                      {copiedWg2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWg2 ? 'Copy wg1.conf' : 'Copy wg1.conf'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                    {wgVariant === 'with_cf' ? wg2ConfigWithCF : wg2ConfigWithoutCF}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeFile === 'install' && (
            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-semibold text-amber-400">Sequential Menu Options in <code className="font-mono">install.sh</code>:</p>
              <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] text-slate-300">
                <li className="text-amber-300 font-bold">Setup WireGuard Servers (Instances 1 & 2) — Direct Dual Output (No Prompts)</li>
                <li>Install Docker & Dependencies</li>
                <li>Configure Horizontal (Main) Stream Destinations</li>
                <li>Configure Vertical Stream Destinations</li>
                <li>Configure OBS Setup & Ingest Security (Stream Key Password)</li>
                <li>Configure Server Performance & Chunk Size</li>
                <li>Configure Network & IP Whitelist</li>
                <li>Configure Titles & Chat Credentials (Twitch/YouTube OAuth)</li>
                <li>Configure Domain / Reverse Proxy</li>
                <li>Configure RTMPS Stunnel Proxy Ports</li>
                <li>Configure NOALBS Scene Switcher (Cloud MP4 Looping Failover)</li>
                <li>Build & Start Server</li>
                <li>Run Integration Tests</li>
                <li>Stop Server & Complete Clean Uninstall</li>
              </ol>
            </div>
          )}

          {activeFile === 'stunnel' && (
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
              {stunnelConfigSnippet}
            </pre>
          )}
        </div>
      </div>

    </div>
  );
};
