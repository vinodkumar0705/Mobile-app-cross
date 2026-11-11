import React from "react";
import { FlaskConical, X } from "lucide-react";
import { Patient, LabOrder } from "../../types/hms";
import { LabTestConfig } from "../../services/labService";

interface LabNewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: Patient[];
  dbTestConfigs: LabTestConfig[];
  newPatientId: string;
  setNewPatientId: (id: string) => void;
  newPatientName: string;
  setNewPatientName: (name: string) => void;
  newTestName: string;
  setNewTestName: (testName: string) => void;
  newCategory: LabOrder["category"];
  setNewCategory: (category: LabOrder["category"]) => void;
  newDoctorName: string;
  setNewDoctorName: (doc: string) => void;
  newSampleType: string;
  setNewSampleType: (sample: string) => void;
  newCost: number;
  setNewCost: (cost: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LabNewOrderModal: React.FC<LabNewOrderModalProps> = ({
  isOpen,
  onClose,
  patients,
  dbTestConfigs,
  newPatientId,
  setNewPatientId,
  newPatientName,
  setNewPatientName,
  newTestName,
  setNewTestName,
  newCategory,
  setNewCategory,
  newDoctorName,
  setNewDoctorName,
  newSampleType,
  setNewSampleType,
  newCost,
  setNewCost,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-4 sm:p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>Create New Lab Order</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1">Select Patient</label>
            <select
              value={newPatientId}
              onChange={(e) => {
                const id = e.target.value;
                setNewPatientId(id);
                const p = patients.find((pat) => pat.id === id);
                if (p) setNewPatientName(p.name);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium"
            >
              <option value="">-- Custom Patient Entry --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.uhid})
                </option>
              ))}
            </select>
          </div>

          {!newPatientId && (
            <div>
              <label className="text-slate-400 block mb-1">Patient Name</label>
              <input
                type="text"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Enter patient full name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400">Diagnostic Panel / Test Name</label>
            </div>
            {dbTestConfigs.length > 0 && (
              <select
                value={dbTestConfigs.some((t) => t.name === newTestName) ? newTestName : ""}
                onChange={(e) => {
                  const selected = dbTestConfigs.find((t) => t.name === e.target.value);
                  if (selected) {
                    setNewTestName(selected.name);
                    if (selected.price) setNewCost(selected.price);
                    if (selected.category) {
                      const catMap: Record<string, LabOrder["category"]> = {
                        BLOOD: "Hematology",
                        URINE: "Biochemistry",
                        IMAGING: "Radiology",
                        CARDIAC: "Biochemistry",
                        PATHOLOGY: "Pathology",
                        MICROBIOLOGY: "Microbiology",
                      };
                      setNewCategory(catMap[selected.category] || "Biochemistry");
                    }
                  }
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium mb-2 text-xs"
              >
                <option value="">-- Select Test from Catalog --</option>
                {dbTestConfigs.map((cfg) => (
                  <option key={cfg.id} value={cfg.name}>
                    {cfg.name} (₹{cfg.price || 0}) • {cfg.category || "General"}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={newTestName}
              onChange={(e) => setNewTestName(e.target.value)}
              placeholder="Or enter custom test name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Department Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as LabOrder["category"])}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
                <option value="Biochemistry">Biochemistry</option>
                <option value="Hematology">Hematology</option>
                <option value="Radiology">Radiology</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Pathology">Pathology</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Ordering Doctor</label>
              <input
                type="text"
                value={newDoctorName}
                onChange={(e) => setNewDoctorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Sample Specimen Type</label>
              <input
                type="text"
                value={newSampleType}
                onChange={(e) => setNewSampleType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Cost (₹)</label>
              <input
                type="number"
                value={newCost}
                onChange={(e) => setNewCost(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Dispatch New Lab Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
