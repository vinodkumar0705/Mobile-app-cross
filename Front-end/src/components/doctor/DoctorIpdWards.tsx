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
      <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
            <BedDouble className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white truncate">
              IPD Ward Rounds & Inpatient Monitoring
            </h3>
            <p className="text-[11px] text-slate-400 truncate hidden xs:block">
              Admitted patients currently under your clinical care
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs font-bold border border-purple-500/30 uppercase tracking-wider whitespace-nowrap">
            {admissions.length} Admitted
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
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 sm:p-4 text-xs transition-all flex flex-col justify-between gap-3 shadow-sm overflow-hidden"
            >
              {/* Header: Patient Info + Room & Bed Badge */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
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
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-bold font-mono text-[11px] sm:text-xs border border-purple-500/30 shrink-0 whitespace-nowrap">
                  {adm.roomNumber} ({adm.bedNumber})
                </span>
              </div>

              {/* Body: Reason & Dietary Plan */}
              <div className="space-y-2 py-0.5">
                <div className="text-slate-300 text-xs flex items-start gap-1.5">
                  <span className="text-slate-400 font-medium shrink-0">Reason:</span>
                  <span className="text-slate-200 line-clamp-2">{adm.reasonForAdmission}</span>
                </div>

                <div className="text-xs flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium shrink-0">Dietary Plan:</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium text-[11px]">
                    {adm.cateringDietType || "Standard Medical Diet"}
                  </span>
                </div>
              </div>

              {/* Footer: Discharge Summary Button */}
              <div className="pt-2 border-t border-slate-800/80 w-full">
                <button
                  type="button"
                  onClick={onOpenPrint}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-blue-400 font-medium border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
