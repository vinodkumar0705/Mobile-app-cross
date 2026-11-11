import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Shield,
  Stethoscope,
  X,
  UserPlus,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import { StaffEmployee, staffService } from "../../services/staffService";

interface AdminStaffProps {
  staffList: StaffEmployee[];
  setStaffList: React.Dispatch<React.SetStateAction<StaffEmployee[]>>;
  allCombinedStaff: any[];
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminStaff: React.FC<AdminStaffProps> = ({
  staffList,
  setStaffList,
  allCombinedStaff,
  showToast,
  onNavigateTab,
}) => {
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>("ALL");
  const [staffSearch, setStaffSearch] = useState<string>("");
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState<boolean>(false);

  // New Staff form state
  const [newName, setNewName] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("Doctor");
  const [newDepartment, setNewDepartment] = useState<string>("General Medicine");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newShift, setNewShift] = useState<string>("Morning (08:00 - 16:00)");

  const filteredStaffList = allCombinedStaff.filter((stf: any) => {
    const roleStr = `${stf.role || ""} ${stf.designation || ""} ${stf.department || ""} ${stf.name || ""}`.toLowerCase();
    
    // Role filter
    let matchesRole = true;
    if (staffRoleFilter === "doctor") {
      matchesRole =
        stf.isDoctor ||
        roleStr.includes("doc") ||
        roleStr.includes("dr.") ||
        roleStr.includes("physician") ||
        roleStr.includes("surgeon") ||
        stf.name?.toLowerCase().startsWith("dr.");
    } else if (staffRoleFilter === "admin") {
      matchesRole =
        stf.isAdmin ||
        roleStr.includes("admin") ||
        roleStr.includes("exec") ||
        roleStr.includes("manager") ||
        roleStr.includes("super");
    } else if (staffRoleFilter === "lab") {
      matchesRole =
        roleStr.includes("lab") ||
        roleStr.includes("patholog") ||
        roleStr.includes("microbio") ||
        roleStr.includes("tech");
    } else if (staffRoleFilter === "pharmacist") {
      matchesRole =
        roleStr.includes("pharm") ||
        roleStr.includes("chemist") ||
        roleStr.includes("drug");
    }

    // Search filter
    const query = staffSearch.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (stf.name && stf.name.toLowerCase().includes(query)) ||
      (stf.department && stf.department.toLowerCase().includes(query)) ||
      (stf.role && stf.role.toLowerCase().includes(query)) ||
      (stf.email && stf.email.toLowerCase().includes(query)) ||
      (stf.phone && stf.phone.includes(query));

    return matchesRole && matchesSearch;
  });

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast("Please enter staff full name");
      return;
    }

    setIsSubmittingStaff(true);
    const newStaffMember: Partial<StaffEmployee> = {
      name: newName.trim(),
      role: newRole,
      department: newDepartment,
      email: newEmail.trim() || `${newName.toLowerCase().replace(/[^a-z]/g, "")}@hms-hospital.org`,
      phone: newPhone.trim() || "+91 9876543210",
      status: "Active",
      shift: newShift,
    };

    const res = await staffService.createEmployee(newStaffMember);
    if (res.success && res.data) {
      setStaffList((prev) => [res.data!, ...prev]);
    } else {
      // Local fallback
      const fallbackStaff: StaffEmployee = {
        id: `EMP-${Math.floor(200 + Math.random() * 800)}`,
        name: newStaffMember.name!,
        role: newStaffMember.role!,
        department: newStaffMember.department!,
        email: newStaffMember.email!,
        phone: newStaffMember.phone!,
        status: "Active",
        shift: newStaffMember.shift!,
      };
      setStaffList((prev) => [fallbackStaff, ...prev]);
    }

    showToast(`Added ${newName} to Hospital Staff Registry!`);
    setIsSubmittingStaff(false);
    setShowAddStaffModal(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
  };

  return (
    <div className="space-y-4 w-full">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4 overflow-hidden w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-white flex flex-wrap items-center gap-1.5 leading-snug">
                <span>Hospital Staff & Medical Registry</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold uppercase shrink-0">
                  {filteredStaffList.length} Staff Members
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Doctors, nurses, lab specialists, pharmacists & administrative personnel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => setShowAddStaffModal(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder="Search staff by name, department, role, or phone..."
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs"
            />
          </div>

          {/* Role Filter Dropdown */}
          <div className="h-9 flex items-center gap-2 bg-slate-950 px-2.5 rounded-xl border border-slate-800 w-full shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-bold shrink-0">Role:</span>
            <select
              value={staffRoleFilter}
              onChange={(e) => setStaffRoleFilter(e.target.value)}
              className="bg-transparent border-0 text-xs text-white font-semibold focus:outline-none cursor-pointer w-full min-w-0 truncate py-1"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Roles ({allCombinedStaff.length})</option>
              <option value="doctor" className="bg-slate-900 text-white">Doctors</option>
              <option value="admin" className="bg-slate-900 text-white">Admins</option>
              <option value="lab" className="bg-slate-900 text-white">Lab Specialists</option>
              <option value="pharmacist" className="bg-slate-900 text-white">Pharmacists</option>
            </select>
          </div>
        </div>

        {/* Staff List */}
        <div className="divide-y divide-slate-800/80 max-h-[480px] overflow-y-auto pr-1">
          {filteredStaffList.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-300">No staff members found matching the selected filter</p>
              <p className="text-[11px] text-slate-500">Try adjusting your search query or role filter above</p>
            </div>
          ) : (
            filteredStaffList.map((stf: any) => (
              <div
                key={stf.id || stf.employeeId || stf.name}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-800/50 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold flex items-center justify-center font-mono text-xs shrink-0">
                    {stf.name ? stf.name.charAt(0) : "E"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="truncate">{stf.name}</span>
                      {stf.isDoctor && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                          MD
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-blue-400 font-semibold">{stf.designation || stf.role}</span>
                      <span>•</span>
                      <span>{stf.department || "Hospital Ops"}</span>
                      {stf.shift && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400 font-mono text-[10px]">{stf.shift}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex sm:items-center items-start justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
                    <span className="font-mono text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                      {stf.opdRoomNumber || stf.employeeId || "Staff"}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-bold">
                      {stf.status || "Active"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add New Employee Modal */}
      {showAddStaffModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddStaffModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Add New Staff Member</h3>
                  <p className="text-[10px] text-slate-400">Enroll new medical or operational hospital staff</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="Doctor">Doctor</option>
                    <option value="Admin">Admin</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Lab Technician">Lab Technician</option>
                    <option value="Pharmacist">Pharmacist</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Department *</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="e.g. Cardiology"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="rajesh@hospital.org"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Shift Timing</label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="Morning (08:00 - 16:00)">Morning (08:00 - 16:00)</option>
                  <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                  <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                  <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingStaff}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmittingStaff ? "Enrolling..." : "Save Staff Member"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
