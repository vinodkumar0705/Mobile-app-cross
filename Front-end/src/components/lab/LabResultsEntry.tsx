import React from "react";
import { FlaskConical, Plus, CheckCircle2 } from "lucide-react";
import { LabOrder } from "../../types/hms";

interface LabResultsEntryProps {
  order: LabOrder;
  paramName: string;
  setParamName: (val: string) => void;
  paramVal: string;
  setParamVal: (val: string) => void;
  paramUnit: string;
  setParamUnit: (val: string) => void;
  paramRef: string;
  setParamRef: (val: string) => void;
  paramAbnormal: boolean;
  setParamAbnormal: (val: boolean) => void;
  onAddParam: () => void;
  onVerifyOrder: () => void;
}

export const LabResultsEntry: React.FC<LabResultsEntryProps> = ({
  order,
  paramName,
  setParamName,
  paramVal,
  setParamVal,
  paramUnit,
  setParamUnit,
  paramRef,
  setParamRef,
  paramAbnormal,
  setParamAbnormal,
  onAddParam,
  onVerifyOrder,
}) => {
  return (
    <div className="space-y-4">
      {/* Lab Test Information & Results Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>
              Lab Test: {order.testName} (Order #{order.id})
            </span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">
            Ordering Doctor: <strong className="text-slate-200">{order.doctorName}</strong>
          </span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-xs shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-xs">
                <tr>
                  <th className="p-3">Parameter Name</th>
                  <th className="p-3">Observed Value</th>
                  <th className="p-3">Unit</th>
                  <th className="p-3">Reference Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {!order.results || order.results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500 text-xs">
                      No test results entered yet for this order. Use the form below to enter parameters.
                    </td>
                  </tr>
                ) : (
                  order.results.map((res, i) => (
                    <tr
                      key={i}
                      className={res.isAbnormal ? "bg-amber-500/10 text-amber-300 font-bold" : "text-slate-200"}
                    >
                      <td className="p-3 font-medium">{res.parameterName}</td>
                      <td className="p-3 font-mono">
                        {res.value} {res.isAbnormal && "⚠️ High Alert"}
                      </td>
                      <td className="p-3 text-slate-400 font-mono">{res.unit}</td>
                      <td className="p-3 text-slate-400 font-mono">{res.referenceRange}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add New Parameter Form */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
        <span className="text-xs font-bold text-slate-300 block">
          Add Clinical Lab Result Parameter
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Parameter</label>
            <input
              type="text"
              value={paramName}
              onChange={(e) => setParamName(e.target.value)}
              className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Value</label>
            <input
              type="text"
              value={paramVal}
              onChange={(e) => setParamVal(e.target.value)}
              className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-white font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
            <input
              type="text"
              value={paramUnit}
              onChange={(e) => setParamUnit(e.target.value)}
              className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-white font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Ref Range</label>
            <input
              type="text"
              value={paramRef}
              onChange={(e) => setParamRef(e.target.value)}
              className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-3 text-white font-mono focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 gap-2">
          <label className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={paramAbnormal}
              onChange={(e) => setParamAbnormal(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500"
            />
            <span>Flag as Abnormal Value</span>
          </label>

          <button
            onClick={onAddParam}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Parameter</span>
          </button>
        </div>
      </div>

      {/* Verify Order Button */}
      <button
        onClick={onVerifyOrder}
        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>Verify & Sign Official Lab Report (Sends Admin Notification)</span>
      </button>
    </div>
  );
};
