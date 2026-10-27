import React from 'react';
import { TabType } from '../types';
import { MessageSquare, Key, Type, ShieldCheck, LifeBuoy, Activity, Terminal } from 'lucide-react';

interface NavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'chat' as TabType, label: 'Combined Chat', icon: MessageSquare, badge: 'Live' },
    { id: 'destinations' as TabType, label: 'Destinations & Keys', icon: Key },
    { id: 'titles' as TabType, label: 'Auto-Titles & Ep.#', icon: Type },
    { id: 'security' as TabType, label: 'IP Whitelist & Security', icon: ShieldCheck },
    { id: 'protection' as TabType, label: 'Disconnection Protection', icon: LifeBuoy },
    { id: 'stats' as TabType, label: 'RTMP Stats & Relay', icon: Activity },
    { id: 'installer' as TabType, label: 'VPS Deploy & Stunnel', icon: Terminal },
  ];

  return (
    <nav className="border-b border-slate-800 bg-slate-900/40 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full uppercase font-bold ${
                  isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
