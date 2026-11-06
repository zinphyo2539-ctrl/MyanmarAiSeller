import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Pause,
  Play,
  UserCheck,
  Bot,
  AlertCircle,
  Clock,
  ShieldAlert,
  Sliders,
  ChevronLeft,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { Conversation, ProviderStatus } from '../types';

interface MessagesViewProps {
  conversations: Conversation[];
  loading: boolean;
  providerStatus: ProviderStatus | null;
  lang: 'my' | 'en';
  onSendReply: (conversationId: string, text: string) => Promise<void>;
  onControlAi: (conversationId: string, action: 'pause_ai' | 'resume_ai' | 'takeover' | 'return_to_ai' | 'resolve' | 'flag_human_review') => Promise<void>;
  onOpenConfig: (provider: 'facebook' | 'tiktok') => void;
  onRefresh: () => void;
  initialFilter?: string;
}

const avatarGradients = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-blue-500 to-cyan-600',
];

const getInitials = (name: string) =>
  name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'C'
    : 'C';

export const MessagesView: React.FC<MessagesViewProps> = ({
  conversations,
  loading,
  providerStatus,
  lang,
  onSendReply,
  onControlAi,
  onOpenConfig,
  onRefresh,
  initialFilter
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'messenger' | 'tiktok' | 'support'>('all');
  const [showHumanReviewOnly, setShowHumanReviewOnly] = useState<boolean>(initialFilter === 'human_review');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Filter conversations strictly from real data
  const filteredConversations = conversations.filter((c) => {
    if (selectedChannel === 'messenger' && c.platform !== 'messenger') return false;
    if (selectedChannel === 'tiktok' && c.platform !== 'tiktok') return false;
    if (selectedChannel === 'support' && c.platform !== 'support') return false;
    if (showHumanReviewOnly && c.status !== 'needs_human_review' && !c.humanReviewReason) return false;
    return true;
  });

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      await onSendReply(activeConversation.id, replyText);
      setReplyText('');
    } finally {
      setSendingReply(false);
    }
  };

  const handleAction = async (action: 'pause_ai' | 'resume_ai' | 'takeover' | 'return_to_ai' | 'resolve' | 'flag_human_review') => {
    if (!activeConversation || actionInProgress) return;
    setActionInProgress(action);
    try {
      await onControlAi(activeConversation.id, action);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Top Filter Bar */}
      <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-3 border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Channel Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setSelectedChannel('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedChannel === 'all'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'my' ? 'အားလုံး' : 'All Channels'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedChannel('messenger')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedChannel === 'messenger'
                ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Messenger
          </button>
          <button
            type="button"
            onClick={() => setSelectedChannel('tiktok')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedChannel === 'tiktok'
                ? 'bg-rose-600/30 text-rose-200 border border-rose-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TikTok
          </button>
          <button
            type="button"
            onClick={() => setSelectedChannel('support')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedChannel === 'support'
                ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'my' ? 'အော်ဒါအကူအညီ' : 'Order Support'}
          </button>
        </div>

        {/* Human Review Filter & Refresh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHumanReviewOnly(!showHumanReviewOnly)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              showHumanReviewOnly
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 shadow-xs'
                : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {lang === 'my' ? 'လူဖြေကြားရန် လိုအပ်မှု သီးသန့်' : 'Human Review Only'}
            </span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="p-2 bg-slate-900/80 hover:bg-purple-600/20 text-slate-300 hover:text-purple-300 border border-white/10 rounded-xl transition-colors cursor-pointer"
            title={lang === 'my' ? 'ပြန်လည်ရယူရန်' : 'Refresh'}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
        {/* Left Column: Clean SaaS Conversation List */}
        <div
          className={`${
            activeConversationId ? 'hidden lg:block lg:col-span-5' : 'col-span-12 lg:col-span-5'
          } bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg flex flex-col overflow-hidden`}
        >
          <div className="px-5 py-3.5 bg-slate-900/60 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm text-slate-100">
                {lang === 'my' ? 'မက်ဆေ့ချ်များ' : 'Conversations'} ({filteredConversations.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-purple-300 bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
              {selectedChannel.toUpperCase()}
            </span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100">
                  {showHumanReviewOnly
                    ? (lang === 'my' ? 'လူဖြေကြားရန် မရှိသေးပါ' : 'No conversations awaiting human review')
                    : (lang === 'my' ? 'ဖောက်သည် စာတိုများ မရှိသေးပါ' : 'No customer messages yet')}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  {lang === 'my'
                    ? 'ချိတ်ဆက်ထားသော Social Media များမှ ဝင်ရောက်လာသော မေးခွန်းများကို ဤနေရာတွင် စစ်မှန်စွာ ပြသပါမည်။'
                    : 'Customer messages received from connected platforms will appear here in real time.'}
                </p>
              </div>

              {/* Status Breakdown */}
              <div className="w-full max-w-xs bg-slate-950/60 border border-white/10 rounded-xl p-3.5 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Facebook Messenger:</span>
                  <span className={`font-semibold ${providerStatus?.facebook ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {providerStatus?.facebook ? (lang === 'my' ? 'ချိတ်ဆက်ထားသည်' : 'Connected') : (lang === 'my' ? 'မချိတ်ဆက်ရသေးပါ' : 'Not Configured')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">TikTok Direct Message:</span>
                  <span className={`font-semibold ${providerStatus?.tiktok ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {providerStatus?.tiktok ? (lang === 'my' ? 'ချိတ်ဆက်ထားသည်' : 'Connected') : (lang === 'my' ? 'မချိတ်ဆက်ရသေးပါ' : 'Not Configured')}
                  </span>
                </div>

                {(!providerStatus?.facebook || !providerStatus?.tiktok) && (
                  <button
                    type="button"
                    onClick={() => onOpenConfig(!providerStatus?.facebook ? 'facebook' : 'tiktok')}
                    className="w-full mt-2 py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-purple-500/30 text-xs font-semibold text-purple-300 rounded-lg transition-colors cursor-pointer text-center shadow-xs"
                  >
                    {lang === 'my' ? 'Channel ချိတ်ဆက်ရန်' : 'Configure Integration'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5 overflow-y-auto max-h-[600px]">
              {filteredConversations.map((conv, idx) => {
                const isSelected = conv.id === activeConversationId;
                const channelBadgeColor =
                  conv.platform === 'messenger'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : conv.platform === 'tiktok'
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`px-5 py-4 transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                      isSelected
                        ? 'bg-purple-600/20 border-l-4 border-l-purple-500'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Gradient Avatar */}
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${
                          avatarGradients[idx % avatarGradients.length]
                        } text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
                      >
                        {getInitials(conv.customerName)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm truncate group-hover:text-purple-300 transition-colors">
                            {conv.customerName}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${channelBadgeColor}`}>
                            {conv.platform}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate leading-relaxed">
                          {conv.lastMessagePreview || (lang === 'my' ? 'မက်ဆေ့ခ်ျမရှိသေးပါ' : 'No messages')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                        {new Date(conv.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        conv.status === 'needs_human_review'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : conv.status === 'resolved'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          conv.status === 'needs_human_review' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                        }`} />
                        {conv.status === 'needs_human_review' ? 'Review' : conv.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Clean Dark Conversation Detail & AI Controls */}
        <div
          className={`${
            activeConversationId ? 'col-span-12 lg:col-span-7' : 'hidden lg:flex lg:col-span-7'
          } bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between overflow-hidden`}
        >
          {activeConversation ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(null)}
                    className="lg:hidden p-1.5 hover:bg-white/10 rounded-xl text-slate-300 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 leading-snug">
                      {activeConversation.customerName}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Platform: {activeConversation.platform} · Status: {activeConversation.status}
                    </span>
                  </div>
                </div>

                {/* AI Control Buttons */}
                <div className="flex items-center gap-2">
                  {activeConversation.aiPaused ? (
                    <button
                      type="button"
                      disabled={Boolean(actionInProgress)}
                      onClick={() => handleAction('resume_ai')}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{lang === 'my' ? 'AI ဖွင့်မည်' : 'Resume AI'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(actionInProgress)}
                      onClick={() => handleAction('pause_ai')}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>{lang === 'my' ? 'AI ရပ်မည်' : 'Pause AI'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={Boolean(actionInProgress)}
                    onClick={() => handleAction('resolve')}
                    className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'my' ? 'ပြီးဆုံး' : 'Resolve'}</span>
                  </button>
                </div>
              </div>

              {/* Human Review Banner if Flagged */}
              {activeConversation.humanReviewReason && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 p-3 px-4 text-xs text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>{lang === 'my' ? 'လွှဲပြောင်းရသည့် အကြောင်းရင်း' : 'Human Review Trigger'}:</strong>{' '}
                    {activeConversation.humanReviewReason}
                  </span>
                </div>
              )}

              {/* Message Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5 min-h-[320px] max-h-[460px] bg-slate-950/40">
                {(!activeConversation.messages || activeConversation.messages.length === 0) ? (
                  <p className="text-center text-xs text-slate-500 py-10">
                    {lang === 'my' ? 'စာတိုမှတ်တမ်း မရှိသေးပါ' : 'No message history'}
                  </p>
                ) : (
                  activeConversation.messages.map((msg) => {
                    const isStaff = msg.sender === 'human_staff';
                    const isAi = msg.sender === 'ai';
                    const isCustomer = msg.sender === 'customer';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                            isCustomer
                              ? 'bg-slate-900 text-slate-100 border border-white/10'
                              : isAi
                              ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-purple-600/20'
                          }`}
                        >
                          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                            isStaff ? 'text-purple-200' : 'text-slate-400'
                          }`}>
                            {isCustomer ? activeConversation.customerName : isAi ? 'Groq AI Assistant' : (msg.senderName || 'Merchant Staff')}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 font-mono px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Human Staff Reply Form */}
              <form onSubmit={handleReplySubmit} className="p-3 border-t border-white/10 bg-slate-900/80 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={lang === 'my' ? 'ဖောက်သည်ထံ လူကိုယ်တိုင် စာပြန်ရန်...' : 'Type human reply to customer...'}
                  className="flex-1 bg-slate-950/60 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-600/25"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ပို့မည်' : 'Send'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500 mb-1">
                <MessageSquare className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="font-semibold text-slate-300">
                {lang === 'my' ? 'အသေးစိတ်ကြည့်ရှုရန် မက်ဆေ့ချ်တစ်ခု ရွေးချယ်ပါ' : 'Select a conversation to view message history and AI controls'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
