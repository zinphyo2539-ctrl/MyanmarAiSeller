import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Wifi, 
  Battery, 
  ExternalLink, 
  Search, 
  RotateCcw,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface DevicePreviewFrameProps {
  device: 'mobile' | 'tablet' | 'desktop';
  setDevice?: (device: 'mobile' | 'tablet' | 'desktop') => void;
  children: React.ReactNode;
  url?: string;
  onOpenExternal?: () => void;
  lang?: 'my' | 'en';
}

const DEVICE_SPECS = {
  mobile: {
    width: 390,
    height: 844,
    ratio: 390 / 844,
    labelMy: 'ဖုန်း',
    labelEn: 'Phone'
  },
  tablet: {
    width: 820,
    height: 1093,
    ratio: 820 / 1093,
    labelMy: 'တက်ဘလက်',
    labelEn: 'Tablet'
  },
  desktop: {
    width: 1280,
    height: 800,
    ratio: 1280 / 800,
    labelMy: 'လက်တော့ပ်',
    labelEn: 'Laptop'
  }
};

export const DevicePreviewFrame: React.FC<DevicePreviewFrameProps> = ({
  device,
  setDevice,
  children,
  url = 'https://shopsone.com/store/your-shop',
  onOpenExternal,
  lang = 'my'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isFitToScreen, setIsFitToScreen] = useState(true);

  const targetSpecs = DEVICE_SPECS[device];

  useEffect(() => {
    if (!containerRef.current) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      // Horizontal and vertical padding for the frame
      const hPadding = 80;
      const vPadding = 100;

      const availableWidth = clientWidth - hPadding;
      const availableHeight = clientHeight - vPadding;

      const scaleX = availableWidth / targetSpecs.width;
      const scaleY = availableHeight / targetSpecs.height;

      const newScale = Math.min(1, scaleX, scaleY);
      setScale(newScale);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    updateScale();

    return () => observer.disconnect();
  }, [device, targetSpecs, isFitToScreen]);

  const activeScale = isFitToScreen ? scale : 1;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Studio Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#13121D] border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          {/* Device Switcher Segmented Control */}
          <div className="flex bg-[#1A1829] p-1 rounded-xl border border-white/5">
            {[
              { id: 'mobile', icon: Smartphone, labelMy: 'ဖုန်း', labelEn: 'Phone' },
              { id: 'tablet', icon: Tablet, labelMy: 'တက်ဘလက်', labelEn: 'Tablet' },
              { id: 'desktop', icon: Monitor, labelMy: 'လက်တော့ပ်', labelEn: 'Laptop' }
            ].map(dev => (
              <button
                key={dev.id}
                onClick={() => setDevice?.(dev.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  device === dev.id ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'text-slate-500 hover:text-white border border-transparent'
                }`}
              >
                <dev.icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{lang === 'my' ? dev.labelMy : dev.labelEn}</span>
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-white/10 mx-2" />

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1829] rounded-xl border border-white/5 text-[11px] font-bold text-slate-300">
            <span className="opacity-40">Zoom:</span>
            <span>{Math.round(activeScale * 100)}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFitToScreen(!isFitToScreen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isFitToScreen ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' : 'bg-white/5 text-slate-400 border border-white/5 hover:text-white'
            }`}
          >
            {isFitToScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{lang === 'my' ? (isFitToScreen ? 'ဆိုဒ်အပြည့်' : 'မူရင်းဆိုဒ်') : (isFitToScreen ? 'Fit to Screen' : 'Actual Size')}</span>
          </button>
        </div>
      </div>

      {/* Preview Stage */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#0A090F] flex items-center justify-center p-8 relative no-scrollbar"
      >
        {/* Studio Ambient Background Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/5 blur-[120px] pointer-events-none" />

        <div 
          style={{ 
            width: targetSpecs.width * activeScale, 
            height: targetSpecs.height * activeScale,
            transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="relative shrink-0"
        >
          <div 
            style={{ 
              width: targetSpecs.width, 
              height: targetSpecs.height,
              transform: `scale(${activeScale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="relative"
          >
            {/* 1. MOBILE PHONE FRAME */}
            {device === 'mobile' && (
              <div className="absolute inset-0 bg-[#1E1E28] rounded-[48px] p-[10px] ring-1 ring-white/15 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
                {/* Hardware Bezel Highlight */}
                <div className="absolute inset-0 rounded-[48px] border border-white/10 pointer-events-none" />
                
                {/* Top Status Bar */}
                <div className="h-[44px] shrink-0 flex items-center justify-between px-8 text-white z-20">
                  <span className="text-[14px] font-semibold">09:41</span>
                  <div className="absolute left-1/2 -translate-x-1/2 top-3 w-[96px] h-[24px] bg-black rounded-full z-30 flex items-center justify-center">
                     {/* Dynamic Island Sub-pixel Detail */}
                     <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] ml-auto mr-3 shadow-inner" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-4 h-4" />
                    <Battery className="w-5 h-5 rotate-180" />
                  </div>
                </div>

                {/* Main Content Viewport */}
                <div className="flex-1 bg-white rounded-[32px] overflow-hidden relative shadow-inner">
                  <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
                    {children}
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="h-6 flex items-center justify-center shrink-0">
                  <div className="w-[134px] h-[5px] bg-white/20 rounded-full" />
                </div>
              </div>
            )}

            {/* 2. TABLET FRAME */}
            {device === 'tablet' && (
              <div className="absolute inset-0 bg-[#1E1E28] rounded-[32px] p-[12px] ring-1 ring-white/15 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
                <div className="flex-1 bg-white rounded-[22px] overflow-hidden relative shadow-inner">
                  <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
                    {children}
                  </div>
                </div>
              </div>
            )}

            {/* 3. DESKTOP / LAPTOP FRAME */}
            {device === 'desktop' && (
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-[#161622] rounded-xl overflow-hidden ring-1 ring-white/15 shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col">
                  {/* macOS / Browser Header */}
                  <div className="h-[40px] shrink-0 bg-[#1A1A28] border-b border-white/5 flex items-center px-4 gap-4">
                    <div className="flex gap-2 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                      <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="max-w-[400px] w-full h-[24px] bg-black/30 rounded-md border border-white/5 flex items-center px-3 gap-2">
                        <Search className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-400 font-mono truncate">{url}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button 
                        onClick={onOpenExternal}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{lang === 'my' ? 'ပြင်ပတွင်ဖွင့်မည်' : 'Open'}</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Browser Body */}
                  <div className="flex-1 bg-white relative">
                    <div className="absolute inset-0 overflow-y-auto no-scrollbar scroll-smooth">
                      {children}
                    </div>
                  </div>
                </div>
                
                {/* Laptop Base Lip */}
                <div className="h-[12px] bg-gradient-to-b from-[#252532] to-[#13131D] mx-auto w-[98%] rounded-b-xl border-x border-b border-white/5 shadow-2xl relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-white/5 rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
