import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  BatteryCharging,
  RefreshCw,
  QrCode,
  Printer,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { PlatformType, User as UserType } from "../../types/hms";
import { getOfflineQueue, clearOfflineQueue } from "../../lib/storage";

interface MobileFrameProps {
  children: React.ReactNode;
  activeUser: UserType;
  onSelectUser: (user: UserType) => void;
  usersList: UserType[];
  onOpenScanner: () => void;
  onOpenPrint: () => void;
  onOpenAiAssistant: () => void;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  activeUser,
  onSelectUser,
  usersList,
  onOpenScanner,
  onOpenPrint,
  onOpenAiAssistant,
}) => {
  const [platform, setPlatform] = useState<PlatformType>("responsive");
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const queue = getOfflineQueue();
    setOfflineCount(queue.length);
  }, [isOffline]);

  const handleSyncNow = () => {
    setIsSyncing(true);
    setTimeout(() => {
      clearOfflineQueue();
      setOfflineCount(0);
      setIsSyncing(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0c0d0f] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Universal Desktop Simulator Header (HIDDEN ON MOBILE SCREENS) */}
      <header className="hidden lg:flex bg-[#111215]/95 backdrop-blur-md border-b border-[#22242a] px-4 py-2 flex-wrap items-center justify-between gap-3 sticky top-0 z-50 text-xs">
        {/* App Title & Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black tracking-wider text-xs">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs tracking-tight text-white">
                Sudheer Hospital Portal
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v2.6 Cross-Platform
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Sudheer Hospital HMS • Desktop Simulator Mode
            </p>
          </div>
        </div>

        {/* Desktop View Switcher */}
        <div className="flex items-center bg-[#181a20] p-1 rounded-lg border border-[#272932]">
          <button
            onClick={() => setPlatform("responsive")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
              platform === "responsive"
                ? "bg-slate-700 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Full Responsive</span>
          </button>
          <button
            onClick={() => setPlatform("ios")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
              platform === "ios"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS Frame</span>
          </button>
          <button
            onClick={() => setPlatform("android")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium ${
              platform === "android"
                ? "bg-teal-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android Frame</span>
          </button>
        </div>

        {/* Quick Utility Tools: AI, Scanner, Print */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-xs"
            title="Gemini AI Support"
          >
            <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
            <span>AI Support</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs"
          >
            <QrCode className="w-3 h-3 text-blue-400" />
            <span>Scanner</span>
          </button>

          <button
            onClick={onOpenPrint}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs"
          >
            <Printer className="w-3 h-3 text-emerald-400" />
            <span>Print</span>
          </button>

          {/* User Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs"
            >
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="font-bold text-white text-[11px]">
                {activeUser.name}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1 divide-y divide-slate-800">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400">
                  Switch Active Role
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {usersList.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-slate-800 ${
                        activeUser.id === u.id
                          ? "text-blue-400 font-semibold"
                          : "text-slate-300"
                      }`}
                    >
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span>{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Screen Container - 100% Full Width on Mobile Devices */}
      <main className="flex-1 flex items-center justify-center overflow-y-auto bg-[#0c0d0f] w-full">
        {platform === "responsive" ? (
          <div className="w-full h-full min-h-screen flex flex-col bg-[#0c0d0f]">
            {children}
          </div>
        ) : (
          <div className="hidden lg:flex items-center justify-center p-4 w-full h-full">
            <div
              className={`relative transition-all duration-300 ease-in-out my-auto ${
                platform === "ios"
                  ? "w-[390px] h-[830px] rounded-[52px] border-[12px] border-slate-800 ring-1 ring-slate-700/50 shadow-2xl bg-black flex flex-col overflow-hidden"
                  : "w-[412px] h-[840px] rounded-[40px] border-[10px] border-slate-800 ring-1 ring-slate-700/50 shadow-2xl bg-black flex flex-col overflow-hidden"
              }`}
            >
              {/* Desktop Simulator Status Bar */}
              <div className="pt-2 px-6 pb-1 bg-slate-950 text-white text-[11px] font-semibold flex items-center justify-between z-40 select-none border-b border-slate-900">
                <span>{currentTime || "09:41"}</span>
                <div className="flex items-center gap-2">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px]">5G</span>
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>

              {/* Application Inside Device Frame */}
              <div className="flex-1 overflow-y-auto bg-slate-950 flex flex-col relative">
                {children}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
