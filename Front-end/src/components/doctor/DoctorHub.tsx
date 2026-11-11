import React, { useState, useEffect } from "react";
import {
  Calendar,
  BedDouble,
  FileText,
  Stethoscope,
  CheckCircle2,
  Sparkles,
  Activity,
} from "lucide-react";
import {
  Appointment,
  Patient,
  Admission,
  Prescription,
  User as UserType,
} from "../../types/hms";
import {
  getAdmissions,
  getPatients,
  getPrescriptions,
} from "../../lib/storage";
import { appointmentService } from "../../services/appointmentService";
import { labService, LabTestConfig } from "../../services/labService";

// Modular Doctor Sub-Components
import { DoctorOpdQueue } from "./DoctorOpdQueue";
import { DoctorConsultation } from "./DoctorConsultation";
import { DoctorIpdWards } from "./DoctorIpdWards";
import { DoctorPrescriptions } from "./DoctorPrescriptions";

interface DoctorHubProps {
  activeDoctor: UserType;
  subTab: string;
  onOpenAiAssistant: () => void;
  onOpenPrint: () => void;
}

export const DoctorHub: React.FC<DoctorHubProps> = ({
  activeDoctor,
  subTab,
  onOpenAiAssistant,
  onOpenPrint,
}) => {
  const getTodayStr = () => new Date().toISOString().split("T")[0];

  const [currentTab, setCurrentTab] = useState<string>(subTab || "doctor_opd");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>(getAdmissions());
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(getPrescriptions());
  const [dbLabConfigs, setDbLabConfigs] = useState<LabTestConfig[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (subTab) {
      setCurrentTab(subTab);
    }
  }, [subTab]);

  const loadDoctorData = () => {
    appointmentService.getAllAppointments().then((res) => {
      if (res.success && res.data) {
        setAppointments(res.data);
      }
    });
    appointmentService.getAllAdmissions().then((res) => {
      if (res.success && res.data) {
        setAdmissions(res.data);
      }
    });
    labService.getLabConfigurations().then((res) => {
      if (res.success && res.data) {
        setDbLabConfigs(res.data);
      }
    });
    setPrescriptions(getPrescriptions());
  };

  useEffect(() => {
    loadDoctorData();
  }, [selectedDate]);

  // Filter appointments specifically for this doctor and selected date
  const doctorAppointments = appointments.filter((apt) => {
    let matchesDoctor = true;
    if (activeDoctor.role !== "admin") {
      if (apt.doctorId === activeDoctor.id) matchesDoctor = true;
      else if (apt.doctorName.toLowerCase().includes(activeDoctor.name.toLowerCase().split(" ")[0])) matchesDoctor = true;
      else if (!apt.doctorId) matchesDoctor = true;
      else matchesDoctor = false;
    }

    let matchesDate = true;
    if (selectedDate && apt.date) {
      matchesDate = apt.date.startsWith(selectedDate);
    }

    return matchesDoctor && matchesDate;
  });

  useEffect(() => {
    if (doctorAppointments.length > 0) {
      setSelectedAppointment(doctorAppointments[0]);
    } else {
      setSelectedAppointment(null);
    }
  }, [selectedDate, activeDoctor.id, appointments]);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-950 text-slate-100 space-y-4 max-w-7xl mx-auto w-full">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl font-medium text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Doctor Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-3xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white flex items-center gap-2 flex-wrap">
              <span>{activeDoctor.name}</span>
              <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                {activeDoctor.department || "CONSULTANT PHYSICIAN"}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Electronic Health Records, OPD Consultation Room & Inpatient Rounds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenAiAssistant}
            className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Clinical Assistant</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar Connecting All Doctor Modules */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {/* Tab 1: OPD Consultation */}
        <button
          type="button"
          onClick={() => setCurrentTab("doctor_opd")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "doctor_opd"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>OPD Consultation</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "doctor_opd"
              ? "bg-blue-500/30 text-white border-blue-400/40"
              : "bg-blue-500/20 text-blue-300 border-blue-500/30"
          }`}>
            {doctorAppointments.length}
          </span>
        </button>

        {/* Tab 2: IPD Ward Rounds */}
        <button
          type="button"
          onClick={() => setCurrentTab("doctor_ipd")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "doctor_ipd"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <BedDouble className="w-3.5 h-3.5 text-purple-400" />
          <span>IPD Ward Rounds</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "doctor_ipd"
              ? "bg-purple-500/30 text-white border-purple-400/40"
              : "bg-purple-500/20 text-purple-300 border-purple-500/30"
          }`}>
            {admissions.length}
          </span>
        </button>

        {/* Tab 3: Prescriptions Log */}
        <button
          type="button"
          onClick={() => setCurrentTab("doctor_rx")}
          className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
            currentTab === "doctor_rx" || currentTab === "patient_history"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Prescriptions & History</span>
          <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${
            currentTab === "doctor_rx" || currentTab === "patient_history"
              ? "bg-emerald-500/30 text-white border-emerald-400/40"
              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          }`}>
            {prescriptions.length}
          </span>
        </button>
      </div>

      {/* Render Selected Sub-Component */}
      {currentTab === "doctor_opd" && (
        <div className="flex flex-col space-y-4 w-full">
          <DoctorOpdQueue
            doctorName={activeDoctor.name}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            doctorAppointments={doctorAppointments}
            selectedAppointment={selectedAppointment}
            setSelectedAppointment={setSelectedAppointment}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />

          {selectedAppointment ? (
            <DoctorConsultation
              selectedAppointment={selectedAppointment}
              doctorName={activeDoctor.name}
              dbLabConfigs={dbLabConfigs}
              onOpenAiAssistant={onOpenAiAssistant}
              onOpenPrint={onOpenPrint}
              showToast={showToast}
              onConsultationCompleted={() => {
                loadDoctorData();
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
              <Stethoscope className="w-12 h-12 mb-2 text-slate-700" />
              <p className="text-xs">Select an OPD token above to begin consultation</p>
            </div>
          )}
        </div>
      )}

      {currentTab === "doctor_ipd" && (
        <DoctorIpdWards
          admissions={admissions}
          onOpenPrint={onOpenPrint}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}

      {(currentTab === "doctor_rx" || currentTab === "patient_history") && (
        <DoctorPrescriptions
          prescriptions={prescriptions}
          onOpenPrint={onOpenPrint}
          onNavigateTab={(tab) => setCurrentTab(tab)}
        />
      )}
    </div>
  );
};
