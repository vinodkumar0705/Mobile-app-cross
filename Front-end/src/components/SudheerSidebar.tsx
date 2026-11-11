import React, { useState } from "react";
import {
  Users,
  Stethoscope,
  FlaskConical,
  FileText,
  Settings,
  LayoutGrid,
  Receipt,
  Package,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Building2,
  Sparkles,
  Search,
  Crosshair,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { User } from "../types/hms";

interface SudheerSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  activeUser: User;
  onCloseMobileDrawer?: () => void;
  orgLogo?: string | null;
  orgName?: string;
}

export const SudheerSidebar: React.FC<SudheerSidebarProps> = ({
  activeTab,
  onTabChange,
  activeUser,
  onCloseMobileDrawer,
  orgLogo,
  orgName = "Sudheer Hospital",
}) => {
  // Accordion open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    admin: true,
    patient_mgmt: true,
    doctor: true,
    lab: true,
    reports: true,
    configuration: true,
    logistics: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubItemClick = (tabId: string) => {
    onTabChange(tabId);
    if (onCloseMobileDrawer) {
      onCloseMobileDrawer();
    }
  };

  const isRoleAdmin = activeUser.role === "admin";
  const isRoleDoctor = activeUser.role === "doctor" || activeUser.role === "clinical_nurse";
  const isRoleLab = activeUser.role === "lab_tech";
  const isRolePharmacy = activeUser.role === "pharmacist";
  const isRolePatient = activeUser.role === "patient";

  const getPhaseBadge = () => {
    switch (activeUser.role) {
      case "admin":
        return { label: "Admin Phase", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: ShieldCheck };
      case "doctor":
        return { label: "Doctor Phase", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: Stethoscope };
      case "lab_tech":
        return { label: "Lab Phase", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: FlaskConical };
      case "pharmacist":
        return { label: "Pharmacy Phase", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Package };
      default:
        return { label: "HMS Portal", color: "bg-slate-500/20 text-slate-300 border-slate-500/30", icon: Users };
    }
  };

  const badgeInfo = getPhaseBadge();
  const PhaseIcon = badgeInfo.icon;

  return (
    <aside className="w-64 bg-[#111215] text-slate-200 border-r border-[#22242a] flex flex-col h-full select-none overflow-hidden font-sans">
      {/* Sudheer Hospital Header Brand & Active Phase Badge */}
      <div className="p-4 border-b border-[#22242a] flex flex-col space-y-3 bg-[#15171c]">
        <div className="flex items-center gap-3">
          {orgLogo ? (
            <img
              src={orgLogo}
              alt={orgName}
              className="w-9 h-9 rounded-xl object-cover border border-emerald-500/40 shadow-lg shadow-emerald-500/20 bg-white/10"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20 text-lg tracking-wider">
              S
            </div>
          )}
          <div>
            <h1 className="font-bold text-sm text-white tracking-tight leading-none">
              {orgName}
            </h1>
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase mt-1 block">
              {isRoleAdmin ? "Admin Executive Portal" : `${activeUser.role.replace("_", " ")} Portal`}
            </span>
          </div>
        </div>

        {/* Phase Badge inside Menu Bar */}
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-bold w-fit ${badgeInfo.color}`}>
          <PhaseIcon className="w-3.5 h-3.5" />
          <span>{badgeInfo.label}</span>
        </div>
      </div>

      {/* Quick Search Filter */}
      <div className="p-3 bg-[#131418] border-b border-[#22242a]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search portal features..."
            className="w-full bg-[#1b1c22] border border-[#2c2e36] text-slate-200 placeholder:text-slate-500 text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 text-xs">
        {/* ========================================== */}
        {/* ADMIN DASHBOARD ONLY (When logged in as Admin) */}
        {/* ========================================== */}
        {(isRoleAdmin) && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Executive Administration
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection("admin")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  openSections.admin
                    ? "bg-[#181a20] text-white"
                    : "text-slate-300 hover:bg-[#181a20]/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span className="font-medium text-xs">Admin Management</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    openSections.admin ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.admin && (
                <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-1 py-1">
                  <button
                    onClick={() => handleSubItemClick("admin_overview")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_overview"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-blue-400" />
                    <span>Executive Overview</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("admin_staff")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_staff"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Staff Registry & HR</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("admin_rooms")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_rooms"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Ward & Room Availability</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("admin_appointments")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_appointments"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Appointment Status Queue</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("admin_reports")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_reports"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Financial Analytics</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("admin_tests")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_tests"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-purple-400" />
                    <span>Diagnostic Tests & Lab Master</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("admin_config")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "admin_config"
                        ? "text-blue-400 font-semibold bg-blue-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Hospital Configuration</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* DOCTOR / CLINICAL SERVICES (When logged in as Doctor) */}
        {/* ========================================== */}
        {(isRoleDoctor) && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Clinical Doctor Portal
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection("doctor")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  openSections.doctor
                    ? "bg-[#181a20] text-white"
                    : "text-slate-300 hover:bg-[#181a20]/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-4 h-4 text-sky-400" />
                  <span className="font-medium text-xs">My Doctor Workstation</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    openSections.doctor ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.doctor && (
                <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-1 py-1">
                  <button
                    onClick={() => handleSubItemClick("doctor_opd")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "doctor_opd"
                        ? "text-sky-400 font-semibold bg-sky-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-sky-400" />
                    <span>OPD Appointments Queue</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("doctor_ipd")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "doctor_ipd"
                        ? "text-sky-400 font-semibold bg-sky-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>My IPD Ward Patients</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("patient_history")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "patient_history"
                        ? "text-sky-400 font-semibold bg-sky-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Patient Medical Records</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("doctor_rx")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "doctor_rx"
                        ? "text-sky-400 font-semibold bg-sky-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Prescriptions & Rx</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("doctor_vitals")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "doctor_vitals"
                        ? "text-sky-400 font-semibold bg-sky-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Vitals & Telemetry Charts</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* LABORATORY SERVICES (When logged in as Lab Tech) */}
        {/* ========================================== */}
        {(isRoleLab) && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Clinical Laboratory
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection("lab")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  openSections.lab
                    ? "bg-[#181a20] text-white"
                    : "text-slate-300 hover:bg-[#181a20]/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FlaskConical className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-xs">Pathology & Lab</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    openSections.lab ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.lab && (
                <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-1 py-1">
                  <button
                    onClick={() => handleSubItemClick("lab_orders")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "lab_orders"
                        ? "text-purple-400 font-semibold bg-purple-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-purple-400" />
                    <span>Test Orders & Verification</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("lab_reports")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "lab_reports"
                        ? "text-purple-400 font-semibold bg-purple-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Completed Test Reports</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PHARMACY SERVICES (When logged in as Pharmacist) */}
        {/* ========================================== */}
        {(isRolePharmacy) && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Pharmacy & Inventory
            </div>

            <div className="space-y-0.5">
              <button
                onClick={() => toggleSection("logistics")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  openSections.logistics
                    ? "bg-[#181a20] text-white"
                    : "text-slate-300 hover:bg-[#181a20]/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span className="font-medium text-xs">Pharmacy Workstation</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    openSections.logistics ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.logistics && (
                <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-1 py-1">
                  <button
                    onClick={() => handleSubItemClick("pharmacy_billing")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "pharmacy_billing"
                        ? "text-amber-400 font-semibold bg-amber-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-amber-400" />
                    <span>POS Counter Billing</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("pharmacy_stock")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "pharmacy_stock"
                        ? "text-amber-400 font-semibold bg-amber-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>Medicine Stock Batches</span>
                  </button>

                  <button
                    onClick={() => handleSubItemClick("nurse_catering")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                      activeTab === "nurse_catering"
                        ? "text-amber-400 font-semibold bg-amber-500/10"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1c22]"
                    }`}
                  >
                    <CircleDot className="w-1.5 h-1.5 text-slate-600" />
                    <span>IPD Catering & Diets</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* PATIENT PORTAL (When logged in as Patient) */}
        {/* ========================================== */}
        {(isRolePatient) && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              My Patient Portal
            </div>

            <div className="space-y-1">
              <button
                onClick={() => handleSubItemClick("patient_home")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2.5 ${
                  activeTab === "patient_home"
                    ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20"
                    : "text-slate-300 hover:bg-[#181a20]"
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>My Appointments</span>
              </button>

              <button
                onClick={() => handleSubItemClick("patient_records")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2.5 ${
                  activeTab === "patient_records"
                    ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20"
                    : "text-slate-300 hover:bg-[#181a20]"
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>My Medical Reports</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
