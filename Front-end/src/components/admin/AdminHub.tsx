import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Calendar,
  Users,
  BedDouble,
  FlaskConical,
  Download,
  Activity,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { getPatients, getAppointments, getAdmissions } from "../../lib/storage";
import { INITIAL_STAFF, INITIAL_ROOMS, INITIAL_USERS } from "../../lib/mockData";
import { Appointment, Admission, Room, LabOrder } from "../../types/hms";
import { appointmentService } from "../../services/appointmentService";
import { staffService, StaffEmployee } from "../../services/staffService";
import { roomService } from "../../services/roomService";
import { labService, LabTestConfig } from "../../services/labService";

// Modular Admin Sub-Components
import { AdminAppointments } from "./AdminAppointments";
import { AdminStaff } from "./AdminStaff";
import { AdminWards } from "./AdminWards";
import { AdminExports } from "./AdminExports";

interface AdminHubProps {
  subTab?: string;
}

export const AdminHub: React.FC<AdminHubProps> = ({ subTab }) => {
  const [currentTab, setCurrentTab] = useState<string>(subTab || "admin_appointments");
  const [openScheduleModal, setOpenScheduleModal] = useState<boolean>(false);
  const [patientsList, setPatientsList] = useState(getPatients());
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>(getAppointments());
  const [admissionsList, setAdmissionsList] = useState<Admission[]>(getAdmissions());
  const [roomsList, setRoomsList] = useState<Room[]>(INITIAL_ROOMS);
  const [staffList, setStaffList] = useState<StaffEmployee[]>(INITIAL_STAFF as any);

  // PostgreSQL Database Live Lab Configurations and Live Orders State
  const [labTestsList, setLabTestsList] = useState<LabTestConfig[]>([]);
  const [labOrdersList, setLabOrdersList] = useState<LabOrder[]>([]);
  const [isDbLabLoading, setIsDbLabLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchDbLabData = () => {
    setIsDbLabLoading(true);
    Promise.all([
      labService.getLabConfigurations(),
      labService.getAllLabOrders(),
    ])
      .then(([configsRes, ordersRes]) => {
        if (configsRes.success) {
          setLabTestsList(configsRes.data);
        }
        if (ordersRes.success) {
          setLabOrdersList(ordersRes.data);
        }
        setIsDbLabLoading(false);
      })
      .catch(() => setIsDbLabLoading(false));
  };

  useEffect(() => {
    if (subTab) {
      setCurrentTab(subTab);
    }
  }, [subTab]);

  useEffect(() => {
    fetchDbLabData();
    appointmentService.getAllAppointments().then((res) => {
      if (res.success && res.data.length > 0) {
        setAppointmentsList(res.data);
      }
    });
    appointmentService.getAllAdmissions().then((res) => {
      if (res.success && res.data.length > 0) {
        setAdmissionsList(res.data);
      }
    });
    staffService.getAllEmployees().then((res) => {
      if (res.success && res.data.length > 0) {
        setStaffList(res.data);
      }
    });
    roomService.getRooms().then((res) => {
      if (res.success && res.data.length > 0) {
        setRoomsList(res.data);
      }
    });
  }, []);

  // Doctors resolution
  const dbDoctorsFromAppointments = appointmentsList.map((apt) => ({
    id: apt.doctorId || apt.doctorName,
    name: apt.doctorName.startsWith("Dr.") ? apt.doctorName : `Dr. ${apt.doctorName}`,
    department: apt.department || "General Medicine",
  }));

  const dbDoctorsFromStaff = staffList
    .filter(
      (s: any) =>
        s.role === "doctor" ||
        s.isDoctor ||
        (s.designation && s.designation.toLowerCase().includes("doc")) ||
        (s.name && s.name.toLowerCase().includes("dr.")) ||
        (s.department && s.department.toLowerCase().includes("medicine"))
    )
    .map((s: any) => ({
      id: s.id || s.userId || s.name,
      name: s.name.startsWith("Dr.") ? s.name : `Dr. ${s.name}`,
      department: s.department || s.designation || "General Medicine",
    }));

  const defaultDoctors = INITIAL_USERS.filter((u) => u.role === "doctor").map((u) => ({
    id: u.id,
    name: u.name,
    department: u.department || "General Medicine",
  }));

  const doctorsList = Array.from(
    new Map(
      [...defaultDoctors, ...dbDoctorsFromStaff, ...dbDoctorsFromAppointments]
        .filter((doc) => doc.id && doc.name)
        .map((doc) => [doc.name, doc])
    ).values()
  );

  const allCombinedStaff = useMemo(() => {
    const docStaffEntries = doctorsList.map((doc) => ({
      id: doc.id || doc.name,
      name: doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`,
      role: "Doctor",
      designation: `Consultant Specialist (${doc.department})`,
      department: doc.department || "General Medicine",
      email: `${doc.name.toLowerCase().replace(/[^a-z]/g, "")}@hms-hospital.org`,
      phone: "+91 9876543210",
      status: "Active",
      isDoctor: true,
      opdRoomNumber: `OPD-${Math.floor(101 + Math.random() * 20)}`,
    }));

    const map = new Map<string, any>();
    [...staffList, ...docStaffEntries, ...INITIAL_STAFF].forEach((stf: any) => {
      const key = (stf.name || stf.id || "").toLowerCase().trim();
      if (key && !map.has(key)) {
        map.set(key, stf);
      }
    });

    return Array.from(map.values());
  }, [staffList, doctorsList]);

  // Total beds occupied calculation
  const totalBedsCount = roomsList.reduce((acc, r) => acc + (r.totalBeds || 0), 0);
  const occupiedBedsCount = admissionsList.filter((a) => a.status === "Admitted").length;

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-950 text-slate-100 space-y-4 max-w-7xl mx-auto w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl font-medium text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Admin Executive Header */}
      <div className="flex flex-col gap-3 bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-white">
              Hospital Executive Control Center
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Operational analytics, staff directory, room config, & data exports
            </p>
          </div>
        </div>

        {/* Schedule Appointment Action Button Placed Above 4 Metrics */}
        <div className="flex items-center justify-end w-full">
          <button
            type="button"
            onClick={() => {
              setCurrentTab("admin_appointments");
              setOpenScheduleModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule Appointment</span>
          </button>
        </div>

        {/* Global Executive Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs w-full overflow-hidden pt-1">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 gap-1">
              <span className="text-[11px]">Total Patients</span>
              <Users className="w-4 h-4 text-blue-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {patientsList.length}
            </div>
            <p className="text-[9px] text-emerald-400 font-semibold">+12% this month</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 gap-1">
              <span className="text-[11px]">OPD Tokens</span>
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {appointmentsList.length}
            </div>
            <p className="text-[9px] text-emerald-400 font-semibold">Today's Queue</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 gap-1">
              <span className="text-[11px]">Inpatient Beds</span>
              <BedDouble className="w-4 h-4 text-purple-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {occupiedBedsCount} / {totalBedsCount || 30}
            </div>
            <p className="text-[9px] text-purple-400 font-semibold">Active Admissions</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-slate-400 gap-1">
              <span className="text-[11px]">Medical Staff</span>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {allCombinedStaff.length}
            </div>
            <p className="text-[9px] text-amber-400 font-semibold">Active Personnel</p>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar Connecting All Admin Modules */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {/* Tab 1: Appointments Queue */}
        <button
          type="button"
          onClick={() => setCurrentTab("admin_appointments")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "admin_appointments" || currentTab === "admin_overview" || currentTab === "overview"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span>Appointments Queue</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "admin_appointments" || currentTab === "admin_overview" || currentTab === "overview"
              ? "bg-emerald-500/30 text-white border-emerald-400/40"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          }`}>
            {appointmentsList.length}
          </span>
        </button>

        {/* Tab 2: Ward & Rooms */}
        <button
          type="button"
          onClick={() => setCurrentTab("admin_rooms")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "admin_rooms" || currentTab === "rooms"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <BedDouble className="w-3.5 h-3.5 text-purple-400" />
          <span>Ward & Rooms</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "admin_rooms" || currentTab === "rooms"
              ? "bg-purple-500/30 text-white border-purple-400/40"
              : "bg-purple-500/20 text-purple-300 border-purple-500/30"
          }`}>
            {roomsList.length}
          </span>
        </button>

        {/* Tab 4: Diagnostic Tests Catalog */}
        <button
          type="button"
          onClick={() => setCurrentTab("admin_tests")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "admin_tests" || currentTab === "admin_config" || currentTab === "tests" || currentTab === "config"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
          <span>Diagnostic Catalog</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "admin_tests" || currentTab === "admin_config" || currentTab === "tests" || currentTab === "config"
              ? "bg-indigo-500/30 text-white border-indigo-400/40"
              : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
          }`}>
            {labTestsList.length}
          </span>
        </button>

        {/* Tab 5: Bulk Exports */}
        <button
          type="button"
          onClick={() => setCurrentTab("admin_exports")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "admin_exports" || currentTab === "admin_pricing" || currentTab === "exports" || currentTab === "pricing"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Bulk Exports</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "admin_exports" || currentTab === "admin_pricing" || currentTab === "exports" || currentTab === "pricing"
              ? "bg-amber-500/30 text-white border-amber-400/40"
              : "bg-amber-500/20 text-amber-300 border-amber-500/30"
          }`}>
            CSV
          </span>
        </button>
      </div>

      {/* Render Selected Sub-Component */}
      {(currentTab === "admin_appointments" ||
        currentTab === "admin_overview" ||
        currentTab === "overview") && (
        <AdminAppointments
          appointmentsList={appointmentsList}
          setAppointmentsList={setAppointmentsList}
          patientsList={patientsList}
          doctorsList={doctorsList}
          showToast={showToast}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          openScheduleModal={openScheduleModal}
          onCloseScheduleModal={() => setOpenScheduleModal(false)}
        />
      )}

      {(currentTab === "admin_staff" || currentTab === "staff") && (
        <AdminStaff
          staffList={staffList}
          setStaffList={setStaffList}
          allCombinedStaff={allCombinedStaff}
          showToast={showToast}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {(currentTab === "admin_rooms" || currentTab === "rooms") && (
        <AdminWards
          roomsList={roomsList}
          setRoomsList={setRoomsList}
          admissionsList={admissionsList}
          setAdmissionsList={setAdmissionsList}
          patientsList={patientsList}
          setPatientsList={setPatientsList}
          showToast={showToast}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {(currentTab === "admin_tests" ||
        currentTab === "admin_config" ||
        currentTab === "tests" ||
        currentTab === "config") && (
        <AdminExports
          activeSection="tests"
          labTestsList={labTestsList}
          setLabTestsList={setLabTestsList}
          labOrdersList={labOrdersList}
          isDbLabLoading={isDbLabLoading}
          fetchDbLabData={fetchDbLabData}
          showToast={showToast}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {(currentTab === "admin_exports" ||
        currentTab === "admin_pricing" ||
        currentTab === "exports" ||
        currentTab === "pricing") && (
        <AdminExports
          activeSection="exports"
          labTestsList={labTestsList}
          setLabTestsList={setLabTestsList}
          labOrdersList={labOrdersList}
          isDbLabLoading={isDbLabLoading}
          fetchDbLabData={fetchDbLabData}
          showToast={showToast}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}
    </div>
  );
};
