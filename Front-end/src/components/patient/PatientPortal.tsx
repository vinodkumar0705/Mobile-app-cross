import React, { useState } from "react";
import {
  Clock,
  FileText,
  CheckCircle2,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { User as UserType, Patient, Appointment, Vitals } from "../../types/hms";
import {
  getPatients,
  getAppointments,
  getVitals,
  getPrescriptions,
  getLabOrders,
} from "../../lib/storage";

interface PatientPortalProps {
  activeUser: UserType;
  subTab: string;
  onOpenPrint: () => void;
  onOpenAiAssistant: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  activeUser,
  subTab,
  onOpenPrint,
  onOpenAiAssistant,
}) => {
  const patients = getPatients();
  const patient = patients[0]; // John Doe
  const appointments = getAppointments();
  const activeApt = appointments[0];
  const vitals = getVitals();
  const prescriptions = getPrescriptions();
  const labOrders = getLabOrders();

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-950 text-slate-100 space-y-4">
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl font-medium text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Digital Health Badge Card */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-3xl p-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <img
              src={activeUser.avatar}
              alt={patient.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-400/50 shadow-lg"
            />
            <div>
              <h2 className="font-bold text-base text-white">{patient.name}</h2>
              <p className="text-[11px] text-blue-300 font-mono">
                UHID: {patient.uhid}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 text-xs">
          <div>
            <span className="text-[10px] text-blue-300 block">Age / Gender</span>
            <span className="font-bold text-white">
              {patient.age} Y • {patient.gender}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-blue-300 block">Blood Group</span>
            <span className="font-bold text-red-400">{patient.bloodGroup}</span>
          </div>
          <div>
            <span className="text-[10px] text-blue-300 block">Status</span>
            <span className="font-bold text-emerald-400">{patient.status}</span>
          </div>
        </div>
      </div>

      {/* Live Appointment Token Tracker */}
      {(subTab === "patient_home" || subTab === "patient_appointments") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Live OPD Appointment Token</span>
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold animate-pulse">
              In-Consultation
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                YOUR TOKEN NUMBER
              </p>
              <div className="text-3xl font-black text-blue-400 my-1">
                #{activeApt?.tokenNumber || "14"}
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Dr. Sarah Vance, MD • Cardiology OPD
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Slot Time</span>
              <span className="font-bold text-white text-sm">09:00 AM</span>
              <button
                onClick={onOpenPrint}
                className="mt-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow"
              >
                View Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Vitals & Health History */}
      {(subTab === "patient_home" || subTab === "patient_vitals") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-emerald-400" />
              <span>My Recorded Clinical Vitals</span>
            </h3>
            <button
              onClick={onOpenAiAssistant}
              className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 text-[11px] font-semibold border border-purple-500/30 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>Ask AI Analysis</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
              <span className="text-base font-black text-white font-mono">128/82</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">mmHg (Optimal)</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Pulse Rate</span>
              <span className="text-base font-black text-white font-mono">74</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">bpm (Normal)</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Temperature</span>
              <span className="text-base font-black text-white font-mono">98.6°F</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">Normal</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">SpO2 Oxygen</span>
              <span className="text-base font-black text-white font-mono">99%</span>
              <span className="text-[9px] text-emerald-400 block mt-0.5">Excellent</span>
            </div>
          </div>
        </div>
      )}

      {/* Patient Lab Reports & Prescriptions Log */}
      {(subTab === "patient_home" || subTab === "patient_reports") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Lab Reports & Prescriptions</span>
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {labOrders.map((lab) => (
              <div
                key={lab.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white">{lab.testName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Order #{lab.id} • Status: {lab.status}
                  </div>
                </div>

                <button
                  onClick={onOpenPrint}
                  className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] shadow"
                >
                  Download Report
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-bold text-white block">Outstanding OPD Bill</span>
              <span className="text-[10px] text-slate-400">Consultation + Lab Test Fees</span>
            </div>

            <div className="text-right">
              <span className="font-mono text-emerald-400 font-black text-base sm:text-lg block">
                ₹160.00
              </span>
              <span className="text-[10px] text-slate-400 font-medium">To be cleared by Admin</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
