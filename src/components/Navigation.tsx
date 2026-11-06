import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Store,
  Receipt,
  Sparkles,
  Box
} from 'lucide-react';
import { NavigationDestination } from '../types';

interface NavigationProps {
  currentTab: NavigationDestination;
  onSelectTab: (tab: NavigationDestination) => void;
  lang: 'my' | 'en';
  badges: {
    messagesReviewCount: number;
    inventoryAlertCount: number;
    paymentsReviewCount: number;
  };
  userRole?: string;
  provider?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  lang,
  badges,
  userRole,
  provider
}) => {
  const allDestinations: Array<{
    id: NavigationDestination;
    labelMy: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'home',
      labelMy: 'ပင်မ',
      labelEn: 'Home',
      icon: LayoutDashboard
    },
    {
      id: 'messages',
      labelMy: 'မက်ဆေ့ခ်ျ',
      labelEn: 'Messages',
      icon: MessageSquare,
      badge: badges.messagesReviewCount > 0 ? badges.messagesReviewCount : undefined
    },
    {
      id: 'inventory',
      labelMy: 'စတော့',
      labelEn: 'Inventory',
      icon: Package,
      badge: badges.inventoryAlertCount > 0 ? badges.inventoryAlertCount : undefined
    },
    {
      id: 'accounting',
      labelMy: 'စာရင်းကိုင်',
      labelEn: 'Accounting',
      icon: Receipt
    },
    {
      id: 'aistudio',
      labelMy: 'AI Studio',
      labelEn: 'AI Studio',
      icon: Sparkles
    },
    {
      id: 'profile',
      labelMy: 'အကောင့် & AI',
      labelEn: 'Account & AI',
      icon: Store,
      badge: badges.paymentsReviewCount > 0 ? badges.paymentsReviewCount : undefined
    },
    {
      id: 'avatar_studio',
      labelMy: 'Avatar Studio',
      labelEn: 'Avatar Studio',
      icon: Box
    }
  ];

  const destinations = allDestinations.filter(d => {
    if (d.id === 'avatar_studio') return true;
    if (!userRole) return false; // Hide merchant tabs if unauthenticated
    
    // Merchant tabs require roles
    const isMerchantAdmin = userRole === 'merchant_admin' || userRole === 'admin' || provider === 'local';
    if (!isMerchantAdmin) {
      // If just a regular customer, they might only see profile and home? 
      // Existing App.tsx logic for desktop suggests they see everything except 'lab'.
      // But 'home', 'messages', etc. are merchant-centric.
      // However, I should follow the existing pattern in App.tsx line 898.
      return ['home', 'messages', 'inventory', 'accounting', 'aistudio', 'profile'].includes(d.id);
    }
    return true; // Merchant admin sees everything
  });

  return (
    <nav
      aria-label="Primary Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 shadow-[0_-10px_35px_rgba(0,0,0,0.8)] transition-all lg:hidden"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className={`grid items-center h-16 py-1 gap-1`} style={{ gridTemplateColumns: `repeat(${destinations.length}, minmax(0, 1fr))` }}>
          {destinations.map((item) => {
            const isActive = currentTab === item.id;
            const Icon = item.icon;
            const label = lang === 'my' ? item.labelMy : item.labelEn;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative min-h-[48px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-200 select-none focus:outline-none ${
                  isActive
                    ? 'bg-white/[0.08] text-purple-300 border border-white/10 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-purple-300 stroke-[2.2]' : 'text-slate-400'
                    }`}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-label={`${item.badge} notifications`}
                      className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center font-mono tabular-nums leading-none shadow-md shadow-purple-600/40"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] tracking-tight mt-1 truncate max-w-full leading-tight ${
                    isActive ? 'font-bold text-purple-300' : 'font-medium text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
