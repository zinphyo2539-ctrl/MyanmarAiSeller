import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  Bot,
  Store
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
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  lang,
  badges
}) => {
  const destinations: Array<{
    id: NavigationDestination;
    labelMy: string;
    labelEn: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'home',
      labelMy: 'ပင်မစာမျက်နှာ',
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
      labelMy: 'ကုန်ပစ္စည်း',
      labelEn: 'Inventory',
      icon: Package,
      badge: badges.inventoryAlertCount > 0 ? badges.inventoryAlertCount : undefined
    },
    {
      id: 'ai',
      labelMy: 'AI အရောင်းအကူ',
      labelEn: 'AI Seller',
      icon: Bot
    },
    {
      id: 'profile',
      labelMy: 'စတိုးနှင့်အကောင့်',
      labelEn: 'Profile',
      icon: Store,
      badge: badges.paymentsReviewCount > 0 ? badges.paymentsReviewCount : undefined
    }
  ];

  return (
    <nav
      aria-label="Primary Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#CBD5E1] transition-all"
    >
      <div className="max-w-6xl mx-auto px-2">
        <div className="grid grid-cols-5 items-center h-16">
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
                className={`relative min-h-[48px] flex flex-col items-center justify-center py-1 px-1 transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg ${
                  isActive
                    ? 'text-[#1D4ED8]'
                    : 'text-[#64748B] hover:text-[#475569]'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 text-[#2563EB]' : ''
                    }`}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-label={`${item.badge} notifications`}
                      className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center font-mono tabular-nums leading-none shadow"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-tight mt-1 truncate max-w-full ${
                    isActive ? 'font-semibold text-[#1D4ED8]' : 'text-[#64748B]'
                  }`}
                >
                  {label}
                </span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 w-6 h-0.5 rounded-full bg-[#2563EB]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
