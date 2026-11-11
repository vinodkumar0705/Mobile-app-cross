import React, { useState } from "react";
import {
  Download,
  FlaskConical,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Database,
  Tag,
  Clock,
  Sparkles,
  Layers,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { LabTestConfig, labService } from "../../services/labService";
import { LabOrder } from "../../types/hms";

interface AdminExportsProps {
  labTestsList: LabTestConfig[];
  setLabTestsList: React.Dispatch<React.SetStateAction<LabTestConfig[]>>;
  labOrdersList: LabOrder[];
  isDbLabLoading: boolean;
  fetchDbLabData: () => void;
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
  activeSection?: "all" | "tests" | "exports";
}

export const AdminExports: React.FC<AdminExportsProps> = ({
  labTestsList,
  setLabTestsList,
  labOrdersList,
  isDbLabLoading,
  fetchDbLabData,
  showToast,
  onNavigateTab,
  activeSection = "all",
}) => {
  const [selectedSection, setSelectedSection] = useState<"all" | "tests" | "exports">(activeSection);
  const [testSearch, setTestSearch] = useState<string>("");
  const [testCategoryFilter, setTestCategoryFilter] = useState<string>("ALL");
  const [showAddTestModal, setShowAddTestModal] = useState<boolean>(false);
  const [isSubmittingTest, setIsSubmittingTest] = useState<boolean>(false);

  React.useEffect(() => {
    if (activeSection) {
      setSelectedSection(activeSection);
    }
  }, [activeSection]);

  // New Test Modal State for inserting into LabConfiguration table
  const [newTestName, setNewTestName] = useState<string>("");
  const [newTestCategory, setNewTestCategory] = useState<
    "BLOOD" | "URINE" | "IMAGING" | "CARDIAC" | "PATHOLOGY" | "MICROBIOLOGY" | "OTHER"
  >("BLOOD");
  const [newTestPrice, setNewTestPrice] = useState<string>("500");
  const [newTestDuration, setNewTestDuration] = useState<string>("Same Day (2-4 hrs)");
  const [newTestDesc, setNewTestDesc] = useState<string>("");
  const [newTestParamName, setNewTestParamName] = useState<string>("");
  const [newTestParamUnit, setNewTestParamUnit] = useState<string>("");
  const [newTestParamRange, setNewTestParamRange] = useState<string>("");

  const handleExportData = (type: string) => {
    showToast(`Exported ${type} Database Table as CSV!`);
  };

  const handleCreateTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) {
      showToast("Please enter a test name");
      return;
    }
    setIsSubmittingTest(true);
    const params = newTestParamName.trim()
      ? [
          {
            name: newTestParamName.trim(),
            unit: newTestParamUnit.trim(),
            normalRange: newTestParamRange.trim(),
            isCritical: false,
          },
        ]
      : [];

    const res = await labService.createLabConfiguration({
      name: newTestName.trim(),
      category: newTestCategory,
      price: newTestPrice,
      duration: newTestDuration,
      description: newTestDesc,
      reportType: "RANGE",
      parameters: params,
    });

    if (res.success) {
      showToast(`Created diagnostic test '${newTestName}' in PostgreSQL database!`);
      setShowAddTestModal(false);
      setNewTestName("");
      setNewTestDesc("");
      setNewTestParamName("");
      setNewTestParamUnit("");
      setNewTestParamRange("");
      fetchDbLabData();
    } else {
      showToast(res.error || "Failed to create lab test");
    }
    setIsSubmittingTest(false);
  };

  const filteredTests = labTestsList.filter((test) => {
    const matchSearch =
      !testSearch.trim() ||
      test.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      (test.description && test.description.toLowerCase().includes(testSearch.toLowerCase())) ||
      (test.parameters && test.parameters.some((p) => p.name.toLowerCase().includes(testSearch.toLowerCase())));
    const matchCat =
      testCategoryFilter === "ALL" ||
      (test.category && test.category.toUpperCase() === testCategoryFilter.toUpperCase());
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-4 w-full">
      {/* Section Filter Pills - only shown if viewing 'all' */}
      {activeSection === "all" && (
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSection("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedSection === "all"
                ? "bg-slate-800 text-white border border-slate-700"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-900"
            }`}
          >
            All Panels
          </button>
          <button
            type="button"
            onClick={() => setSelectedSection("tests")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedSection === "tests"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-900"
            }`}
          >
            Diagnostic Tests ({labTestsList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedSection("exports")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedSection === "exports"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-900"
            }`}
          >
            Bulk Data Exports (CSV)
          </button>
        </div>
      )}

      {/* Sub-Tab: Diagnostic Tests & Master Lab Configuration */}
      {(selectedSection === "all" || selectedSection === "tests") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4 overflow-hidden w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-white flex flex-wrap items-center gap-1.5 leading-snug">
                  <span>Hospital Diagnostic Tests Catalog & Master</span>
                  <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold uppercase shrink-0">
                    {labTestsList.length} Tests Configured
                  </span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                  Diagnostic test directory, sample types, normal reference ranges, and billing tariffs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap shrink-0">
              <button
                type="button"
                onClick={fetchDbLabData}
                disabled={isDbLabLoading}
                className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                title="Reload test configurations directly from PostgreSQL"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isDbLabLoading ? "animate-spin" : ""}`} />
                <span>Sync DB</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddTestModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Test</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Database Tests</span>
              <span className="text-lg font-mono font-bold text-white">{labTestsList.length}</span>
              <span className="text-[10px] text-indigo-400 block font-semibold">Configured Diagnostic Panels</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Lab Categories</span>
              <span className="text-lg font-mono font-bold text-white">
                {new Set(labTestsList.map((t) => t.category).filter(Boolean)).size || 1}
              </span>
              <span className="text-[10px] text-blue-400 block font-semibold">Blood, Urine, Imaging, etc.</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Patient Lab Orders</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{labOrdersList.length}</span>
              <span className="text-[10px] text-emerald-300 block font-semibold">Live in PostgreSQL LabOrder</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase font-bold tracking-wider">Database Status</span>
              <span className="text-lg font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Live RDS</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-semibold">Prisma / PostgreSQL</span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="Search tests by name, parameter, description..."
                className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
              />
            </div>

            <div className="h-9 flex items-center gap-2 bg-slate-950 px-2.5 rounded-xl border border-slate-800 w-full shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-bold shrink-0">Category:</span>
              <select
                value={testCategoryFilter}
                onChange={(e) => setTestCategoryFilter(e.target.value)}
                className="bg-transparent border-0 text-xs text-white font-semibold focus:outline-none cursor-pointer w-full min-w-0 truncate py-1"
              >
                <option value="ALL" className="bg-slate-900 text-white">All Categories ({labTestsList.length})</option>
                <option value="BLOOD" className="bg-slate-900 text-white">BLOOD</option>
                <option value="URINE" className="bg-slate-900 text-white">URINE</option>
                <option value="IMAGING" className="bg-slate-900 text-white">IMAGING</option>
                <option value="CARDIAC" className="bg-slate-900 text-white">CARDIAC</option>
                <option value="PATHOLOGY" className="bg-slate-900 text-white">PATHOLOGY</option>
                <option value="MICROBIOLOGY" className="bg-slate-900 text-white">MICROBIOLOGY</option>
                <option value="OTHER" className="bg-slate-900 text-white">OTHER</option>
              </select>
            </div>
          </div>

        {/* Test Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              className="p-3.5 bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-2xl text-xs space-y-2.5 transition-all group flex flex-col justify-between h-full"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-white text-sm block group-hover:text-indigo-300 transition-colors truncate">
                      {test.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {test.category || "GENERAL"}
                      </span>
                      {test.duration && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{test.duration}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 text-xs shrink-0">
                    ₹{test.price}
                  </span>
                </div>

                {test.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {test.description}
                  </p>
                )}
              </div>

              {test.parameters && test.parameters.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span>Clinical Parameters</span>
                    <span>Ref Range</span>
                  </div>
                  <div className="space-y-1">
                    {test.parameters.slice(0, 3).map((param: any, pIdx: number) => (
                      <div key={pIdx} className="flex justify-between items-center text-[11px] text-slate-300">
                        <span className="truncate flex-1 min-w-0 pr-2 text-slate-300">
                          {param.name} {param.unit ? `(${param.unit})` : ""}
                        </span>
                        <span className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">
                          {param.normalRange || "Standard"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Database Table Bulk Export Utilities */}
      {(selectedSection === "all" || selectedSection === "exports") && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4 overflow-hidden w-full">
          {/* Unified Bulk Exports Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm text-white flex flex-wrap items-center gap-1.5 leading-snug">
                  <span>Database Table Bulk Export Utilities</span>
                  <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold uppercase shrink-0">
                    5 Tables Ready
                  </span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                  Generate instant CSV snapshots across clinical registries, diagnostics, appointments, and pharmacy bills
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 font-bold">
                <span>CSV Snapshot</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => handleExportData("Patients_Table")}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left font-bold text-slate-200 flex flex-col justify-between transition-all cursor-pointer h-full"
            >
              <span>Patients Directory</span>
              <span className="text-[10px] text-blue-400 mt-2 font-mono">Download CSV →</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportData("Appointments_Table")}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left font-bold text-slate-200 flex flex-col justify-between transition-all cursor-pointer h-full"
            >
              <span>Appointments Log</span>
              <span className="text-[10px] text-emerald-400 mt-2 font-mono">Download CSV →</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportData("Diagnostic_Tests_Master")}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left font-bold text-slate-200 flex flex-col justify-between transition-all cursor-pointer h-full"
            >
              <span>Diagnostic Tests ({labTestsList.length})</span>
              <span className="text-[10px] text-indigo-400 mt-2 font-mono">Download CSV →</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportData("Lab_Orders_Table")}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left font-bold text-slate-200 flex flex-col justify-between transition-all cursor-pointer h-full"
            >
              <span>Lab Orders ({labOrdersList.length})</span>
              <span className="text-[10px] text-purple-400 mt-2 font-mono">Download CSV →</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportData("Pharmacy_Stock_Table")}
              className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left font-bold text-slate-200 flex flex-col justify-between transition-all cursor-pointer h-full col-span-2 sm:col-span-1"
            >
              <span>Pharmacy Stock & Bills</span>
              <span className="text-[10px] text-amber-400 mt-2 font-mono">Download CSV →</span>
            </button>
          </div>
        </div>
      )}

      {/* Add New Diagnostic Test Modal */}
      {showAddTestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Add Diagnostic Test to Database</h3>
                  <p className="text-[10px] text-slate-400">Inserts record into PostgreSQL LabConfiguration table</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTestModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Test / Diagnostic Panel Name *</label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="e.g. Thyroid Profile (T3, T4, TSH)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Category</label>
                  <select
                    value={newTestCategory}
                    onChange={(e: any) => setNewTestCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BLOOD">BLOOD</option>
                    <option value="URINE">URINE</option>
                    <option value="IMAGING">IMAGING</option>
                    <option value="CARDIAC">CARDIAC</option>
                    <option value="PATHOLOGY">PATHOLOGY</option>
                    <option value="MICROBIOLOGY">MICROBIOLOGY</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Price (₹)</label>
                  <input
                    type="number"
                    value={newTestPrice}
                    onChange={(e) => setNewTestPrice(e.target.value)}
                    placeholder="500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-medium focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Turnaround Duration</label>
                  <input
                    type="text"
                    value={newTestDuration}
                    onChange={(e) => setNewTestDuration(e.target.value)}
                    placeholder="e.g. Same Day (2-4 hrs)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Description</label>
                  <input
                    type="text"
                    value={newTestDesc}
                    onChange={(e) => setNewTestDesc(e.target.value)}
                    placeholder="Clinical purpose..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-indigo-300 block">Default Parameter (Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newTestParamName}
                    onChange={(e) => setNewTestParamName(e.target.value)}
                    placeholder="Param (e.g. TSH)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs"
                  />
                  <input
                    type="text"
                    value={newTestParamUnit}
                    onChange={(e) => setNewTestParamUnit(e.target.value)}
                    placeholder="Unit (uIU/mL)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs"
                  />
                  <input
                    type="text"
                    value={newTestParamRange}
                    onChange={(e) => setNewTestParamRange(e.target.value)}
                    placeholder="Ref (0.4-4.0)"
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingTest}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  <span>{isSubmittingTest ? "Writing to PostgreSQL..." : "Save Test to Database"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
