import React from "react";
import { BedDouble, FileText, User } from "lucide-react";
import { Admission } from "../../types/hms";

interface DoctorIpdWardsProps {
  admissions: Admission[];
  onOpenPrint: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const DoctorIpdWards: React.FC<DoctorIpdWardsProps> = ({
  admissions,
  onOpenPrint,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-4 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">
              IPD Ward Rounds & Inpatient Monitoring
            </h3>
            <p className="text-[11px] text-slate-400">
              Admitted patients currently under your clinical care
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
                onClick={() => onNavigateTab("doctor_rx")}
                className="text-emerald-400 hover:underline font-semibold cursor-pointer"
              >
                Prescriptions
              </button>
            </div>
          )}
          <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30 uppercase tracking-wider">
            {admissions.length} Admitted Patients
          </span>
        </div>
      </div>

      {/* Admitted Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {admissions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-900/60 rounded-2xl border border-slate-800 col-span-2">
            No active inpatient admissions currently assigned under your care.
          </div>
        ) : (
          admissions.map((adm) => (
            <div
              key={adm.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 sm:p-4 space-y-3 text-xs transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-white block truncate">
                      {adm.patientName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Admission #{adm.id}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold font-mono text-xs border border-purple-500/30 shrink-0">
                  {adm.roomNumber} ({adm.bedNumber})
                </span>
              </div>

              <p className="text-slate-300 text-xs">
                <strong className="text-slate-400">Clinical Reason:</strong> {adm.reasonForAdmission}
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] gap-2">
                <span className="text-slate-400">
                  Dietary Plan: <span className="text-amber-300 font-semibold">{adm.cateringDietType}</span>
                </span>
                <button
                  type="button"
                  onClick={onOpenPrint}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Discharge Summary</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
