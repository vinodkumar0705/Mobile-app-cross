import React, { useState } from "react";
import {
  Clock,
  FileText,
  CheckCircle2,
  HeartPulse,
  Sparkles,
  User,
  Calendar,
  Stethoscope,
  X,
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
  const patient =
    patients.find((p) => p.name.toLowerCase() === activeUser.name.toLowerCase()) ||
    patients[0]; // Active patient or John Doe

  const appointments = getAppointments();
  const patientAppointment =
    appointments.find(
      (apt) =>
        apt.patientId === patient.id ||
        apt.patientName.toLowerCase() === patient.name.toLowerCase() ||
        apt.patientName.toLowerCase().includes(patient.name.toLowerCase().split(" ")[0])
    ) || appointments[0];
  const activeApt = patientAppointment;

  const vitals = getVitals();
  const prescriptions = getPrescriptions();
  const labOrders = getLabOrders();

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

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
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={activeUser.avatar}
              alt={patient.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-blue-400/50 shadow-lg shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base text-white truncate">{patient.name}</h2>
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(true)}
                  className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/35 text-blue-200 border border-blue-400/35 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm shrink-0"
                  title="View Appointment Booking Details"
                >
                  <FileText className="w-3 h-3 text-blue-300" />
                  <span>Details</span>
                </button>
              </div>
              <p className="text-[11px] text-blue-300 font-mono mt-0.5">
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

      {/* Appointment Booking Details Modal */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-4 sm:p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    Appointment Booking Details
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Registration information submitted during scheduling
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-xs">
              {/* Section 1: Patient Information */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Patient Registration Information</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Patient Name</span>
                    <span className="font-bold text-white text-xs block">{activeApt?.patientName || patient.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Contact Phone</span>
                    <span className="font-mono text-slate-200 text-xs block">{activeApt?.patientPhone || patient.phone || "+91 9876543210"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Age & Gender</span>
                    <span className="font-medium text-slate-200 text-xs block">
                      {patient.age} Yrs • {patient.gender}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Blood Group</span>
                    <span className="font-bold text-rose-400 text-xs block">{patient.bloodGroup || "O+"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-500 block">UHID / Patient ID</span>
                    <span className="font-mono text-blue-300 text-xs block">{patient.uhid}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Consulting Doctor & Slot Schedule */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                  <span>Consulting Doctor & Schedule</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Attending Doctor</span>
                    <span className="font-bold text-blue-400 text-xs block">{activeApt?.doctorName || "Dr. Sarah Vance, MD"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Department</span>
                    <span className="font-medium text-slate-200 text-xs block">{activeApt?.department || "Cardiology OPD"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Appointment Date</span>
                    <span className="font-mono text-white text-xs block">{activeApt?.date || "2026-11-13"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Time Slot</span>
                    <span className="font-mono text-emerald-400 font-bold text-xs block">{activeApt?.timeSlot || "09:00 AM"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Token Number</span>
                    <span className="font-mono font-bold text-blue-400 text-xs block">#{activeApt?.tokenNumber || "142"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Appointment Type</span>
                    <span className="font-medium text-slate-200 text-xs block">{activeApt?.type || "OPD Regular"}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Clinical Reason & Payment Details */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">Chief Medical Complaint</span>
                  <p className="text-slate-200 font-medium text-xs mt-0.5">
                    {activeApt?.chiefComplaint || "Routine general clinical consultation"}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Consultation Fee</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      ₹{activeApt?.consultationFee || 75}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Booking Status</span>
                    <span className="font-bold text-xs text-amber-300">
                      {activeApt?.status || "In-Consultation"} ({activeApt?.paymentStatus || "Paid"})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
