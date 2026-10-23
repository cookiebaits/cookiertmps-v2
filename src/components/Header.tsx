import React from 'react';
import { ShieldCheck, Copy, Check, Server, RefreshCw, KeyRound, Monitor, Lock } from 'lucide-react';
import { ChatPlatformConfig } from '../types';

interface HeaderProps {
  isLive: boolean;
  activeKeyCount: number;
  obsHexKey: string;
  onCycleObsKey: () => void;
  isCyclingKey: boolean;
  platforms?: ChatPlatformConfig[];
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLive,
  activeKeyCount,
  obsHexKey,
  onCycleObsKey,
  isCyclingKey,
  platforms,
  onLogout,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [justCycled, setJustCycled] = React.useState(false);

  const getPrivateObsUrl = () => {
    const origin = window.location.origin;
    const params = new URLSearchParams();
    params.set('key', obsHexKey);
    params.set('mode', 'unified');

    let activePlatforms = platforms;
    if (!activePlatforms) {
      try {
        const saved = localStorage.getItem('cookiertmps_chat_platforms');
        if (saved) {
          activePlatforms = JSON.parse(saved);
        }
      } catch (e) {}
    }

    if (activePlatforms && activePlatforms.length > 0) {
      // ONLY include platforms that the user has explicitly ENABLED (active === true)
      activePlatforms.forEach((p) => {
        if (p.active && p.channel && p.channel.trim()) {
          let clean = p.channel.trim();
          if (clean.includes('youtube.com/') || clean.includes('youtu.be/')) {
            try {
              const u = new URL(clean.startsWith('http') ? clean : 'https://' + clean);
              const v = u.searchParams.get('v');
              if (v && v.length === 11) clean = v;
              else {
                const parts = u.pathname.split('/').filter(Boolean);
                const handle = parts.find((pt) => pt.startsWith('@'));
                if (handle) clean = handle.slice(1);
                else if (parts[0] && parts[0] !== 'live' && parts[0] !== 'watch') {
                  clean = parts[0] === 'c' || parts[0] === 'channel' || parts[0] === 'user' ? (parts[1] || parts[0]) : parts[0];
                }
              }
            } catch (e) {}
          }
          clean = clean.replace(/^@/, '').replace(/\/live\/?$/, '');
          if (clean) {
            params.set(p.id, clean);
          }
        }
      });
    } else {
      // Default initial state
      params.set('twitch', 'cookiebaits');
      params.set('youtube', 'cookiebaits');
      params.set('kick', 'cookiebaits');
    }

    return `${origin}/chat.html?${params.toString()}`;
  };

  const handleCopyObsUrl = () => {
    navigator.clipboard.writeText(getPrivateObsUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCycleClick = () => {
    onCycleObsKey();
    setJustCycled(true);
    setTimeout(() => setJustCycled(false), 2500);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/30">
            🍪
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-slate-100 tracking-tight">CookieRTMPS</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                v1.30.3 RTMP
              </span>
            </div>
            <p className="text-xs text-slate-400">Hardened Self-Hosted Multistream Relay & Control Center</p>
          </div>
        </div>

        {/* Center: System Status Pill */}
        <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-1.5 rounded-full border border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-semibold text-slate-200">
              {isLive ? 'RELAY LIVE' : 'VALIDATOR READY'}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          <div className="flex items-center space-x-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Key Check Active ({activeKeyCount} Keys)</span>
          </div>

          <div className="h-3 w-px bg-slate-800"></div>

          <div className="flex items-center space-x-1 text-slate-400">
            <Server className="w-3.5 h-3.5 text-blue-400" />
            <span>Chunk 8192</span>
          </div>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center space-x-2">
          {/* Replaced Copy RTMP URL with Copy OBS URL */}
          <button
            onClick={handleCopyObsUrl}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-md shadow-amber-500/20 border border-amber-400"
            title={`Copy Private Hex-Coded OBS Browser Source URL (Key: ${obsHexKey})`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" /> : <Monitor className="w-3.5 h-3.5 text-slate-950" />}
            <span>{copied ? 'Copied OBS URL!' : 'Copy OBS URL'}</span>
          </button>

          {/* Button next to it: Cycles / changes the private hex key */}
          <button
            onClick={handleCycleClick}
            disabled={isCyclingKey}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg transition border border-slate-700 disabled:opacity-50 relative group"
            title="Refresh & Change Private OBS Hex Key"
          >
            <RefreshCw className={`w-4 h-4 ${isCyclingKey ? 'animate-spin text-amber-400' : ''}`} />
            
            {/* Tooltip on hover */}
            <span className="absolute right-0 -bottom-8 hidden group-hover:block bg-slate-950 border border-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded shadow whitespace-nowrap z-50">
              Change Private Hex Key ({obsHexKey.slice(0, 8)}...)
            </span>
          </button>

          {/* Lock / Logout Session button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition border border-slate-700 hover:border-rose-500/40"
              title="Lock Dashboard Session"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
          {justCycled && (
            <div className="absolute right-4 top-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-lg animate-fade-in z-50">
              <KeyRound className="w-3 h-3 text-emerald-400" />
              <span>New Hex Key: {obsHexKey}</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
