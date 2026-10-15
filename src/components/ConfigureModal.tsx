import React, { useState } from 'react';
import { X, Check, Save, AlertCircle, Copy } from 'lucide-react';
import { ProviderStatus } from '../types';

interface ConfigureModalProps {
  isOpen: boolean;
  onClose: () => void;
  configProvider: 'google' | 'facebook' | 'tiktok';
  providerStatus: ProviderStatus | null;
  lang: 'my' | 'en';
  onSaveProvider: (provider: string, clientId: string, clientSecret: string, callbackUrl?: string) => Promise<void>;
}

export const ConfigureModal: React.FC<ConfigureModalProps> = ({
  isOpen,
  onClose,
  configProvider,
  providerStatus,
  lang,
  onSaveProvider
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const callbackUrl =
    configProvider === 'google'
      ? (providerStatus?.googleCallbackUrl || `${window.location.origin}/api/auth/google/callback`)
      : configProvider === 'facebook'
      ? (providerStatus?.facebookRedirectUri || `${window.location.origin}/api/auth/facebook/callback`)
      : (providerStatus?.tiktokRedirectUri || `${window.location.origin}/api/auth/tiktok/callback`);

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#181810] border border-[#393426] rounded-2xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#393426] pb-3">
          <h3 className="text-base font-bold text-[#F5F2E8]">
            {configProvider === 'google'
              ? 'Google OAuth Configuration'
              : configProvider === 'facebook'
              ? 'Facebook Messenger App Configuration'
              : 'TikTok App Configuration'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#252419] rounded-lg text-[#817D70] hover:text-[#F5F2E8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-[#E06B61]/10 border border-[#E06B61]/40 rounded-xl text-xs text-[#E06B61]">
            {error}
          </div>
        )}

        <div className="bg-[#11110D] p-3 rounded-xl border border-[#393426] space-y-1.5 text-xs">
          <span className="text-[#817D70] block font-semibold">
            {lang === 'my' ? 'Redirect / Callback URI:' : 'Redirect / Callback URI:'}
          </span>
          <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[#C9A227] bg-[#181810] p-2 rounded-lg border border-[#393426]/60 break-all">
            <span>{callbackUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 hover:bg-[#252419] rounded text-[#817D70] hover:text-[#F5F2E8] shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#65B985]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-[#B9B5A7] font-semibold mb-1">
              {configProvider === 'google' ? 'Google Client ID' : configProvider === 'facebook' ? 'Facebook App ID' : 'TikTok Client Key'} *
            </label>
            <input
              type="text"
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Paste Client ID / App ID"
              className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] font-mono focus:border-[#C9A227] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[#B9B5A7] font-semibold mb-1">
              {configProvider === 'google' ? 'Google Client Secret' : configProvider === 'facebook' ? 'Facebook App Secret' : 'TikTok Client Secret'} *
            </label>
            <input
              type="password"
              required
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Paste Client Secret / App Secret"
              className="w-full bg-[#11110D] border border-[#393426] rounded-xl px-3 py-2 text-[#F5F2E8] font-mono focus:border-[#C9A227] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#393426]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] font-semibold rounded-xl"
            >
              {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : (lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
