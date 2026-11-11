import React from "react";
import {
  ArrowLeft,
  FileText,
  User,
  ShieldAlert,
  Activity,
  Heart,
  Zap,
  Thermometer,
  Droplets,
  Stethoscope,
} from "lucide-react";
import { Patient, LabOrder, Vitals } from "../../types/hms";

interface LabPatientTelemetryProps {
  patient: Patient;
  order: LabOrder;
  vitals: Vitals;
  showAddVitalsForm: boolean;
  setShowAddVitalsForm: (show: boolean) => void;
  newBpSys: number;
  setNewBpSys: (val: number) => void;
  newBpDia: number;
  setNewBpDia: (val: number) => void;
  newPulse: number;
  setNewPulse: (val: number) => void;
  newTemp: number;
  setNewTemp: (val: number) => void;
  newSpo2: number;
  setNewSpo2: (val: number) => void;
  newRespRate: number;
  setNewRespRate: (val: number) => void;
  onSaveVitals: (e: React.FormEvent) => void;
  onBackToList: () => void;
  onOpenPrint?: () => void;
}

export const LabPatientTelemetry: React.FC<LabPatientTelemetryProps> = ({
  patient,
  order,
  vitals,
  showAddVitalsForm,
  setShowAddVitalsForm,
  newBpSys,
  setNewBpSys,
  newBpDia,
  setNewBpDia,
  newPulse,
  setNewPulse,
  newTemp,
  setNewTemp,
  newSpo2,
  setNewSpo2,
  newRespRate,
  setNewRespRate,
  onSaveVitals,
  onBackToList,
  onOpenPrint,
}) => {
  return (
    <div className="space-y-4">
      {/* Page Header with Back Button & Print Report */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2.5">
        <button
          onClick={onBackToList}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Back to Pending Tasks List</span>
        </button>

        {onOpenPrint && (
          <button
            onClick={onOpenPrint}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Print Official Lab Report</span>
          </button>
        )}
      </div>

      {/* Patient Profile Demographics Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-lg shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2 flex-wrap">
                {patient.name}
                <span className="text-xs font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {patient.gender}, {patient.age} yrs
                </span>
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-3 font-mono mt-0.5">
                <span>UHID: {patient.uhid}</span>
                <span>•</span>
                <span>Patient ID: {patient.id}</span>
              </p>
            </div>
          </div>

          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold ${
              order.status === "Verified"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : order.status === "In Analysis"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
            }`}
          >
            {order.status}
          </span>
        </div>

        {/* Patient Demographics Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-slate-400 font-mono bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-500 block">Blood Group</span>
            <strong className="text-emerald-400 block text-base font-extrabold">{patient.bloodGroup}</strong>
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-500 block">Phone</span>
            <strong className="text-slate-200 block text-xs mt-0.5 truncate">{patient.phone}</strong>
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-500 block">Emergency Contact</span>
            <strong className="text-slate-200 block text-xs mt-0.5 truncate">
              {patient.emergencyContact?.name} ({patient.emergencyContact?.relationship})
            </strong>
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-500 block">Reg. Date</span>
            <strong className="text-slate-200 block text-xs mt-0.5 truncate">{patient.registeredDate}</strong>
          </div>
        </div>

        {/* Known Allergies & Medical Risks */}
        {patient.allergies && patient.allergies.length > 0 && (
          <div className="flex items-center gap-2 pt-1 text-xs flex-wrap">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-400 font-semibold">Known Allergies & Risks:</span>
            <div className="flex flex-wrap gap-1.5">
              {patient.allergies.map((alg, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-bold border border-amber-500/20"
                >
                  {alg}
                </span>
              ))}
              {patient.chronicConditions?.map((cond, idx) => (
                <span
                  key={`c-${idx}`}
                  className="px-2.5 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-bold border border-purple-500/20"
                >
                  {cond}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PATIENT CLINICAL VITALS TELEMETRY SECTION */}
      <div className="bg-slate-950 border border-purple-500/30 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-xl shadow-purple-950/20">
        <div className="flex items-center justify-between border-b border-slate-900 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Patient Clinical Vitals Telemetry
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Recorded at {vitals.timestamp}</span>
            <button
              onClick={() => setShowAddVitalsForm(!showAddVitalsForm)}
              className="px-3 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold cursor-pointer transition-all"
            >
              {showAddVitalsForm ? "Cancel" : "+ Record Vitals"}
            </button>
          </div>
        </div>

        {/* Vitals Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-3">
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-slate-400 text-xs font-medium">
              <span className="truncate">Blood Pressure</span>
              <Heart className="w-4 h-4 text-rose-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-white font-mono">
                {vitals.bpSystolic}/{vitals.bpDiastolic}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">mmHg</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-slate-400 text-xs font-medium">
              <span className="truncate">Pulse Rate</span>
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-amber-300 font-mono">{vitals.pulseRate}</span>
              <span className="text-[10px] text-slate-500 block font-mono">bpm</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-slate-400 text-xs font-medium">
              <span className="truncate">Temperature</span>
              <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-orange-300 font-mono">{vitals.temperature}</span>
              <span className="text-[10px] text-slate-500 block font-mono">°F</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 text-slate-400 text-xs font-medium">
              <span className="truncate">SpO2 Oxygen</span>
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-cyan-300 font-mono">{vitals.spO2}%</span>
              <span className="text-[10px] text-slate-500 block font-mono">Saturation</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between gap-1 text-slate-400 text-xs font-medium">
              <span className="truncate">Resp. Rate</span>
              <Stethoscope className="w-4 h-4 text-purple-400 shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-extrabold text-purple-300 font-mono">
                {vitals.respiratoryRate}
              </span>
              <span className="text-[10px] text-slate-500 block font-mono">/min</span>
            </div>
          </div>
        </div>

        {/* Collapsible Record Vitals Form */}
        {showAddVitalsForm && (
          <form
            onSubmit={onSaveVitals}
            className="bg-slate-900 p-4 rounded-2xl border border-purple-500/30 space-y-3 text-xs"
          >
            <span className="font-bold text-purple-300 block text-xs">Record New Patient Telemetry Vitals</span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-xs">
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">BP Systolic</label>
                <input
                  type="number"
                  value={newBpSys}
                  onChange={(e) => setNewBpSys(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">BP Diastolic</label>
                <input
                  type="number"
                  value={newBpDia}
                  onChange={(e) => setNewBpDia(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Pulse (bpm)</label>
                <input
                  type="number"
                  value={newPulse}
                  onChange={(e) => setNewPulse(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newTemp}
                  onChange={(e) => setNewTemp(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={newSpo2}
                  onChange={(e) => setNewSpo2(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Resp Rate</label>
                <input
                  type="number"
                  value={newRespRate}
                  onChange={(e) => setNewRespRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              Save Vitals Telemetry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
