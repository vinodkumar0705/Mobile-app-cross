import React from "react";
import {
  Calendar,
  BedDouble,
  FileText,
  Users,
  Home,
  Activity,
  FlaskConical,
  Receipt,
  Package,
  Utensils,
  LayoutDashboard,
  Shield,
  Clock,
  QrCode,
  Stethoscope,
} from "lucide-react";
import { UserRole } from "../../types/hms";

interface BottomTabBarProps {
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  role,
  activeTab,
  onTabChange,
}) => {
  const getTabs = () => {
    switch (role) {
      case "doctor":
        return [
          { id: "doctor_opd", label: "OPD Schedule", icon: Calendar },
          { id: "doctor_ipd", label: "IPD Wards", icon: BedDouble },
          { id: "doctor_rx", label: "Prescriptions", icon: FileText },
          { id: "patient_history", label: "Patient Logs", icon: Users },
        ];

      case "patient":
        return [
          { id: "patient_home", label: "My Health", icon: Home },
          { id: "patient_appointments", label: "Token & Appts", icon: Clock },
          { id: "patient_vitals", label: "Vitals Log", icon: Activity },
          { id: "patient_reports", label: "Reports & Rx", icon: FileText },
        ];

      case "clinical_nurse":
        return [
          { id: "nurse_opd", label: "OPD Triage", icon: Calendar },
          { id: "nurse_admissions", label: "Admissions", icon: BedDouble },
          { id: "nurse_vitals", label: "Record Vitals", icon: Activity },
          { id: "nurse_catering", label: "Diet Meals", icon: Utensils },
        ];

      case "lab_tech":
        return [
          { id: "lab_orders", label: "Lab Orders", icon: FlaskConical },
          { id: "lab_verified", label: "Verified Reports", icon: FileText },
          { id: "patient_history", label: "Patient Search", icon: Users },
        ];

      case "pharmacist":
        return [
          { id: "pharmacy_billing", label: "POS Billing", icon: Receipt },
          { id: "pharmacy_stock", label: "Stock Batches", icon: Package },
          { id: "doctor_rx", label: "Rx Orders", icon: FileText },
        ];

      case "admin":
      default:
        return [
          { id: "admin_overview", label: "Dashboard", icon: LayoutDashboard },
          { id: "admin_staff", label: "Staff Registry", icon: Users },
          { id: "admin_rooms", label: "Room Config", icon: BedDouble },
          { id: "admin_pricing", label: "Pricing & Exports", icon: Shield },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav className="bg-slate-900 border-t border-slate-800 px-2 py-1.5 flex items-center justify-around z-30 select-none shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 relative ${
              isActive
                ? "text-blue-400 font-bold bg-blue-500/10 scale-105"
                : "text-slate-400 hover:text-slate-200 font-medium"
            }`}
          >
            {isActive && (
              <span className="absolute -top-1.5 w-6 h-1 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50"></span>
            )}
            <Icon className={`w-5 h-5 ${isActive ? "text-blue-400" : ""}`} />
            <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[70px]">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
