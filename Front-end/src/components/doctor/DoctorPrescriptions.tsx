import React, { useState } from "react";
import { FileText, Search, Pill, Printer, Calendar } from "lucide-react";
import { Prescription } from "../../types/hms";

interface DoctorPrescriptionsProps {
  prescriptions: Prescription[];
  onOpenPrint: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const DoctorPrescriptions: React.FC<DoctorPrescriptionsProps> = ({
  prescriptions,
  onOpenPrint,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchPatient = rx.patientName.toLowerCase().includes(q);
    const matchDiagnosis = rx.diagnosis.some((d) => d.toLowerCase().includes(q));
    const matchDrug = rx.items.some((it) => it.drugName.toLowerCase().includes(q));
    return matchPatient || matchDiagnosis || matchDrug;
  });

  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Doctor Prescriptions & Medical History Log
              </h3>
              <p className="text-[11px] text-slate-400">
                Archived clinical prescriptions and patient medication regimens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateTab && (
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                <span>Jump to:</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab("doctor_opd")}
                  className="text-blue-400 hover:underline font-semibold cursor-pointer"
                >
                  OPD Queue
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab("doctor_ipd")}
                  className="text-purple-400 hover:underline font-semibold cursor-pointer"
                >
                  Ward Rounds
                </button>
              </div>
            )}
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/30 uppercase tracking-wider">
              Total Issued: {prescriptions.length}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prescriptions by patient name, diagnosis, medication..."
            className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Prescription Cards List */}
        <div className="space-y-3 pt-1 max-h-[500px] overflow-y-auto pr-1">
          {filteredPrescriptions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
              No prescriptions found matching your search.
            </div>
          ) : (
            filteredPrescriptions.map((rx) => (
              <div
                key={rx.id}
                className="p-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-2.5 text-xs transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{rx.patientName}</span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                      {rx.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{rx.date}</span>
                    </span>
                    <button
                      type="button"
                      onClick={onOpenPrint}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
                      title="Print Prescription"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[11px]">Diagnosis:</span>
                  <div className="flex flex-wrap gap-1">
                    {rx.diagnosis.map((d, dIdx) => (
                      <span
                        key={dIdx}
                        className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[11px] font-semibold"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Medication Items */}
                <div className="space-y-1.5 pl-3 border-l-2 border-emerald-500/40 bg-slate-900/40 p-2.5 rounded-r-xl">
                  {rx.items.map((it, i) => (
                    <div key={i} className="text-slate-300 text-[11px] flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <Pill className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="font-medium text-white">{it.drugName}</span>
                        <span className="text-slate-500">({it.dosage})</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {it.frequency} • {it.duration}
                      </span>
                    </div>
                  ))}
                </div>

                {(rx.doctorNotes || (rx as any).notes) && (
                  <p className="text-[11px] text-slate-400 italic pt-1">
                    "{rx.doctorNotes || (rx as any).notes}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
