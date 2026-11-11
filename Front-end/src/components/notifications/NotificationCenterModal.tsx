import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  FlaskConical,
  Package,
  Calendar,
  CheckCircle2,
  Trash2,
  Check,
} from "lucide-react";
import {
  SystemNotification,
  getStoredNotifications,
  saveStoredNotifications,
  clearAllNotifications,
} from "../../lib/storage";

export type { SystemNotification };

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tabId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  useEffect(() => {
    if (isOpen) {
      setNotifications(getStoredNotifications());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filterCategory === "ALL") return true;
    return n.category === filterCategory;
  });

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleToggleRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setNotifications([]);
  };

  const getCategoryBadge = (category: SystemNotification["category"]) => {
    switch (category) {
      case "emergency":
        return { icon: AlertTriangle, color: "text-red-400 bg-red-500/10 border-red-500/30", label: "EMERGENCY" };
      case "lab":
        return { icon: FlaskConical, color: "text-purple-400 bg-purple-500/10 border-purple-500/30", label: "LAB REPORT" };
      case "pharmacy":
        return { icon: Package, color: "text-amber-400 bg-amber-500/10 border-amber-500/30", label: "PHARMACY" };
      case "appointment":
        return { icon: Calendar, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", label: "APPOINTMENT" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-[#111216] border-l border-[#262936] h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#232532] bg-[#0e1015] flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white font-extrabold text-[9px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                Hospital Notification Center
              </h3>
              <p className="text-[11px] text-slate-400">
                {unreadCount} unread system alerts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1b1e28] hover:bg-[#252836] text-slate-400 hover:text-white border border-[#2b2d3c] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Categories Bar */}
        <div className="p-3 border-b border-[#202330] bg-[#14161e] flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterCategory("ALL")}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                filterCategory === "ALL"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-[#1c1f2b] text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilterCategory("emergency")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                filterCategory === "emergency"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "bg-[#1c1f2b] text-slate-400 hover:text-slate-200"
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setFilterCategory("lab")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                filterCategory === "lab"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                  : "bg-[#1c1f2b] text-slate-400 hover:text-slate-200"
              }`}
            >
              Lab
            </button>
            <button
              onClick={() => setFilterCategory("pharmacy")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                filterCategory === "pharmacy"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "bg-[#1c1f2b] text-slate-400 hover:text-slate-200"
              }`}
            >
              Stock
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[10px] text-emerald-400 hover:underline font-semibold shrink-0"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs space-y-2">
              <Bell className="w-10 h-10 opacity-30" />
              <span className="font-medium text-slate-400">No notifications available</span>
              <p className="text-[10px] text-slate-600 max-w-[200px] text-center">
                System notifications will appear here when appointments, discharges, or clinical actions occur.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const categoryBadge = getCategoryBadge(notif.category);
              const BadgeIcon = categoryBadge.icon;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    handleToggleRead(notif.id);
                    if (onNavigateTab) {
                      if (notif.category === "lab") onNavigateTab("lab_orders");
                      if (notif.category === "pharmacy") onNavigateTab("pharmacy_stock");
                      if (notif.category === "appointment") onNavigateTab("doctor_opd");
                    }
                  }}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all space-y-2 relative ${
                    !notif.isRead
                      ? "bg-[#181b24] border-emerald-500/40 shadow-lg shadow-black/40 text-white"
                      : "bg-[#0f1014] border-[#1d1f28] opacity-50 grayscale-[30%] text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border flex items-center gap-1 ${
                        !notif.isRead ? categoryBadge.color : "text-slate-400 bg-slate-800/40 border-slate-700/40"
                      }`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{categoryBadge.label}</span>
                    </span>

                    <span className="text-[10px] text-slate-500 font-mono">
                      {notif.timestamp}
                    </span>
                  </div>

                  <div>
                    <h4 className={`font-extrabold text-xs block ${!notif.isRead ? "text-white" : "text-slate-400"}`}>
                      {notif.title}
                    </h4>
                    <p className={`text-[11px] mt-1 leading-snug ${!notif.isRead ? "text-slate-300" : "text-slate-500"}`}>
                      {notif.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#232532] bg-[#0e1015] flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            {notifications.length} Total Alerts Logged
          </span>

          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

