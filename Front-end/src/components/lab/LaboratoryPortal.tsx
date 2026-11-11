import React, { useState, useEffect } from "react";
import { FlaskConical, CheckCircle2, Plus, Scan } from "lucide-react";
import { LabOrder, LabParameterResult, Patient, Vitals } from "../../types/hms";
import {
  getLabOrders,
  saveLabOrders,
  addLabOrderStorage,
  getPatients,
  addSystemNotification,
  getVitals,
  addVitals,
} from "../../lib/storage";
import { labService, LabTestConfig } from "../../services/labService";

import { LabOrdersQueue } from "./LabOrdersQueue";
import { LabPatientTelemetry } from "./LabPatientTelemetry";
import { LabResultsEntry } from "./LabResultsEntry";
import { LabNewOrderModal } from "./LabNewOrderModal";

interface LaboratoryPortalProps {
  onOpenPrint: () => void;
  onOpenScanner: () => void;
  subTab?: string;
}

export const LaboratoryPortal: React.FC<LaboratoryPortalProps> = ({
  onOpenPrint,
  onOpenScanner,
  subTab,
}) => {
  const [labOrders, setLabOrders] = useState<LabOrder[]>(getLabOrders());
  const [patients] = useState<Patient[]>(getPatients());
  const [vitalsList, setVitalsList] = useState<Vitals[]>(getVitals());
  const [dbTestConfigs, setDbTestConfigs] = useState<LabTestConfig[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);

  // Search & Filter State - DEFAULT TO "Pending" FOR MOBILE / PHONE MODE
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Screen View state: "list" = Only show Pending Patients list page, "detail" = Only show Patient Vitals & Results page
  const [activeView, setActiveView] = useState<"list" | "detail">("list");

  // New Lab Order Modal State
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [newPatientId, setNewPatientId] = useState<string>("");
  const [newPatientName, setNewPatientName] = useState<string>("");
  const [newTestName, setNewTestName] = useState<string>(
    "Complete Blood Count (CBC) & Lipid Profile"
  );
  const [newCategory, setNewCategory] = useState<
    "Biochemistry" | "Hematology" | "Radiology" | "Microbiology" | "Pathology"
  >("Biochemistry");
  const [newDoctorName, setNewDoctorName] = useState<string>("Dr. Sarah Vance, MD");
  const [newSampleType, setNewSampleType] = useState<string>("Venous Blood / Specimen");
  const [newCost, setNewCost] = useState<number>(95);

  // Form parameters state for entering lab values
  const [paramName, setParamName] = useState("Serum Creatinine");
  const [paramVal, setParamVal] = useState("1.4");
  const [paramUnit, setParamUnit] = useState("mg/dL");
  const [paramRef, setParamRef] = useState("0.7 - 1.2");
  const [paramAbnormal, setParamAbnormal] = useState(true);

  // Form vitals entry state
  const [showAddVitalsForm, setShowAddVitalsForm] = useState(false);
  const [newBpSys, setNewBpSys] = useState(120);
  const [newBpDia, setNewBpDia] = useState(80);
  const [newPulse, setNewPulse] = useState(74);
  const [newTemp, setNewTemp] = useState(98.6);
  const [newSpo2, setNewSpo2] = useState(98);
  const [newRespRate, setNewRespRate] = useState(16);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const refreshLabOrders = () => {
    labService.getAllLabOrders().then((res) => {
      if (res.success && res.data.length > 0) {
        setLabOrders(res.data);
      } else {
        setLabOrders(getLabOrders());
      }
    });
    setVitalsList(getVitals());
  };

  useEffect(() => {
    refreshLabOrders();
    labService.getLabConfigurations().then((res) => {
      if (res.success && res.data.length > 0) {
        setDbTestConfigs(res.data);
      }
    });

    const interval = setInterval(refreshLabOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (subTab === "lab_verified" || subTab === "lab_reports") {
      setStatusFilter("Completed");
      setActiveView("list");
    } else if (subTab === "lab_orders") {
      setStatusFilter("Pending");
      setActiveView("list");
    }
  }, [subTab]);

  // Match active patient for the selected lab order
  const activePatient = patients.find(
    (p) =>
      p.id === selectedOrder?.patientId ||
      p.name.toLowerCase() === selectedOrder?.patientName.toLowerCase()
  ) || {
    id: selectedOrder?.patientId || "PAT-1092",
    uhid: "HMS-2026-9812",
    name: selectedOrder?.patientName || "Patient",
    age: 45,
    gender: "Male" as const,
    bloodGroup: "O+",
    phone: "+91 98765 43210",
    email: "patient@hms-hospital.org",
    address: "742 Evergreen Terrace, Sector 4",
    emergencyContact: {
      name: "Mary Smith",
      relationship: "Spouse",
      phone: "+91 99811 22334",
    },
    allergies: ["Penicillin", "NSAIDs"],
    chronicConditions: ["Hypertension", "Type 2 Diabetes"],
    registeredDate: "2026-01-15",
    status: "Outpatient" as const,
  };

  // Find latest recorded vitals for this active patient
  const patientVitals = vitalsList.find(
    (v) => v.patientId === activePatient.id || v.patientId === selectedOrder?.patientId
  ) || {
    id: "V-999",
    patientId: activePatient.id,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    bpSystolic: 124,
    bpDiastolic: 82,
    pulseRate: 76,
    temperature: 98.6,
    spO2: 99,
    respiratoryRate: 16,
    bloodSugar: 110,
    recordedBy: "Triage Nurse",
  };

  // Metrics Calculations
  const totalOrdersCount = labOrders.length;
  const pendingCount = labOrders.filter((o) => o.status === "Pending").length;
  const inProgressCount = labOrders.filter(
    (o) => o.status === "In Analysis" || (o.status as any) === "In Progress"
  ).length;
  const completedCount = labOrders.filter(
    (o) => o.status === "Verified" || (o.status as any) === "Completed"
  ).length;

  // Filtered Orders List (Defaults to "Pending")
  const filteredOrders = labOrders.filter((ord) => {
    const matchesSearch =
      ord.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.doctorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      ord.status === statusFilter ||
      (statusFilter === "In Progress" &&
        (ord.status === "In Analysis" || (ord.status as any) === "In Progress")) ||
      (statusFilter === "Completed" &&
        (ord.status === "Verified" || (ord.status as any) === "Completed")) ||
      (statusFilter === "In Analysis" &&
        (ord.status === "In Analysis" || (ord.status as any) === "In Progress")) ||
      (statusFilter === "Verified" &&
        (ord.status === "Verified" || (ord.status as any) === "Completed"));

    const matchesCategory =
      categoryFilter === "ALL" || ord.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handlePatientClick = (ord: LabOrder) => {
    setSelectedOrder(ord);
    setActiveView("detail");
  };

  const handleCreateNewLabOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const patName = newPatientName.trim() || "John Doe";

    const newOrder: LabOrder = {
      id: `LAB-${Math.floor(9000 + Math.random() * 1000)}`,
      patientId: newPatientId || `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: patName,
      doctorId: "U-101",
      doctorName: newDoctorName,
      testName: newTestName,
      category: newCategory,
      orderedDate: new Date().toISOString(),
      sampleType: newSampleType,
      status: "Pending",
      cost: newCost,
      notes: `Order created in Lab Portal by Staff`,
    };

    addLabOrderStorage(newOrder);
    const updatedList = getLabOrders();
    setLabOrders(updatedList);
    setSelectedOrder(newOrder);
    setShowNewOrderModal(false);

    addSystemNotification({
      title: "New Lab Order Dispatched",
      message: `${newTestName} ordered for patient ${patName} (${newCategory})`,
      category: "lab",
      priority: "high",
    });

    showToast(`Dispatched Lab Order #${newOrder.id} for ${patName}!`);
  };

  const handleAddParam = () => {
    if (!selectedOrder) return;
    const currentResults = selectedOrder.results || [];
    const newRes: LabParameterResult = {
      parameterName: paramName,
      value: paramVal,
      unit: paramUnit,
      referenceRange: paramRef,
      isAbnormal: paramAbnormal,
    };

    const updatedOrder: LabOrder = {
      ...selectedOrder,
      results: [...currentResults, newRes],
      status: "In Analysis",
    };

    const updatedList = labOrders.map((o) =>
      o.id === updatedOrder.id ? updatedOrder : o
    );
    saveLabOrders(updatedList);
    setLabOrders(updatedList);
    setSelectedOrder(updatedOrder);

    if (paramAbnormal) {
      addSystemNotification({
        title: "Critical Lab Result Alert ⚠️",
        message: `Abnormal lab value flagged for ${selectedOrder.patientName}: ${paramName} = ${paramVal} ${paramUnit} (Ref: ${paramRef})`,
        category: "lab",
        priority: "high",
      });
    }

    showToast(`Added test parameter: ${paramName}`);
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const newVit: Vitals = {
      id: `VIT-${Date.now()}`,
      patientId: activePatient.id,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      bpSystolic: Number(newBpSys),
      bpDiastolic: Number(newBpDia),
      pulseRate: Number(newPulse),
      temperature: Number(newTemp),
      spO2: Number(newSpo2),
      respiratoryRate: Number(newRespRate),
      recordedBy: "Lab Technician",
    };
    addVitals(newVit);
    setVitalsList(getVitals());
    setShowAddVitalsForm(false);
    showToast(`Updated Vitals recorded for ${activePatient.name}`);
  };

  const handleVerifyOrder = () => {
    if (!selectedOrder) return;
    const updatedOrder: LabOrder = {
      ...selectedOrder,
      status: "Verified",
      verifiedBy: "Dr. Marcus Thorne (Lab Lead)",
    };

    const updatedList = labOrders.map((o) =>
      o.id === updatedOrder.id ? updatedOrder : o
    );
    saveLabOrders(updatedList);
    setLabOrders(updatedList);
    setSelectedOrder(updatedOrder);

    // Send completed notification to Admin Dashboard & System Notification Center
    addSystemNotification({
      title: "Lab Report Completed & Verified",
      message: `Official lab report for patient ${selectedOrder.patientName} (${selectedOrder.testName}) completed & verified by Dr. Marcus Thorne. Sent to Admin Dashboard!`,
      category: "lab",
      priority: "medium",
    });

    showToast(`Verified & Completed Lab Order #${updatedOrder.id}! Notification sent to Admin.`);
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-950 text-slate-100 space-y-4 max-w-7xl mx-auto w-full">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white flex items-center gap-2 flex-wrap">
              Clinical Laboratory Portal
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                PATHOLOGY & RADIOLOGY
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {activeView === "list"
                ? "Pending Patient Tasks Queue"
                : `Patient Vitals & Lab Telemetry — ${activePatient.name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Scan className="w-4 h-4 text-purple-400" />
            <span>Scan Specimen</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders Card */}
        <button
          onClick={() => {
            setStatusFilter("ALL");
            setActiveView("list");
          }}
          className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] overflow-hidden ${
            statusFilter === "ALL" && activeView === "list"
              ? "bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-full">
            <span className="inline-block px-3 py-1 rounded-xl text-xs font-extrabold bg-slate-800 text-slate-300 border border-slate-700 max-w-full">
              Total Orders
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white font-mono mt-3 block">
            {totalOrdersCount}
          </span>
        </button>

        {/* Pending Card */}
        <button
          onClick={() => {
            setStatusFilter("Pending");
            setActiveView("list");
          }}
          className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] overflow-hidden ${
            statusFilter === "Pending" && activeView === "list"
              ? "bg-purple-900/40 border-purple-500 ring-2 ring-purple-500/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-full">
            <span className="inline-block px-3 py-1 rounded-xl text-xs font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 max-w-full">
              Pending
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono mt-3 block">
            {pendingCount}
          </span>
        </button>

        {/* In Progress Card */}
        <button
          onClick={() => {
            setStatusFilter("In Progress");
            setActiveView("list");
          }}
          className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] overflow-hidden ${
            (statusFilter === "In Progress" || statusFilter === "In Analysis") &&
            activeView === "list"
              ? "bg-amber-900/40 border-amber-500 ring-2 ring-amber-500/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-full">
            <span className="inline-block px-3 py-1 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 max-w-full">
              In Progress
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-3 block">
            {inProgressCount}
          </span>
        </button>

        {/* Completed Card */}
        <button
          onClick={() => {
            setStatusFilter("Completed");
            setActiveView("list");
          }}
          className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] overflow-hidden ${
            (statusFilter === "Completed" || statusFilter === "Verified") &&
            activeView === "list"
              ? "bg-emerald-900/40 border-emerald-500 ring-2 ring-emerald-500/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="w-full">
            <span className="inline-block px-3 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 max-w-full">
              Completed
            </span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-3 block">
            {completedCount}
          </span>
        </button>
      </div>

      {/* View Switcher: List vs Detail */}
      {activeView === "list" ? (
        <LabOrdersQueue
          filteredOrders={filteredOrders}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          onSelectOrder={handlePatientClick}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-5 flex flex-col space-y-4 w-full">
          {selectedOrder ? (
            <>
              <LabPatientTelemetry
                patient={activePatient}
                order={selectedOrder}
                vitals={patientVitals}
                showAddVitalsForm={showAddVitalsForm}
                setShowAddVitalsForm={setShowAddVitalsForm}
                newBpSys={newBpSys}
                setNewBpSys={setNewBpSys}
                newBpDia={newBpDia}
                setNewBpDia={setNewBpDia}
                newPulse={newPulse}
                setNewPulse={setNewPulse}
                newTemp={newTemp}
                setNewTemp={setNewTemp}
                newSpo2={newSpo2}
                setNewSpo2={setNewSpo2}
                newRespRate={newRespRate}
                setNewRespRate={setNewRespRate}
                onSaveVitals={handleSaveVitals}
                onBackToList={() => setActiveView("list")}
                onOpenPrint={onOpenPrint}
              />

              <LabResultsEntry
                order={selectedOrder}
                paramName={paramName}
                setParamName={setParamName}
                paramVal={paramVal}
                setParamVal={setParamVal}
                paramUnit={paramUnit}
                setParamUnit={setParamUnit}
                paramRef={paramRef}
                setParamRef={setParamRef}
                paramAbnormal={paramAbnormal}
                setParamAbnormal={setParamAbnormal}
                onAddParam={handleAddParam}
                onVerifyOrder={handleVerifyOrder}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16">
              <FlaskConical className="w-12 h-12 mb-2 text-slate-700" />
              <p className="text-xs">
                Select a patient on the list page to review vitals and enter test values
              </p>
            </div>
          )}
        </div>
      )}

      {/* New Lab Order Modal */}
      <LabNewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        patients={patients}
        dbTestConfigs={dbTestConfigs}
        newPatientId={newPatientId}
        setNewPatientId={setNewPatientId}
        newPatientName={newPatientName}
        setNewPatientName={setNewPatientName}
        newTestName={newTestName}
        setNewTestName={setNewTestName}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newDoctorName={newDoctorName}
        setNewDoctorName={setNewDoctorName}
        newSampleType={newSampleType}
        setNewSampleType={setNewSampleType}
        newCost={newCost}
        setNewCost={setNewCost}
        onSubmit={handleCreateNewLabOrder}
      />
    </div>
  );
};
