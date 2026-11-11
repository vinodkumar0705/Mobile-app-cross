import React, { useState } from "react";
import { X, QrCode, Scan, CheckCircle2, AlertCircle } from "lucide-react";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (type: "patient" | "lab" | "stock", code: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [scanType, setScanType] = useState<"patient" | "lab" | "stock">("patient");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleCodes = {
    patient: [
      { code: "PAT-1092", label: "John Doe (UHID: HMS-2026-9812)" },
      { code: "PAT-1093", label: "Sarah Jenkins (UHID: HMS-2026-9813)" },
      { code: "PAT-1095", label: "Maria Garcia (UHID: HMS-2026-9815)" },
    ],
    lab: [
      { code: "LAB-9012", label: "John Doe - Complete Lipid Profile" },
      { code: "LAB-9013", label: "Sarah Jenkins - Troponin I & CRP" },
      { code: "LAB-9014", label: "Maria Garcia - ABG & Chest X-Ray" },
    ],
    stock: [
      { code: "TLM-2026-A12", label: "Telmisartan 40mg (Batch: TLM-2026-A12)" },
      { code: "ATV-2025-B88", label: "Atorvastatin 10mg (Batch: ATV-2025-B88)" },
      { code: "NS-2026-X99", label: "IV Normal Saline 500ml (Batch: NS-2026-X99)" },
    ],
  };

  const handleSimulateScan = (code: string) => {
    setLastScanned(code);
    setTimeout(() => {
      onScanSuccess(scanType, code);
      setLastScanned(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Camera Barcode & QR Scanner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera View Finder Simulation */}
        <div className="p-6 flex flex-col items-center bg-black relative min-h-[220px] justify-center overflow-hidden">
          {/* Laser Scanning Animation Line */}
          <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-pulse top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>

          {/* Target Reticle */}
          <div className="w-48 h-48 border-2 border-dashed border-blue-500/60 rounded-2xl flex items-center justify-center relative bg-blue-500/5">
            <QrCode className="w-16 h-16 text-blue-400/40 animate-pulse" />
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>
          </div>

          <p className="text-[11px] text-slate-400 mt-4 text-center">
            Position QR code or 1D Barcode inside frame to scan automatically
          </p>
        </div>

        {/* Scan Type Selection */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setScanType("patient")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                scanType === "patient"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Patient Badge
            </button>
            <button
              onClick={() => setScanType("lab")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                scanType === "lab"
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Lab Tube
            </button>
            <button
              onClick={() => setScanType("stock")}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
                scanType === "stock"
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Med Batch
            </button>
          </div>

          {/* Quick Simulated Target Taps */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              Tap Sample Barcode Tag:
            </p>
            {sampleCodes[scanType].map((item) => (
              <button
                key={item.code}
                onClick={() => handleSimulateScan(item.code)}
                className="w-full text-left p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs flex items-center justify-between text-slate-200 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-blue-400 font-bold text-[11px]">
                    {item.code}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {lastScanned === item.code ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                ) : (
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Scan →
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
