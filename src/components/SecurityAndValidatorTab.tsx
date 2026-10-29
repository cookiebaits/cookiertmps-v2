import React, { useState, useEffect } from 'react';
import { StreamValidatorLog } from '../types';
import { ShieldCheck, ShieldAlert, Play, Check, AlertTriangle, Terminal, Lock, Globe, Power, Radio, Activity, Wifi, RefreshCw } from 'lucide-react';
import { authFetch } from '../api';

export const SecurityAndValidatorTab: React.FC = () => {
  const [acceptedIp, setAcceptedIp] = useState<string>('192.168.1.0/24, 10.0.0.1');
  const [testKey, setTestKey] = useState<string>('yt_live_key_sample123');
  const [testClientIp, setTestClientIp] = useState<string>('192.168.1.50');
  const [testAppName, setTestAppName] = useState<string>('live');
  
  // Web Dashboard Disable State
  const [isWebUiDisabled, setIsWebUiDisabled] = useState<boolean>(false);
  const [isTogglingWebUi, setIsTogglingWebUi] = useState<boolean>(false);
  const [webUiMsg, setWebUiMsg] = useState<string | null>(null);

  const [testResult, setTestResult] = useState<{
    status: number;
    text: string;
    allowed: boolean;
  } | null>(null);

  const [logs, setLogs] = useState<StreamValidatorLog[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      clientIp: '192.168.1.50',
      streamKey: 'yt_live_key_sample123',
      appName: 'live',
      status: 'ACCEPTED',
      message: 'ACCEPTED stream from 192.168.1.50 (Key: yt_l...23)',
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      clientIp: '45.33.12.8',
      streamKey: 'unauthorized_hacker_key',
      appName: 'live',
      status: 'REJECTED',
      message: 'REJECTED invalid key from 45.33.12.8',
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      clientIp: '127.0.0.1',
      streamKey: 'vertical_stream_key',
      appName: 'vertical',
      status: 'ACCEPTED',
      message: 'ACCEPTED vertical stream from 127.0.0.1',
    },
  ]);

  useEffect(() => {
    authFetch('/api/web_ui/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.disabled === 'boolean') {
          setIsWebUiDisabled(data.disabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleWebUi = async () => {
    setIsTogglingWebUi(true);
    setWebUiMsg(null);
    try {
      const nextState = !isWebUiDisabled;
      const res = await authFetch('/api/web_ui/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsWebUiDisabled(data.disabled);
        setWebUiMsg(
          data.disabled
            ? 'Web Dashboard is now DISABLED for public access. Returns 403 to visitors.'
            : 'Web Dashboard is now ENABLED for normal control panel access.'
        );
      } else {
        setWebUiMsg(data.message || 'Failed to toggle Web Dashboard state.');
      }
    } catch (e) {
      setWebUiMsg('Connection error toggling Web Dashboard.');
    } finally {
      setIsTogglingWebUi(false);
      setTimeout(() => setWebUiMsg(null), 5000);
    }
  };

  const handleTestValidator = async () => {
    try {
      const body = new URLSearchParams();
      body.append('name', testKey);
      body.append('addr', testClientIp);
      body.append('app', testAppName);

      const resp = await fetch('/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'CF-Connecting-IP': testClientIp,
        },
        body: body.toString(),
      });

      const text = await resp.text();
      const isAllowed = resp.status === 200;

      setTestResult({
        status: resp.status,
        text,
        allowed: isAllowed,
      });

      // Add log
      const newLog: StreamValidatorLog = {
        id: String(Date.now()),
        timestamp: new Date().toLocaleTimeString(),
        clientIp: testClientIp,
        streamKey: testKey,
        appName: testAppName,
        status: isAllowed ? 'ACCEPTED' : 'REJECTED',
        message: isAllowed
          ? `ACCEPTED stream from ${testClientIp} (Key: ${testKey.slice(0, 4)}...)`
          : `REJECTED (${text}) from ${testClientIp}`,
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 19)]);
    } catch (err: any) {
      setTestResult({
        status: 500,
        text: err.message || 'Connection Error',
        allowed: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>IP Whitelist, Anti-Disconnect Stability & Web Page Access</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            CookieRTMPS features hardened RTMP buffer queues, Stunnel auto-reconnect, and dynamic Web UI disabling for high-security stream operations.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-slate-300">CF-Connecting-IP Real-IP Header Active</span>
        </div>
      </div>

      {/* Stream Stability & Web Page Control Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Anti-Disconnect Traffic & Stream Stability Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-amber-400" />
                <span>YouTube & Twitch Stream Stability Controls</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Zero-disconnect buffer and socket configuration</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
              STABILITY ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Drop Idle Protection</span>
              <span className="text-amber-400 font-bold font-mono text-sm">20 Seconds</span>
              <p className="text-[10px] text-slate-400">Prevents disconnects during network jitter</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Stunnel TLS Keepalive</span>
              <span className="text-emerald-400 font-bold font-mono text-sm">SO_KEEPALIVE=1</span>
              <p className="text-[10px] text-slate-400">Auto-reconnects YouTube & Twitch RTMPS</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Nginx Message Buffer</span>
              <span className="text-blue-400 font-bold font-mono text-sm">32MB / Queue 8192</span>
              <p className="text-[10px] text-slate-400">Zero frame dropping under high bitrates</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Socket Buffer Allocation</span>
              <span className="text-purple-400 font-bold font-mono text-sm">4MB Send/Receive</span>
              <p className="text-[10px] text-slate-400">Smooth flow for 1080p60 & 4K streams</p>
            </div>
          </div>
        </div>

        {/* Disable Web Dashboard Control Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Web Dashboard Access Control</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Optionally disable web page HTTP access</p>
            </div>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold border ${
                isWebUiDisabled
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isWebUiDisabled ? 'WEB PAGE DISABLED' : 'WEB PAGE ACTIVE'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  {isWebUiDisabled ? 'Web Page Access is Currently Disabled' : 'Web Page Access is Currently Enabled'}
                </span>
                <button
                  onClick={handleToggleWebUi}
                  disabled={isTogglingWebUi}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-md ${
                    isWebUiDisabled
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>
                    {isTogglingWebUi
                      ? 'Updating...'
                      : isWebUiDisabled
                        ? 'Enable Web Page'
                        : 'Disable Web Page'}
                  </span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                When disabled, Nginx returns <code className="text-rose-300 font-mono">403 Forbidden</code> for visitors accessing the web dashboard site. Your RTMP stream ingests, stream validator, and disconnection protection will remain 100% operational.
              </p>

              {webUiMsg && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono animate-fade-in">
                  {webUiMsg}
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              Note: You can also toggle this via <code className="text-amber-400">./install.sh</code> menu option 10 on your host VPS or by setting <code className="text-amber-400">DISABLE_WEB_UI=true</code>.
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Interactive Validator Tester */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Play className="w-4 h-4 text-amber-400" />
              <span>Live Ingest Key Validation Test</span>
            </h3>
            <p className="text-xs text-slate-400">Send simulated publish payload to <code className="text-amber-300 font-mono">/validate</code></p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stream Key Attempt (<code className="text-amber-400">name</code> parameter)
              </label>
              <input
                type="text"
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
                placeholder="e.g. yt_live_key_sample123 or my_stream_key"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Client IP (<code className="text-amber-400">addr</code>)
                </label>
                <input
                  type="text"
                  value={testClientIp}
                  onChange={(e) => setTestClientIp(e.target.value)}
                  placeholder="e.g. 192.168.1.50"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  App Name (<code className="text-amber-400">app</code>)
                </label>
                <select
                  value={testAppName}
                  onChange={(e) => setTestAppName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                >
                  <option value="live">live (Horizontal)</option>
                  <option value="vertical">vertical (Vertical)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleTestValidator}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Simulate Stream Publish Attempt</span>
            </button>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center justify-between font-mono ${
                  testResult.allowed
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {testResult.allowed ? (
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">HTTP {testResult.status}</span> — {testResult.text}
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-950/40">
                  {testResult.allowed ? 'AUTHORIZED' : 'DENIED'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* IP Whitelist Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">IP Whitelist Configuration</h3>
            <p className="text-xs text-slate-400">Set allowed streaming host IPs or CIDR blocks (<code className="text-amber-300 font-mono">ACCEPTED_IP</code>)</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ACCEPTED_IP Setting (Comma-separated IPs / Subnets)
              </label>
              <textarea
                rows={3}
                value={acceptedIp}
                onChange={(e) => setAcceptedIp(e.target.value)}
                placeholder="e.g. 192.168.1.0/24, 203.0.113.1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Leave empty to allow streaming from any IP address with a valid key.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Security Architecture Highlights
              </span>
              <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Platform outputs only accept video from the server itself, so the backup video can never be hijacked from outside.</li>
                <li>Cloudflare proxy IP headers are unwrapped using Nginx <code className="text-amber-300 font-mono">set_real_ip_from</code> rules.</li>
                <li>Rejected publish attempts return <code className="text-rose-400">HTTP 403 Forbidden</code> directly to Nginx RTMP module.</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Validator Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>Validator Inspection Log</span>
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">/tmp/validator.log</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                log.status === 'ACCEPTED'
                  ? 'bg-slate-950 border-emerald-500/20 text-emerald-300/90'
                  : 'bg-slate-950 border-rose-500/20 text-rose-300/90'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                <span>{log.message}</span>
              </div>
              <span
                className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold ${
                  log.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
