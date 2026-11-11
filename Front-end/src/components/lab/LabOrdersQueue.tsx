import React from "react";
import {
  Clock,
  Search,
  CheckCircle2,
  User,
  ChevronRight,
  Filter,
} from "lucide-react";
import { LabOrder } from "../../types/hms";

interface LabOrdersQueueProps {
  filteredOrders: LabOrder[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  onSelectOrder: (order: LabOrder) => void;
}

export const LabOrdersQueue: React.FC<LabOrdersQueueProps> = ({
  filteredOrders,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  onSelectOrder,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col space-y-4 w-full shadow-xl">
      {/* Header & Filter Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          <h3 className="font-extrabold text-sm sm:text-base text-white">
            {statusFilter === "Pending" ? "Pending Patient Tasks Queue" : `${statusFilter} Orders List`}
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
          {filteredOrders.length} Patients Found
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patient name, UHID, diagnostic test, or doctor..."
          className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-medium"
        />
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 scrollbar-none">
        {[
          { id: "Pending", label: "Pending" },
          { id: "In Progress", label: "In Progress" },
          { id: "Completed", label: "Completed" },
          { id: "ALL", label: "All Orders" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === tab.id ||
              (tab.id === "In Progress" && statusFilter === "In Analysis") ||
              (tab.id === "Completed" && statusFilter === "Verified")
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Department Category Badges */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 scrollbar-none">
        {["ALL", "Biochemistry", "Hematology", "Radiology", "Microbiology", "Pathology"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition-all shrink-0 cursor-pointer text-[11px] ${
              categoryFilter === cat
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800/60"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Patient Task Cards List */}
      <div className="space-y-3 pt-1">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs space-y-2 bg-slate-950/60 rounded-3xl border border-slate-800/60 p-6">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/40" />
            <p className="font-extrabold text-sm text-slate-300">No matching tasks in queue!</p>
            <p className="text-xs text-slate-500">All tests matching this filter have been completed or verified.</p>
          </div>
        ) : (
          filteredOrders.map((ord) => (
            <div
              key={ord.id}
              onClick={() => onSelectOrder(ord)}
              className="bg-slate-950 border border-slate-800 hover:border-purple-500/60 p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-slate-900/80 shadow-md group space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-300 flex items-center justify-center font-bold text-sm border border-purple-500/30 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-base group-hover:text-purple-300 transition-colors flex items-center gap-2 truncate">
                      {ord.patientName}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono truncate">Patient ID: {ord.patientId} • Order #{ord.id}</p>
                  </div>
                </div>

                <span
                  className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-extrabold shrink-0 ${
                    ord.status === "Verified" || (ord.status as any) === "Completed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : ord.status === "In Analysis" || (ord.status as any) === "In Progress"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  }`}
                >
                  {ord.status === "Verified"
                    ? "Completed"
                    : ord.status === "In Analysis"
                    ? "In Progress"
                    : ord.status}
                </span>
              </div>

              <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-wider block">
                    {ord.category} Diagnostic Test
                  </span>
                  <p className="font-bold text-white text-sm mt-0.5 truncate">{ord.testName}</p>
                  <p className="text-slate-400 text-xs mt-0.5 truncate">Doctor: <strong className="text-slate-200">{ord.doctorName}</strong></p>
                </div>

                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer shrink-0"
                >
                  <span>View Patient Vitals & Results</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
