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
  RefreshCw
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
    <>
      <div className="space-y-4">
        {/* Top Controls: Channel Tabs and Human Review Queue */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FFFFFF] border border-[#CBD5E1] p-3 rounded-2xl">
          {/* Channel Segmented Control */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] p-1 rounded-xl border border-[#CBD5E1]">
            <button
              type="button"
              onClick={() => setSelectedChannel('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedChannel === 'all'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              {lang === 'my' ? 'အားလုံး' : 'All Channels'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('messenger')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedChannel === 'messenger'
                  ? 'bg-[#C9A227] text-[#0B0B09] shadow-sm'
                  : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
              }`}
            >
              Messenger
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('tiktok')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedChannel === 'tiktok'
                  ? 'bg-[#C9A227] text-[#0B0B09] shadow-sm'
                  : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
              }`}
            >
              TikTok
            </button>
            <button
              type="button"
              onClick={() => setSelectedChannel('support')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedChannel === 'support'
                  ? 'bg-[#65B985] text-white shadow-sm'
                  : 'text-[#B9B5A7] hover:text-[#F5F2E8]'
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
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                showHumanReviewOnly
                  ? 'bg-[#E0BD55]/15 border-[#E0BD55] text-[#E0BD55]'
                  : 'bg-[#1E1D14] border-[#393426] text-[#B9B5A7] hover:text-[#F5F2E8]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>
                {lang === 'my' ? 'လူဖြေကြားရန် လိုအပ်မှု သီးသန့်' : 'Human Review Only'}
              </span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="p-2 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#C9A227] rounded-xl transition-colors cursor-pointer"
              title={lang === 'my' ? 'ပြန်လည်ရယူရန်' : 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[500px]">
        {/* Left Column: Conversation List (or full view on mobile when none selected) */}
        <div
          className={`${
            activeConversationId ? 'hidden lg:block lg:col-span-5' : 'col-span-12 lg:col-span-5'
          } bg-[#181810] border border-[#393426] rounded-2xl flex flex-col overflow-hidden`}
        >
          <div className="p-3.5 border-b border-[#393426] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B9B5A7]">
              {lang === 'my' ? 'မက်ဆေ့ခ်ျများ' : 'Conversations'} ({filteredConversations.length})
            </span>
            <span className="text-[11px] text-[#817D70]">
              {selectedChannel.toUpperCase()}
            </span>
          </div>

          {filteredConversations.length === 0 ? (
            /* Honest Empty State for Inbox */
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center space-y-4">
              <MessageSquare className="w-12 h-12 text-[#776324]" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-[#F5F2E8]">
                  {showHumanReviewOnly
                    ? (lang === 'my' ? 'လူဖြေကြားရန် မရှိသေးပါ' : 'No conversations awaiting human review')
                    : (lang === 'my' ? 'ဖောက်သည် စာတိုများ မရှိသေးပါ' : 'No customer messages yet')}
                </h3>
                <p className="text-xs text-[#817D70] max-w-xs">
                  {lang === 'my'
                    ? 'ချိတ်ဆက်ထားသော Social Media များမှ ဝင်ရောက်လာသော မေးခွန်းများကို ဤနေရာတွင် စစ်မှန်စွာ ပြသပါမည်။'
                    : 'Customer messages received from connected platforms will appear here in real time.'}
                </p>
              </div>

              {/* Truthful Connection Status Cards */}
              <div className="w-full max-w-xs bg-[#11110D] border border-[#393426] rounded-xl p-3 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#B9B5A7]">Facebook Messenger:</span>
                  <span className={`font-semibold ${providerStatus?.facebook ? 'text-[#65B985]' : 'text-[#A88419]'}`}>
                    {providerStatus?.facebook ? (lang === 'my' ? 'ချိတ်ဆက်ထားသည်' : 'Connected') : (lang === 'my' ? 'မချိတ်ဆက်ရသေးပါ' : 'Not Configured')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#B9B5A7]">TikTok Direct Message:</span>
                  <span className={`font-semibold ${providerStatus?.tiktok ? 'text-[#65B985]' : 'text-[#A88419]'}`}>
                    {providerStatus?.tiktok ? (lang === 'my' ? 'ချိတ်ဆက်ထားသည်' : 'Connected') : (lang === 'my' ? 'မချိတ်ဆက်ရသေးပါ' : 'Not Configured')}
                  </span>
                </div>

                {(!providerStatus?.facebook || !providerStatus?.tiktok) && (
                  <button
                    type="button"
                    onClick={() => onOpenConfig(!providerStatus?.facebook ? 'facebook' : 'tiktok')}
                    className="w-full mt-2 py-1.5 px-3 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-xs font-semibold text-[#C9A227] rounded-lg transition-colors cursor-pointer text-center"
                  >
                    {lang === 'my' ? 'Channel ချိတ်ဆက်ရန်' : 'Configure Integration'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#393426] overflow-y-auto max-h-[600px]">
              {filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConversationId;
                const statusColor =
                  conv.status === 'needs_human_review'
                    ? 'text-[#E0BD55]'
                    : conv.status === 'human_handling'
                    ? 'text-[#83A9D6]'
                    : conv.status === 'resolved'
                    ? 'text-[#65B985]'
                    : 'text-[#C9A227]';

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full p-3.5 text-left transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? 'bg-[#1E1D14] border-l-2 border-l-[#C9A227]' : 'hover:bg-[#15150E]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-[#F5F2E8] truncate">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-[#817D70] uppercase font-mono">
                          · {conv.platform}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#817D70] font-mono shrink-0">
                        {new Date(conv.lastActivityAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#B9B5A7] line-clamp-2">
                      {conv.lastMessagePreview || (lang === 'my' ? 'မက်ဆေ့ခ်ျမရှိသေးပါ' : 'No messages')}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className={`font-medium ${statusColor}`}>
                        {conv.status === 'needs_human_review' ? '⚠️ Human Review' : conv.status}
                      </span>
                      {conv.aiPaused && (
                        <span className="text-[10px] text-[#E0BD55] font-mono">
                          [AI Paused]
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Conversation Detail & Real AI Controls */}
        <div
          className={`${
            activeConversationId ? 'col-span-12 lg:col-span-7' : 'hidden lg:flex lg:col-span-7'
          } bg-[#181810] border border-[#393426] rounded-2xl flex flex-col justify-between overflow-hidden`}
        >
          {activeConversation ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="p-3.5 border-b border-[#393426] flex items-center justify-between gap-3 bg-[#1E1D14]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveConversationId(null)}
                    className="lg:hidden p-1.5 hover:bg-[#252419] rounded-lg text-[#B9B5A7]"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-[#F5F2E8]">
                      {activeConversation.customerName}
                    </h3>
                    <span className="text-[11px] text-[#817D70] font-mono">
                      Platform: {activeConversation.platform} · Status: {activeConversation.status}
                    </span>
                  </div>
                </div>

                {/* AI Control Buttons (Server-Authoritative) */}
                <div className="flex items-center gap-1.5">
                  {activeConversation.aiPaused ? (
                    <button
                      type="button"
                      disabled={Boolean(actionInProgress)}
                      onClick={() => handleAction('resume_ai')}
                      className="px-2.5 py-1.5 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>{lang === 'my' ? 'AI ဖွင့်မည်' : 'Resume AI'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(actionInProgress)}
                      onClick={() => handleAction('pause_ai')}
                      className="px-2.5 py-1.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#E0BD55] font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Pause className="w-3 h-3" />
                      <span>{lang === 'my' ? 'AI ရပ်မည်' : 'Pause AI'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={Boolean(actionInProgress)}
                    onClick={() => handleAction('resolve')}
                    className="px-2.5 py-1.5 bg-[#1E1D14] hover:bg-[#252419] border border-[#393426] text-[#65B985] font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{lang === 'my' ? 'ပြီးဆုံး' : 'Resolve'}</span>
                  </button>
                </div>
              </div>

              {/* Human Review Banner if Flagged */}
              {activeConversation.humanReviewReason && (
                <div className="bg-[#E0BD55]/10 border-b border-[#E0BD55]/30 p-2.5 px-4 text-xs text-[#E0BD55] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{lang === 'my' ? 'လွှဲပြောင်းရသည့် အကြောင်းရင်း' : 'Human Review Trigger'}:</strong>{' '}
                    {activeConversation.humanReviewReason}
                  </span>
                </div>
              )}

              {/* Message Thread (Authoritative Real Message History) */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px] max-h-[450px]">
                {(!activeConversation.messages || activeConversation.messages.length === 0) ? (
                  <p className="text-center text-xs text-[#817D70] py-8">
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
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                            isCustomer
                              ? 'bg-[#1E1D14] text-[#F5F2E8] border border-[#393426]'
                              : isAi
                              ? 'bg-[#181810] text-[#E0BD55] border border-[#C9A227]/40'
                              : 'bg-[#C9A227] text-[#0B0B09] font-medium'
                          }`}
                        >
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                            {isCustomer ? activeConversation.customerName : isAi ? 'Groq AI Assistant' : (msg.senderName || 'Staff')}
                          </div>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                        <span className="text-[10px] text-[#817D70] mt-1 font-mono px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Human Staff Reply Form */}
              <form onSubmit={handleReplySubmit} className="p-3 border-t border-[#393426] bg-[#1E1D14] flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={lang === 'my' ? 'ဖောက်သည်ထံ လူကိုယ်တိုင် စာပြန်ရန်...' : 'Type human reply to customer...'}
                  className="flex-1 bg-[#11110D] border border-[#393426] rounded-xl px-3.5 py-2 text-xs text-[#F5F2E8] placeholder-[#817D70] focus:outline-none focus:border-[#C9A227]"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2 bg-[#C9A227] hover:bg-[#A88419] disabled:opacity-50 text-[#0B0B09] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'ပို့မည်' : 'Send'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-[#817D70] space-y-2">
              <MessageSquare className="w-10 h-10 text-[#393426]" />
              <p>{lang === 'my' ? 'အသေးစိတ်ကြည့်ရှုရန် မက်ဆေ့ခ်ျတစ်ခု ရွေးချယ်ပါ' : 'Select a conversation to view message history and AI controls'}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
