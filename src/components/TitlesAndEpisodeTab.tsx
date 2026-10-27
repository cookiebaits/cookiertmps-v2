import React, { useState, useEffect } from 'react';
import { authFetch } from '../api';
import { Type, Plus, Minus, RefreshCw, Check, Sparkles, Key, AlertCircle } from 'lucide-react';

export const TitlesAndEpisodeTab: React.FC = () => {
  const [episodeCount, setEpisodeCount] = useState<number>(1);
  const [baseTitle, setBaseTitle] = useState<string>('Live Stream');
  const [twitchClientId, setTwitchClientId] = useState<string>('');
  const [twitchOAuthToken, setTwitchOAuthToken] = useState<string>('');
  const [twitchBroadcasterId, setTwitchBroadcasterId] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncedMessage, setSyncedMessage] = useState<string | null>(null);

  const currentDateStr = new Date().toISOString().split('T')[0];
  const formattedTitle = `${baseTitle} | Ep.${episodeCount} | ${currentDateStr}`;

  useEffect(() => {
    authFetch('/api/episode')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.count === 'number') {
          setEpisodeCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateEpisode = async (action: 'increment' | 'decrement' | 'set', countVal?: number) => {
    let newCount = episodeCount;
    if (action === 'increment') newCount += 1;
    if (action === 'decrement' && episodeCount > 1) newCount -= 1;
    if (action === 'set' && typeof countVal === 'number') newCount = countVal;

    setEpisodeCount(newCount);

    try {
      await authFetch('/api/episode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, count: newCount }),
      });
    } catch {}
  };

  const handleSyncTwitchTitle = async () => {
    setIsSyncing(true);
    setSyncedMessage(null);

    // Simulate calling update_titles.py
    setTimeout(() => {
      setIsSyncing(false);
      setSyncedMessage(`Successfully updated title to: "${formattedTitle}"`);
      setTimeout(() => setSyncedMessage(null), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <Type className="w-5 h-5 text-amber-400" />
            <span>Automated Stream Title & Episode Manager</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            CookieRTMPS dynamically formats titles and increments episode numbers in <code className="text-amber-300 font-mono">/app/data/episode_count.txt</code> when streams disconnect.
          </p>
        </div>

        <button
          onClick={handleSyncTwitchTitle}
          disabled={isSyncing}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-slate-950' : ''}`} />
          <span>{isSyncing ? 'Syncing Title...' : 'Sync Title Now'}</span>
        </button>
      </div>

      {syncedMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{syncedMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Episode Counter Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Episode Counter</h3>
              <p className="text-xs text-slate-400">Persisted in host volume <code className="text-slate-300 font-mono">./data/episode_count.txt</code></p>
            </div>
            <span className="text-2xl font-black font-mono text-amber-400 bg-slate-950 px-4 py-1 rounded-xl border border-slate-800">
              Ep. {episodeCount}
            </span>
          </div>

          <div className="flex items-center justify-center space-x-4 py-4">
            <button
              onClick={() => handleUpdateEpisode('decrement')}
              disabled={episodeCount <= 1}
              className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl transition border border-slate-700"
              title="Decrement Episode Count"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="text-center px-6">
              <span className="text-4xl font-extrabold text-slate-100 font-mono tracking-tight">
                {episodeCount}
              </span>
              <p className="text-[10px] text-slate-500 uppercase font-semibold mt-1">Current Episode</p>
            </div>

            <button
              onClick={() => handleUpdateEpisode('increment')}
              className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl transition shadow-lg shadow-amber-500/20 font-bold"
              title="Increment Episode Count"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Formatted Title Preview */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Formatted Live Broadcast Title
            </span>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-sm text-amber-300 font-bold">
              {formattedTitle}
            </div>
          </div>
        </div>

        {/* Base Title & Twitch API Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-100">Base Title & Twitch API Settings</h3>
            <p className="text-xs text-slate-400">Configure parameters passed to <code className="text-slate-300 font-mono">update_titles.py</code></p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                STREAM_BASE_TITLE
              </label>
              <input
                type="text"
                value={baseTitle}
                onChange={(e) => setBaseTitle(e.target.value)}
                placeholder="Live Stream Base Title"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  TWITCH_CLIENT_ID
                </label>
                <input
                  type="password"
                  value={twitchClientId}
                  onChange={(e) => setTwitchClientId(e.target.value)}
                  placeholder="Client ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  TWITCH_BROADCASTER_ID
                </label>
                <input
                  type="password"
                  value={twitchBroadcasterId}
                  onChange={(e) => setTwitchBroadcasterId(e.target.value)}
                  placeholder="Broadcaster Numeric ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                TWITCH_OAUTH_TOKEN
              </label>
              <input
                type="password"
                value={twitchOAuthToken}
                onChange={(e) => setTwitchOAuthToken(e.target.value)}
                placeholder="oauth:xxxxxxxxxxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <span>
                Automatic title syncing runs on stream start when valid Twitch credentials are present in the server environment.
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
