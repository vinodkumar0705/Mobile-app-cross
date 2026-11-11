import React, { useState } from "react";
import { X, Printer, Download, FileCheck, Building2, CheckCircle2 } from "lucide-react";
import {
  getAppointments,
  getPatients,
  getPrescriptions,
  getLabOrders,
} from "../../lib/storage";

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType?: "token" | "discharge" | "lab_report" | "pharmacy_invoice";
  targetId?: string;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  documentType = "token",
  targetId,
}) => {
  const [docType, setDocType] = useState<
    "token" | "discharge" | "lab_report" | "pharmacy_invoice"
  >(documentType);

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    window.print();
  };

  const appointments = getAppointments();
  const patients = getPatients();
  const labOrders = getLabOrders();
  const prescriptions = getPrescriptions();

  const activeApt = appointments[0];
  const activePatient = patients[0];
  const activeLab = labOrders[0];
  const activeRx = prescriptions[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              High-Fidelity Document Printing Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerPrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document Type Selector Tabs */}
        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setDocType("token")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              docType === "token"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white bg-slate-900"
            }`}
          >
            OPD Thermal Ticket (80mm)
          </button>
          <button
            onClick={() => setDocType("lab_report")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              docType === "lab_report"
                ? "bg-purple-600 text-white"
                : "text-slate-400 hover:text-white bg-slate-900"
            }`}
          >
            Clinical Lab Report
          </button>
          <button
            onClick={() => setDocType("discharge")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              docType === "discharge"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-white bg-slate-900"
            }`}
          >
            IPD Discharge Summary
          </button>
          <button
            onClick={() => setDocType("pharmacy_invoice")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              docType === "pharmacy_invoice"
                ? "bg-amber-600 text-white"
                : "text-slate-400 hover:text-white bg-slate-900"
            }`}
          >
            Pharmacy POS Invoice
          </button>
        </div>

        {/* Document Render Container (White Printable View) */}
        <div className="p-6 bg-slate-950 overflow-y-auto flex justify-center print:p-0 print:bg-white">
          {/* Document Type 1: Thermal OPD Token (80mm format) */}
          {docType === "token" && (
            <div className="w-[320px] bg-white text-slate-900 p-6 rounded-lg shadow-2xl font-mono text-xs border border-slate-300 print:shadow-none">
              <div className="text-center border-b pb-3 mb-3 border-dashed border-slate-300">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm tracking-wider uppercase">
                  <Building2 className="w-4 h-4 text-slate-800" />
                  <span>HMS HEALTHCARE</span>
                </div>
                <p className="text-[10px] text-slate-600">Central Hospital - Main OPD</p>
                <p className="text-[10px] text-slate-500">Tel: +1 (555) 234-5678</p>
              </div>

              <div className="text-center my-4 py-3 bg-slate-100 rounded border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  OPD TOKEN NUMBER
                </p>
                <div className="text-4xl font-black text-blue-700 my-1">
                  #{activeApt?.tokenNumber || "14"}
                </div>
                <p className="text-[11px] font-semibold text-slate-700">
                  {activeApt?.department || "Cardiology OPD"}
                </p>
              </div>

              <div className="space-y-1.5 text-[11px] py-2 border-y border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Token ID:</span>
                  <span className="font-bold">{activeApt?.id || "APT-4012"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-bold">{activeApt?.patientName || "John Doe"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UHID:</span>
                  <span className="font-mono">{activePatient?.uhid || "HMS-2026-9812"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-medium">{activeApt?.doctorName || "Dr. Sarah Vance, MD"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Slot:</span>
                  <span className="font-bold text-blue-600">{activeApt?.timeSlot || "09:00 AM"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consult Fee:</span>
                  <span className="font-bold">${activeApt?.consultationFee || 75}.00</span>
                </div>
              </div>

              <div className="mt-4 text-center space-y-1 text-[10px] text-slate-500">
                <p>Please wait for your token number on OPD Display Screens.</p>
                <div className="w-full h-8 bg-slate-900 text-white font-mono text-[9px] flex items-center justify-center tracking-widest my-2 rounded">
                  *HMS-{activeApt?.id || "APT-4012"}*
                </div>
                <p>Issued at: {new Date().toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Document Type 2: Clinical Lab Report */}
          {docType === "lab_report" && (
            <div className="w-full max-w-xl bg-white text-slate-900 p-8 rounded-lg shadow-2xl font-sans text-xs border border-slate-300 print:shadow-none space-y-4">
              {/* Header Letterhead */}
              <div className="border-b-2 border-blue-600 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-blue-900 tracking-tight">
                    HMS DIAGNOSTICS & PATHOLOGY LABS
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    Accredited Clinical Testing Center • License #LAB-88492
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <p>Central Hospital Campus, Floor 2</p>
                  <p>lab@hms-hospital.org</p>
                </div>
              </div>

              {/* Patient Info Table */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200 text-[11px]">
                <div>
                  <p><span className="text-slate-500">Patient Name:</span> <strong>{activeLab?.patientName || "John Doe"}</strong></p>
                  <p><span className="text-slate-500">Age / Gender:</span> <strong>42 Y / Male</strong></p>
                  <p><span className="text-slate-500">UHID:</span> <span className="font-mono">HMS-2026-9812</span></p>
                </div>
                <div>
                  <p><span className="text-slate-500">Order ID:</span> <strong>{activeLab?.id || "LAB-9012"}</strong></p>
                  <p><span className="text-slate-500">Ref Doctor:</span> <strong>{activeLab?.doctorName || "Dr. Sarah Vance, MD"}</strong></p>
                  <p><span className="text-slate-500">Sample Date:</span> <strong>{new Date().toLocaleDateString()}</strong></p>
                </div>
              </div>

              {/* Test Name */}
              <div className="bg-blue-50 text-blue-900 px-3 py-1.5 rounded font-bold border border-blue-200">
                Test Requested: {activeLab?.testName || "Complete Lipid Profile & HbA1c"}
              </div>

              {/* Lab Parameters Table */}
              <table className="w-full text-left border-collapse border border-slate-200 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-2 border-r border-slate-200">Test Parameter</th>
                    <th className="p-2 border-r border-slate-200">Observed Value</th>
                    <th className="p-2 border-r border-slate-200">Unit</th>
                    <th className="p-2">Reference Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {activeLab?.results?.map((res, i) => (
                    <tr key={i} className={res.isAbnormal ? "bg-amber-50/80 font-bold text-amber-900" : ""}>
                      <td className="p-2 border-r border-slate-200">{res.parameterName}</td>
                      <td className="p-2 border-r border-slate-200">{res.value} {res.isAbnormal && "⚠️"}</td>
                      <td className="p-2 border-r border-slate-200 text-slate-500">{res.unit}</td>
                      <td className="p-2 text-slate-600">{res.referenceRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] space-y-1">
                <p className="font-bold text-slate-700">Lab Technician / Pathologist Notes:</p>
                <p className="text-slate-600">{activeLab?.notes || "Results verified against calibration standards."}</p>
              </div>

              {/* Signatures */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-[11px]">
                <div>
                  <p className="font-mono text-[9px] text-slate-400">Barcode verified: *LAB-9012*</p>
                </div>
                <div className="text-right">
                  <div className="font-serif italic text-blue-800 text-sm font-bold">Dr. Marcus Thorne</div>
                  <p className="font-bold text-slate-700">Dr. Marcus Thorne, MD (Pathology)</p>
                  <p className="text-[10px] text-slate-500">Chief Clinical Pathologist</p>
                </div>
              </div>
            </div>
          )}

          {/* Document Type 3: IPD Discharge Summary */}
          {docType === "discharge" && (
            <div className="w-full max-w-xl bg-white text-slate-900 p-8 rounded-lg shadow-2xl font-sans text-xs border border-slate-300 print:shadow-none space-y-4">
              <div className="text-center border-b-2 border-emerald-600 pb-3">
                <h2 className="text-lg font-black text-emerald-900 tracking-tight">
                  CENTRAL HOSPITAL & RESEARCH CENTER
                </h2>
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                  OFFICIAL INPATIENT DISCHARGE SUMMARY
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200 text-[11px]">
                <div>
                  <p><span className="text-slate-500">Patient:</span> <strong>Sarah Jenkins</strong></p>
                  <p><span className="text-slate-500">Age / Gender:</span> <strong>65 Y / Female</strong></p>
                  <p><span className="text-slate-500">Admitted:</span> <strong>11-Aug-2026</strong></p>
                </div>
                <div>
                  <p><span className="text-slate-500">Admission ID:</span> <strong>ADM-8041</strong></p>
                  <p><span className="text-slate-500">Room / Bed:</span> <strong>Private Suite 302-A</strong></p>
                  <p><span className="text-slate-500">Discharged:</span> <strong>13-Aug-2026</strong></p>
                </div>
              </div>

              <div className="space-y-3 text-[11px]">
                <div>
                  <h4 className="font-bold text-emerald-900 uppercase border-b pb-1">1. Diagnosis on Admission & Discharge</h4>
                  <p className="mt-1 text-slate-800 font-medium">Post-Angioplasty Telemetry Observation, Primary Hypertension, Hyperlipidemia.</p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 uppercase border-b pb-1">2. Course of Treatment in Hospital</h4>
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    Patient was admitted for 48-hour continuous ECG telemetry monitoring following right radial angioplasty. Hemodynamics remained stable throughout stay. Post-procedure site clean, no hematoma.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 uppercase border-b pb-1">3. Discharge Advice & Medications</h4>
                  <ul className="list-disc pl-4 mt-1 text-slate-700 space-y-1 font-medium">
                    <li>Telmisartan 40mg - 1 Tab Morning after breakfast</li>
                    <li>Atorvastatin 20mg - 1 Tab Night after dinner</li>
                    <li>Aspirin 75mg - 1 Tab Daily after lunch</li>
                    <li>Follow low sodium, cardiac-healthy dietary plan</li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-[11px]">
                <p className="text-[10px] text-slate-500">Generated on HMS Mobile Platform</p>
                <div className="text-right">
                  <div className="font-serif italic text-emerald-800 text-sm font-bold">Dr. Sarah Vance</div>
                  <p className="font-bold text-slate-800">Dr. Sarah Vance, MD</p>
                  <p className="text-[10px] text-slate-500">Senior Consultant Cardiologist</p>
                </div>
              </div>
            </div>
          )}

          {/* Document Type 4: Pharmacy POS Invoice */}
          {docType === "pharmacy_invoice" && (
            <div className="w-full max-w-md bg-white text-slate-900 p-6 rounded-lg shadow-2xl font-mono text-xs border border-slate-300 print:shadow-none space-y-3">
              <div className="text-center border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900">HMS PHARMACY STORE</h3>
                <p className="text-[10px] text-slate-500">Tax Invoice / Receipt #PHARM-2091</p>
              </div>

              <div className="text-[11px] space-y-0.5 text-slate-700">
                <p>Patient: <strong>John Doe</strong> (UHID: HMS-2026-9812)</p>
                <p>Prescribed by: <strong>Dr. Sarah Vance, MD</strong></p>
                <p>Date: {new Date().toLocaleDateString()}</p>
              </div>

              <table className="w-full text-left border-y border-dashed border-slate-300 my-2 py-2 text-[11px]">
                <thead>
                  <tr className="border-b text-slate-500 font-bold">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-200">
                  <tr>
                    <td className="py-1.5">Telmisartan 40mg (Batch: TLM-A12)</td>
                    <td className="text-center">30</td>
                    <td className="text-right">$24.00</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Atorvastatin 10mg (Batch: ATV-B88)</td>
                    <td className="text-center">30</td>
                    <td className="text-right">$36.00</td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Metformin 500mg ER (Batch: MTF-C04)</td>
                    <td className="text-center">60</td>
                    <td className="text-right">$30.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="space-y-1 text-right text-[11px]">
                <p>Subtotal: $90.00</p>
                <p>GST / Tax (5%): $4.50</p>
                <p className="text-sm font-black text-blue-800 border-t pt-1">
                  GRAND TOTAL: $94.50
                </p>
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-dashed">
                <p>Thank you. Keep medicines out of reach of children.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
