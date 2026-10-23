import React, { useState } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, Radio } from 'lucide-react';

interface PasswordAuthModalProps {
  onUnlock: (password: string) => void;
  isLoading?: boolean;
  errorMsg?: string | null;
}

export const PasswordAuthModal: React.FC<PasswordAuthModalProps> = ({
  onUnlock,
  isLoading = false,
  errorMsg = null,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onUnlock(password.trim());
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 relative overflow-hidden my-auto">
        {/* Background Glows */}
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Badge & Header */}
        <div className="text-center space-y-3 mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mb-1 shadow-lg shadow-amber-500/10">
            <Lock className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">CookieRTMPS</h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Control Center Protected. Please enter your <strong className="text-amber-400">Stream Key</strong> or <strong className="text-amber-400">Security Password</strong> to access the dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Stream Key / Password</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">OBS_KEY</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter stream key or password..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition pr-10 shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition p-1"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>Verifying Stream Key...</span>
            ) : (
              <>
                <span>Access Control Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2 relative z-10">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            <strong className="text-slate-300">Security Note:</strong> Passwords match the <strong className="text-amber-400">Stream Key</strong> or <strong className="text-amber-400">OBS Security Password</strong> set in Option 4 of install.sh.
          </p>
        </div>
      </div>
    </div>
  );
};
