import React, { useState } from "react";
import {
  Stethoscope,
  HeartPulse,
  Pill,
  Plus,
  Trash2,
  FileText,
  FlaskConical,
  Sparkles,
  CheckCircle2,
  X,
  User,
} from "lucide-react";
import { Appointment, PrescriptionItem, Vitals, Prescription } from "../../types/hms";
import {
  addVitals,
  addPrescriptionStorage,
  updateAppointmentStatus,
  addLabOrderStorage,
  addSystemNotification,
  getSavedTemplates,
} from "../../lib/storage";
import { LabTestConfig } from "../../services/labService";

interface DoctorConsultationProps {
  selectedAppointment: Appointment;
  doctorName: string;
  dbLabConfigs: LabTestConfig[];
  onOpenAiAssistant: () => void;
  onOpenPrint: () => void;
  showToast: (msg: string) => void;
  onConsultationCompleted: () => void;
}

export const DoctorConsultation: React.FC<DoctorConsultationProps> = ({
  selectedAppointment,
  doctorName,
  dbLabConfigs,
  onOpenAiAssistant,
  onOpenPrint,
  showToast,
  onConsultationCompleted,
}) => {
  // Consultation Rx Form State
  const [rxDiagnosis, setRxDiagnosis] = useState<string>("Essential Hypertension (I10)");
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([
    {
      id: "rx-1",
      drugName: "Telmisartan 40mg Tablet",
      dosage: "40 mg",
      frequency: "1-0-0 (Morning)",
      duration: "30 Days",
      instructions: "Take before breakfast",
      quantity: 30,
      unitPrice: 0.8,
    },
  ]);
  const [doctorNotes, setDoctorNotes] = useState<string>("Maintain low salt diet and regular daily walking.");

  // Vitals Input Form State
  const [bpSys, setBpSys] = useState<number>(128);
  const [bpDia, setBpDia] = useState<number>(82);
  const [pulse, setPulse] = useState<number>(74);
  const [temp, setTemp] = useState<number>(98.6);
  const [spO2, setSpO2] = useState<number>(99);

  // Lab Order Modal State
  const [showLabModal, setShowLabModal] = useState<boolean>(false);
  const [labTestName, setLabTestName] = useState<string>("Complete Blood Count (CBC)");
  const [labCategory, setLabCategory] = useState<
    "Hematology" | "Biochemistry" | "Radiology" | "Microbiology" | "Pathology"
  >("Biochemistry");

  const handleAddRxItem = () => {
    setRxItems([
      ...rxItems,
      {
        id: `rx-${Date.now()}`,
        drugName: "Paracetamol 650mg Tablet",
        dosage: "650 mg",
        frequency: "SOS",
        duration: "5 Days",
        instructions: "Take after food",
        quantity: 10,
        unitPrice: 0.3,
      },
    ]);
  };

  const handleRemoveRxItem = (id: string) => {
    setRxItems(rxItems.filter((item) => item.id !== id));
  };

  const handleApplyTemplate = (tmpId: string) => {
    const templates = getSavedTemplates();
    const tmp = templates.find((t) => t.id === tmpId);
    if (tmp) {
      setRxDiagnosis(tmp.diagnosis);
      setRxItems(
        tmp.items.map((it, idx) => ({ ...it, id: `rx-tmp-${idx}-${Date.now()}` }))
      );
      showToast(`Applied preset: ${tmp.title}`);
    }
  };

  const handleCompleteConsultation = () => {
    // 1. Save Vitals
    const newVital: Vitals = {
      id: `VIT-${Date.now()}`,
      patientId: selectedAppointment.patientId,
      timestamp: new Date().toISOString(),
      bpSystolic: bpSys,
      bpDiastolic: bpDia,
      pulseRate: pulse,
      temperature: temp,
      spO2: spO2,
      respiratoryRate: 16,
      recordedBy: doctorName,
      notes: "Recorded during OPD Consultation",
    };
    addVitals(newVital);

    // 2. Save Prescription
    const newRx: Prescription = {
      id: `RX-${Date.now()}`,
      patientId: selectedAppointment.patientId,
      patientName: selectedAppointment.patientName,
      doctorId: selectedAppointment.doctorId,
      doctorName: doctorName,
      date: new Date().toISOString().split("T")[0],
      diagnosis: [rxDiagnosis],
      items: rxItems,
      doctorNotes: doctorNotes,
      status: "Active",
    } as any;
    addPrescriptionStorage(newRx);

    // 3. Update Appointment Status
    updateAppointmentStatus(selectedAppointment.id, "Completed");

    addSystemNotification({
      title: "Consultation Completed",
      message: `Completed OPD consultation & issued Rx for ${selectedAppointment.patientName}`,
      category: "appointment",
      priority: "medium",
    });

    showToast(`Prescription saved and consultation completed for ${selectedAppointment.patientName}!`);
    onConsultationCompleted();
  };

  const handleOrderLabTest = (e: React.FormEvent) => {
    e.preventDefault();

    const newLabOrder = {
      id: `LAB-${Date.now()}`,
      patientId: selectedAppointment.patientId,
      patientName: selectedAppointment.patientName,
      doctorId: selectedAppointment.doctorId,
      doctorName: doctorName,
      testName: labTestName,
      category: labCategory,
      orderedDate: new Date().toISOString(),
      sampleType: "Venous Blood / Specimen",
      status: "Pending" as const,
      cost: 95,
      notes: `Ordered by ${doctorName} during OPD Consultation`,
    };

    addLabOrderStorage(newLabOrder);

    addSystemNotification({
      title: "Lab Test Dispatched",
      message: `${labTestName} ordered for ${selectedAppointment.patientName} (${labCategory})`,
      category: "lab",
      priority: "high",
    });

    setShowLabModal(false);
    showToast(`Lab Order #${newLabOrder.id} dispatched to Laboratory Portal!`);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col space-y-4 w-full shadow-xl">
      {/* Patient Banner */}
      <div className="flex flex-col gap-3 bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 w-full">
        {/* Row 1: Icon beside Patient Name & Token, with AI Co-Pilot on the right */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="font-extrabold text-white text-base sm:text-lg truncate">
                {selectedAppointment.patientName}
              </h3>
              <span className="font-mono text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold shrink-0">
                Token #{selectedAppointment.tokenNumber}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAiAssistant}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            title="Open AI Clinical Assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="hidden sm:inline">AI Clinical Co-Pilot</span>
            <span className="sm:hidden">AI Co-Pilot</span>
          </button>
        </div>

        {/* Row 2: Patient Details neatly aligned below patient name */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 pl-0.5">
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Phone:</span>
            <span className="text-slate-300 font-medium">{selectedAppointment.patientPhone || "+91 9876543210"}</span>
          </div>
          <span className="text-slate-600 hidden xs:inline">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Slot:</span>
            <span className="text-blue-400 font-medium font-mono">{selectedAppointment.timeSlot}</span>
          </div>
          <span className="text-slate-600 hidden xs:inline">•</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Date:</span>
            <span className="text-slate-300 font-medium">{selectedAppointment.date}</span>
          </div>
        </div>

        {/* Row 3: + Order Lab Test and Print Rx buttons placed down side by side */}
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-800/80 w-full">
          <button
            type="button"
            onClick={() => setShowLabModal(true)}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">+ Order Lab Test</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrint}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Print Rx</span>
          </button>
        </div>
      </div>

      {/* Chief Complaint Banner */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
            Chief Medical Complaint
          </span>
          <span className="font-semibold text-slate-200 mt-0.5 block">
            {selectedAppointment.chiefComplaint || "Routine general clinical consultation"}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Consultation Fee</span>
          <span className="font-mono text-emerald-400 font-bold">₹{selectedAppointment.consultationFee || 75} (Paid)</span>
        </div>
      </div>

      {/* Live Vitals Telemetry Recording */}
      <div className="bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 space-y-2.5 w-full overflow-hidden">
        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-rose-400" />
            <span>Clinical Vitals Telemetry</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Recorded Live into Patient EMR</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 col-span-2 sm:col-span-1 min-w-0">
            <span className="text-[10px] text-slate-500 block truncate">Blood Pressure (Sys/Dia)</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={bpSys}
                onChange={(e) => setBpSys(Number(e.target.value))}
                className="w-12 bg-slate-950 border border-slate-800 rounded-lg p-1 text-white text-center text-xs"
              />
              <span className="text-slate-500">/</span>
              <input
                type="number"
                value={bpDia}
                onChange={(e) => setBpDia(Number(e.target.value))}
                className="w-12 bg-slate-950 border border-slate-800 rounded-lg p-1 text-white text-center text-xs"
              />
              <span className="text-[10px] text-slate-500">mmHg</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 min-w-0">
            <span className="text-[10px] text-slate-500 block truncate">Pulse Rate</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={pulse}
                onChange={(e) => setPulse(Number(e.target.value))}
                className="w-14 bg-slate-950 border border-slate-800 rounded-lg p-1 text-white text-center text-xs font-bold text-amber-400"
              />
              <span className="text-[10px] text-slate-500">bpm</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 min-w-0">
            <span className="text-[10px] text-slate-500 block truncate">Body Temp</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="w-14 bg-slate-950 border border-slate-800 rounded-lg p-1 text-white text-center text-xs"
              />
              <span className="text-[10px] text-slate-500">°F</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 min-w-0">
            <span className="text-[10px] text-slate-500 block truncate">Oxygen Sat.</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={spO2}
                onChange={(e) => setSpO2(Number(e.target.value))}
                className="w-14 bg-slate-950 border border-slate-800 rounded-lg p-1 text-white text-center text-xs font-bold text-cyan-400"
              />
              <span className="text-[10px] text-slate-500">% SpO2</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1 col-span-2 sm:col-span-2 lg:col-span-1 min-w-0">
            <span className="text-[10px] text-slate-500 block truncate">Resp. Rate</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-200 font-bold p-1">16</span>
              <span className="text-[10px] text-slate-500">breaths/min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Diagnosis & Presets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold text-slate-300">Clinical Diagnosis</label>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 mr-1">Quick Presets:</span>
            {[
              { id: "TMP-1", label: "HTN" },
              { id: "TMP-2", label: "T2DM" },
              { id: "TMP-3", label: "Bronchitis" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyTemplate(p.id)}
                className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 text-[10px] font-bold border border-slate-700 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={rxDiagnosis}
          onChange={(e) => setRxDiagnosis(e.target.value)}
          placeholder="e.g. Essential Hypertension (I10), Upper Respiratory Tract Infection"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Electronic Prescription (Rx) Medication Items */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-emerald-400" />
            <span>Prescription Medications (Rx)</span>
          </span>
          <button
            type="button"
            onClick={handleAddRxItem}
            className="px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medication</span>
          </button>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {rxItems.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
            >
              <div className="sm:col-span-4">
                <label className="text-[9px] text-slate-500 block mb-0.5">Medicine Name</label>
                <input
                  type="text"
                  value={item.drugName}
                  onChange={(e) => {
                    const updated = [...rxItems];
                    updated[idx].drugName = e.target.value;
                    setRxItems(updated);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[9px] text-slate-500 block mb-0.5">Dosage</label>
                <input
                  type="text"
                  value={item.dosage}
                  onChange={(e) => {
                    const updated = [...rxItems];
                    updated[idx].dosage = e.target.value;
                    setRxItems(updated);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[9px] text-slate-500 block mb-0.5">Frequency</label>
                <input
                  type="text"
                  value={item.frequency}
                  onChange={(e) => {
                    const updated = [...rxItems];
                    updated[idx].frequency = e.target.value;
                    setRxItems(updated);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[9px] text-slate-500 block mb-0.5">Duration</label>
                <input
                  type="text"
                  value={item.duration}
                  onChange={(e) => {
                    const updated = [...rxItems];
                    updated[idx].duration = e.target.value;
                    setRxItems(updated);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0">
                <div className="text-[10px] text-slate-400">
                  Qty: <span className="font-mono text-emerald-400 font-bold">{item.quantity || 10}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRxItem(item.id)}
                  className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                  title="Remove Medication"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Doctor Advice & Clinical Instructions */}
      <div className="space-y-1.5 text-xs">
        <label className="font-bold text-slate-300">Doctor's Clinical Advice & Follow-Up Notes</label>
        <textarea
          value={doctorNotes}
          onChange={(e) => setDoctorNotes(e.target.value)}
          rows={2}
          placeholder="Dietary precautions, follow-up timeline, warning signs..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white resize-none focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Complete Consultation Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleCompleteConsultation}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Complete Consultation & Issue Electronic Prescription</span>
        </button>
      </div>

      {/* Order Lab Test Modal */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span>Order Lab Diagnostic Test</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLabModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOrderLabTest} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={selectedAppointment.patientName}
                  disabled
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Select Diagnostic Panel / Test</label>
                  {dbLabConfigs.length > 0 && (
                    <span className="text-[10px] text-purple-400 font-mono">
                      {dbLabConfigs.length} Live DB Tests
                    </span>
                  )}
                </div>

                {dbLabConfigs.length > 0 && (
                  <select
                    value={dbLabConfigs.some((t) => t.name === labTestName) ? labTestName : ""}
                    onChange={(e) => {
                      const selected = dbLabConfigs.find((t) => t.name === e.target.value);
                      if (selected) {
                        setLabTestName(selected.name);
                        if (selected.category) {
                          const catMap: Record<string, any> = {
                            BLOOD: "Hematology",
                            URINE: "Biochemistry",
                            IMAGING: "Radiology",
                            CARDIAC: "Biochemistry",
                            PATHOLOGY: "Pathology",
                            MICROBIOLOGY: "Microbiology",
                          };
                          setLabCategory(catMap[selected.category] || "Biochemistry");
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium mb-2 text-xs"
                  >
                    <option value="">-- Select Test from Catalog --</option>
                    {dbLabConfigs.map((cfg) => (
                      <option key={cfg.id} value={cfg.name}>
                        {cfg.name} (₹{cfg.price || 0}) • {cfg.category || "General"}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={labTestName}
                  onChange={(e) => setLabTestName(e.target.value)}
                  placeholder="Or enter custom test name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Laboratory Department Category</label>
                <select
                  value={labCategory}
                  onChange={(e: any) => setLabCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Biochemistry">Clinical Biochemistry</option>
                  <option value="Hematology">Hematology & Blood Bank</option>
                  <option value="Radiology">Radiology & Imaging</option>
                  <option value="Microbiology">Microbiology & Serology</option>
                  <option value="Pathology">Pathology & Histology</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>Dispatch Order to Lab Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
