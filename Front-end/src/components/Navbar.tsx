import React, { useState } from "react";
import {
  Menu,
  Building2,
  Sparkles,
  QrCode,
  Printer,
  ChevronDown,
  User,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Package,
  LogOut,
  Bell,
  Globe,
  CreditCard,
  AlertCircle,
  X,
} from "lucide-react";
import { User as UserType } from "../types/hms";
import { LanguageCode, TRANSLATIONS } from "../lib/i18n";

interface NavbarProps {
  activeUser: UserType;
  onOpenAiAssistant: () => void;
  onOpenScanner: () => void;
  onOpenPrint: () => void;
  onOpenNotifications?: () => void;
  onOpenPayment?: () => void;
  unreadCount?: number;
  currentLang?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onLogout?: () => void;
  orgLogo?: string | null;
  orgName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeUser,
  onOpenAiAssistant,
  onOpenScanner,
  onOpenPrint,
  onOpenNotifications,
  onOpenPayment,
  unreadCount = 0,
  currentLang = "en",
  onLanguageChange,
  onToggleSidebar,
  isSidebarOpen,
  onLogout,
  orgLogo,
  orgName = "Sudheer Hospital",
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showLangMenu, setShowLangMenu] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <div className="bg-[#111215] border-b border-[#22242a] px-3 pt-9 pb-2.5 sm:pt-3 flex items-center justify-between text-xs z-30 relative pt-[max(2.25rem,env(safe-area-inset-top))]">
      {/* Brand & Menu Toggle */}
      <div className="flex items-center gap-2.5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 font-bold text-xs ${
              isSidebarOpen
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
                : "bg-[#1a1c22] hover:bg-[#22242c] text-emerald-400 border-[#2e303a]"
            }`}
            title="Toggle Sudheer Hospital Navigation Menu"
          >
            <Menu className="w-4 h-4" />
            <span className="text-[11px] font-semibold">{t.menu}</span>
          </button>
        )}
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-2 relative">

        {/* Notification Bell Button */}
        {onOpenNotifications && (
          <button
            onClick={onOpenNotifications}
            className="p-1.5 rounded-xl bg-[#16171d] hover:bg-[#1f2129] border border-[#23252d] text-emerald-400 transition-all relative"
            title="Open Notification Center"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white font-black text-[8px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Logged-In User Profile Card */}
        <div
          onClick={() => {
            setShowProfileMenu(!showProfileMenu);
            setShowLangMenu(false);
          }}
          className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#16171d] border border-[#23252d] cursor-pointer hover:bg-[#1f2129] transition-all"
        >
          <img
            src={activeUser.avatar}
            alt={activeUser.name}
            className="w-5 h-5 rounded-full object-cover border border-slate-700"
          />
          <div className="text-left hidden sm:block">
            <span className="font-bold text-slate-200 text-[11px] block leading-tight">
              {activeUser.name}
            </span>
            <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-semibold font-mono">
              {activeUser.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Full-screen invisible backdrop to dismiss popups on touch/click outside */}
        {(showProfileMenu || showLangMenu) && (
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => {
              setShowProfileMenu(false);
              setShowLangMenu(false);
            }}
          />
        )}

        {/* Profile Details & Logout Popup Menu */}
        {showProfileMenu && (
          <div className="absolute right-0 top-11 w-60 bg-[#14161d] border border-[#2d303d] rounded-2xl p-3 shadow-2xl space-y-3 z-50">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#232532]">
              <img
                src={activeUser.avatar}
                alt={activeUser.name}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
              />
              <div>
                <h4 className="font-extrabold text-xs text-white leading-tight">{activeUser.name}</h4>
                <p className="text-[10px] text-slate-400">{activeUser.email}</p>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase inline-block mt-1">
                  {activeUser.department || activeUser.role}
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={() => {
                  setShowLogoutConfirm(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}

        {/* Logout Confirmation Container Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#14161e] border border-[#2a2d3d] rounded-2xl p-5 max-w-xs w-full space-y-4 text-center shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-extrabold text-white text-sm">Are you sure to logout?</h3>
                <p className="text-[11px] text-slate-400">
                  Your active staff session will be ended and you will return to the sign-in screen.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="py-2.5 rounded-xl bg-[#1e212d] hover:bg-[#282b3a] text-slate-300 font-bold text-xs border border-[#2e3142] transition-all"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    setShowProfileMenu(false);
                    if (onLogout) onLogout();
                  }}
                  className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all"
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

