import React, { useState } from 'react';
import { StreamValidatorLog } from '../types';
import { ShieldCheck, ShieldAlert, Play, Check, AlertTriangle, Terminal, Lock } from 'lucide-react';

export const SecurityAndValidatorTab: React.FC = () => {
  const [acceptedIp, setAcceptedIp] = useState<string>('192.168.1.0/24, 10.0.0.1');
  const [testKey, setTestKey] = useState<string>('yt_live_key_sample123');
  const [testClientIp, setTestClientIp] = useState<string>('192.168.1.50');
  const [testAppName, setTestAppName] = useState<string>('live');
  
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
            <span>IP Whitelist & Stream Key Validator Inspector</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            CookieRTMPS uses strict key check logic + IP whitelisting to eliminate stream hijacking risks.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-slate-300">CF-Connecting-IP Real-IP Header Active</span>
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
