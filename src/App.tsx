import React, { useState, useEffect } from 'react';
import { TabType, ChatPlatformConfig } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { CombinedChatTab } from './components/CombinedChatTab';
import { DestinationsTab } from './components/DestinationsTab';
import { TitlesAndEpisodeTab } from './components/TitlesAndEpisodeTab';
import { SecurityAndValidatorTab } from './components/SecurityAndValidatorTab';
import { ProtectionTab } from './components/ProtectionTab';
import { AUTH_STORAGE_KEY } from './api';
import { StatsMonitorTab } from './components/StatsMonitorTab';
import { VPSInstallerTab } from './components/VPSInstallerTab';
import { PasswordAuthModal } from './components/PasswordAuthModal';

function generateHexKey(bytes = 4): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(16).substring(2, 10);
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isCyclingKey, setIsCyclingKey] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(false);

  // Password Protection State
  const [isPasswordProtected, setIsPasswordProtected] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Private Hex Key for OBS Browser Source, initialized from URL pathname if an 8-char hex is present
  const [obsHexKey, setObsHexKey] = useState<string>(() => {
    try {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
      if (/^[0-9a-zA-Z]{8}$/.test(path)) {
        localStorage.setItem('cookiertmps_obs_hex_key', path);
        return path;
      }
    } catch (e) {}
    try {
      const saved = localStorage.getItem('cookiertmps_obs_hex_key');
      if (saved && saved.length >= 8) return saved;
    } catch (e) {}
    const initial = generateHexKey(4);
    try {
      localStorage.setItem('cookiertmps_obs_hex_key', initial);
    } catch (e) {}
    return initial;
  });

  // Platforms state managed globally so Header and CombinedChatTab stay perfectly in sync
  const [platforms, setPlatforms] = useState<ChatPlatformConfig[]>(() => {
    try {
      const saved = localStorage.getItem('cookiertmps_chat_platforms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'twitch',
        name: 'Twitch',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg',
        channel: 'cookiebaits',
        active: true,
      },
      {
        id: 'youtube',
        name: 'YouTube',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg',
        channel: 'https://www.youtube.com/@cookiebaits',
        active: true,
        resolvedYtVideoId: '',
        isResolvingYt: false,
      },
      {
        id: 'kick',
        name: 'Kick',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Kick_logo.svg',
        channel: 'cookiebaits',
        active: true,
      },
      {
        id: 'tiktok',
        name: 'TikTok',
        icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
        channel: 'cookiebaits',
        active: false,
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('cookiertmps_chat_platforms', JSON.stringify(platforms));
    } catch (e) {}
  }, [platforms]);

  const handleCycleObsKey = () => {
    setIsCyclingKey(true);
    const newKey = generateHexKey(4);
    setObsHexKey(newKey);
    try {
      localStorage.setItem('cookiertmps_obs_hex_key', newKey);
    } catch (e) {}
    setTimeout(() => setIsCyclingKey(false), 500);
  };

  useEffect(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (/^[0-9a-zA-Z]{8}$/.test(path)) {
      setObsHexKey(path);
      setActiveTab('chat');
    }
  }, []);

  useEffect(() => {
    fetch('/api/chat_hex_key')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.hexKey && /^[0-9a-zA-Z]{8}$/.test(data.hexKey)) {
          const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
          if (!/^[0-9a-zA-Z]{8}$/.test(path)) {
            setObsHexKey(data.hexKey);
            localStorage.setItem('cookiertmps_obs_hex_key', data.hexKey);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/health')
      .then((res) => {
        if (res.ok) setIsLive(true);
      })
      .catch(() => setIsLive(false));
  }, []);

  // Check Password Protection status on load
  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isPasswordProtected) {
          setIsPasswordProtected(true);
          const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
          if (savedAuth) {
            // Verify saved password
            verifyPassword(savedAuth, true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsPasswordProtected(false);
          setIsAuthenticated(true);
        }
      })
      .catch(() => {
        setIsPasswordProtected(false);
        setIsAuthenticated(true);
      });
  }, []);

  const verifyPassword = async (password: string, isSilent = false) => {
    setIsVerifying(true);
    setAuthError(null);
    try {
      const resp = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setIsAuthenticated(true);
        localStorage.setItem(AUTH_STORAGE_KEY, password);
      } else {
        setIsAuthenticated(false);
        if (!isSilent) {
          setAuthError(data.message || 'Invalid Stream Key / Password');
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    } catch (e) {
      if (!isSilent) setAuthError('Connection error verifying password');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  };

  // If password protection is enabled and user is not authenticated, render ONLY the login prompt box
  if (isPasswordProtected && !isAuthenticated) {
    return (
      <PasswordAuthModal
        onUnlock={(pass) => verifyPassword(pass, false)}
        isLoading={isVerifying}
        errorMsg={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Header Bar */}
      <Header
        isLive={isLive}
        activeKeyCount={7}
        obsHexKey={obsHexKey}
        onCycleObsKey={handleCycleObsKey}
        isCyclingKey={isCyclingKey}
        platforms={platforms}
        onLogout={handleLogout}
      />

      {/* Main Navigation Tabs */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'chat' && (
          <CombinedChatTab
            obsHexKey={obsHexKey}
            onCycleObsKey={handleCycleObsKey}
            platforms={platforms}
            setPlatforms={setPlatforms}
          />
        )}
        {activeTab === 'destinations' && <DestinationsTab />}
        {activeTab === 'titles' && <TitlesAndEpisodeTab />}
        {activeTab === 'security' && <SecurityAndValidatorTab />}
        {activeTab === 'protection' && <ProtectionTab />}
        {activeTab === 'stats' && <StatsMonitorTab />}
        {activeTab === 'installer' && <VPSInstallerTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 CookieRTMPS Control Center — Hardened Nginx 1.30.3 & Local RTMP Module</p>
          <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-400">
            <span>Ports: 1935 (RTMP/RTMPS) / 80 (HTTP) / 443 (HTTPS)</span>
            <span>AMF Recursion: 128</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
