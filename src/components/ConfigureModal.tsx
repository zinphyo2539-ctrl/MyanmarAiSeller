import React, { useState } from 'react';
import { X, Check, Save, Copy } from 'lucide-react';
import { ProviderStatus } from '../types';

interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  configProvider: 'google' | 'facebook' | 'tiktok';
  providerStatus: ProviderStatus | null;
  lang: 'my' | 'en';
  onSaveProvider: (
    provider: string,
    clientId: string,
    clientSecret: string,
    callbackUrl?: string
  ) => Promise<void>;
}

export const ConfigureModal: React.FC<ConfigureModalProps> = ({
  isOpen,
  onClose,
  configProvider,
  providerStatus,
  lang,
  onSaveProvider,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const callbackUrl =
    configProvider === 'google'
      ? providerStatus?.googleCallbackUrl || `${window.location.origin}/api/auth/google/callback`
      : configProvider === 'facebook'
      ? providerStatus?.facebookRedirectUri || `${window.location.origin}/api/auth/facebook/callback`
      : providerStatus?.tiktokRedirectUri || `${window.location.origin}/api/auth/tiktok/callback`;

  const handleCopy = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSaveProvider(configProvider, clientId.trim(), clientSecret.trim(), callbackUrl);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-base font-bold text-white tracking-tight">
            {configProvider === 'google'
              ? 'Google OAuth Configuration'
              : configProvider === 'facebook'
              ? 'Facebook Messenger App Configuration'
              : 'TikTok App Configuration'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <div className="bg-white/[0.04] p-3.5 rounded-2xl border border-white/10 space-y-1.5 text-xs">
          <span className="text-slate-400 block font-semibold text-[11px] uppercase tracking-wider font-mono">
            {lang === 'my' ? 'Redirect / Callback URI:' : 'Redirect / Callback URI:'}
          </span>
          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-purple-300 bg-white/[0.04] p-2.5 rounded-xl border border-white/10 break-all shadow-xs">
            <span>{callbackUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white shrink-0 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {configProvider === 'google'
                ? 'Google Client ID'
                : configProvider === 'facebook'
                ? 'Facebook App ID'
                : 'TikTok Client Key'}{' '}
              *
            </label>
            <input
              type="text"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Paste Client ID / App ID"
              className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs transition-all outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {configProvider === 'google'
                ? 'Google Client Secret'
                : configProvider === 'facebook'
                ? 'Facebook App Secret'
                : 'TikTok Client Secret'}{' '}
              *
            </label>
            <input
              type="password"
              required
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Paste Client Secret / App Secret"
              className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs transition-all outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
