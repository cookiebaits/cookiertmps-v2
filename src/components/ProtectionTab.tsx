import React, { useEffect, useState } from 'react';
import { ShieldCheck, Radio, Film, Clock, Gauge, AlertTriangle, Terminal, MonitorSmartphone, Monitor } from 'lucide-react';
import { authFetch } from '../api';

type ChannelState = 'idle' | 'live' | 'backup';

interface ChannelStatus {
  state: ChannelState;
  kbps: number | null;
  backupElapsed: number;
  lastEvent: string;
}

interface ProtectionStatus {
  running: boolean;
  enabled?: boolean;
  lowBitrateKbps?: number;
  restoreBitrateKbps?: number;
  timeoutSeconds?: number;
  videoUrl?: string;
  updatedAt?: number;
  channels?: Record<string, ChannelStatus>;
}

const DEFAULT_VIDEO = 'Default backup video';

const STATE_STYLES: Record<ChannelState, { label: string; badge: string; dot: string }> = {
  live: { label: 'Live', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  backup: { label: 'Backup video playing', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  idle: { label: 'Waiting for stream', badge: 'bg-slate-800 text-slate-300 border-slate-700', dot: 'bg-slate-500' },
};

const isStatus = (data: unknown): data is ProtectionStatus =>
  typeof data === 'object' && data !== null && typeof (data as ProtectionStatus).running === 'boolean';

const ChannelCard: React.FC<{ name: string; status?: ChannelStatus; timeout: number; low: number }> = ({ name, status, timeout, low }) => {
  const state: ChannelState = status?.state ?? 'idle';
  const style = STATE_STYLES[state];
  const Icon = name === 'vertical' ? MonitorSmartphone : Monitor;
  const remaining = Math.max(0, timeout - (status?.backupElapsed ?? 0));
  const progress = timeout > 0 ? Math.min(100, ((status?.backupElapsed ?? 0) / timeout) * 100) : 0;
  const kbps = status?.kbps;
  const kbpsColor = kbps == null ? 'text-slate-500' : kbps < low ? 'text-rose-300' : 'text-slate-100';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 transition-colors duration-300 hover:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-100 capitalize">{name} stream</h3>
        </div>
        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${style.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${state !== 'idle' ? 'animate-pulse' : ''}`} />
          <span>{style.label}</span>
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Incoming bitrate</p>
          <p className={`text-2xl font-bold font-mono transition-colors ${kbpsColor}`}>
            {kbps == null ? '--' : kbps.toLocaleString()}
            <span className="text-xs font-medium text-slate-400 ml-1">kbps</span>
          </p>
        </div>
        {state === 'backup' && (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Broadcast ends in</p>
            <p className="text-2xl font-bold font-mono text-amber-300">{remaining}s</p>
          </div>
        )}
      </div>

      {state === 'backup' && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 transition-all duration-1000 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      )}

      <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
        {status?.lastEvent ?? 'Waiting for stream'}
      </p>
    </div>
  );
};

export const ProtectionTab: React.FC = () => {
  const [status, setStatus] = useState<ProtectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await authFetch('/api/protection');
        if (res.status === 401) throw new Error('Your session expired. Sign in again with your stream key.');
        if (!res.ok) throw new Error('The server did not respond.');
        const data: unknown = await res.json();
        if (!isStatus(data)) throw new Error('Unexpected response from the server.');
        if (!cancelled) {
          setStatus(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load protection status.');
      }
    };
    load();
    const id = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const enabled = status?.enabled ?? false;
  const low = status?.lowBitrateKbps ?? 0;
  const restore = status?.restoreBitrateKbps ?? 0;
  const timeout = status?.timeoutSeconds ?? 0;

  const settings = [
    { icon: Gauge, label: 'Switch to backup below', value: low ? `${low.toLocaleString()} kbps` : '--' },
    { icon: Radio, label: 'Back to live at', value: restore ? `${restore.toLocaleString()} kbps` : '--' },
    { icon: Clock, label: 'Backup plays for up to', value: timeout ? `${timeout} seconds` : '--' },
    { icon: Film, label: 'Backup video', value: status?.videoUrl || DEFAULT_VIDEO },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Disconnection Protection</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            If your stream disconnects or your bitrate drops too low, your platforms stay live with your looping backup video.
            If you are not back in time, the broadcast ends on every platform.
          </p>
        </div>
        <span
          className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            !status?.running
              ? 'bg-slate-950 border-slate-800 text-slate-400'
              : enabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${!status?.running ? 'bg-slate-500' : enabled ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          <span>{!status ? 'Loading...' : !status.running ? 'Starting up' : enabled ? 'Protection on' : 'Protection off'}</span>
        </span>
      </div>

      {error && (
        <div className="flex items-start space-x-2 bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-xl px-4 py-3 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {status && !status.running && !error && (
        <div className="flex items-start space-x-2 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-4 py-3 text-xs">
          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>The server is still getting the backup video ready. This takes a few minutes the first time it starts.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['horizontal', 'vertical'].map((name) => (
          <ChannelCard key={name} name={name} status={status?.channels?.[name]} timeout={timeout} low={low} />
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-100">Current settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {settings.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-950 border border-slate-800 rounded-xl p-3 min-w-0">
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mb-1">
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </div>
              <p className="text-sm font-semibold text-slate-100 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>
        <p className="flex items-center space-x-2 text-xs text-slate-400">
          <Terminal className="w-3.5 h-3.5" />
          <span>To change these, run the installer on your VPS and choose "Configure Disconnection Protection", then "Build &amp; Start Server".</span>
        </p>
      </div>
    </div>
  );
};
