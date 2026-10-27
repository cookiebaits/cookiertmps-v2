import React, { useState, useEffect } from 'react';
import { Activity, Server, Radio, ArrowUpRight, Cpu, Layers } from 'lucide-react';

export const StatsMonitorTab: React.FC = () => {
  const [bandwidth, setBandwidth] = useState(6450); // kbps
  const [fps, setFps] = useState(60);
  const [clientsCount, setClientsCount] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setBandwidth(6000 + Math.floor(Math.random() * 800));
      setFps(59 + (Math.random() > 0.8 ? 0 : 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <span>Nginx RTMP Relay & Bandwidth Diagnostic Monitor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry read privately on the server from the Nginx RTMP stats module (not exposed to the internet).
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">CHUNK_SIZE:</span>
          <span className="text-emerald-400 font-bold">8192 Bytes</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-semibold block">Total Ingest Bitrate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-amber-400">{bandwidth}</span>
            <span className="text-xs text-slate-400 font-mono">kbps</span>
          </div>
          <p className="text-[10px] text-slate-500">1080p60 High Quality Ingest</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-semibold block">Encoder Framerate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-400">{fps}</span>
            <span className="text-xs text-slate-400 font-mono">fps</span>
          </div>
          <p className="text-[10px] text-slate-500">Solid frame lock</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-semibold block">Relaying Outbound Targets</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-blue-400">{clientsCount}</span>
            <span className="text-xs text-slate-400 font-mono">Pushes</span>
          </div>
          <p className="text-[10px] text-slate-500">Twitch, YT, Kick, TikTok, X</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 font-semibold block">Active Pushers</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-purple-400">2</span>
            <span className="text-xs text-slate-400 font-mono">tiktok_pusher</span>
          </div>
          <p className="text-[10px] text-slate-500">Horizontal + Vertical auto-pusher</p>
        </div>

      </div>

      {/* Active Relay Streams Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Active RTMP Ingest Applications & Push Targets</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2">App Name</th>
                <th className="pb-2">Client IP</th>
                <th className="pb-2">Stream Key</th>
                <th className="pb-2">Time Active</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-2.5 font-bold text-amber-400">live</td>
                <td className="py-2.5">192.168.1.50</td>
                <td className="py-2.5">yt_live_...123</td>
                <td className="py-2.5">02:45:12</td>
                <td className="py-2.5 text-emerald-400 font-bold">PUBLISHING</td>
              </tr>
              <tr>
                <td className="py-2.5 font-bold text-purple-400">vertical</td>
                <td className="py-2.5">192.168.1.50</td>
                <td className="py-2.5">yt_vert_...8877</td>
                <td className="py-2.5">02:45:12</td>
                <td className="py-2.5 text-emerald-400 font-bold">PUBLISHING</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
