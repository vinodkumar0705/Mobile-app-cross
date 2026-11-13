import React, { useState } from "react";
import {
  BedDouble,
  UserPlus,
  Plus,
  LogOut,
  DoorOpen,
  X,
  Search,
} from "lucide-react";
import { Room, Admission, Patient } from "../../types/hms";
import { admitPatientStorage, saveAdmissions, savePatients, addSystemNotification } from "../../lib/storage";

interface AdminWardsProps {
  roomsList: Room[];
  setRoomsList: React.Dispatch<React.SetStateAction<Room[]>>;
  admissionsList: Admission[];
  setAdmissionsList: React.Dispatch<React.SetStateAction<Admission[]>>;
  patientsList: Patient[];
  setPatientsList: React.Dispatch<React.SetStateAction<Patient[]>>;
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminWards: React.FC<AdminWardsProps> = ({
  roomsList,
  setRoomsList,
  admissionsList,
  setAdmissionsList,
  patientsList,
  setPatientsList,
  showToast,
  onNavigateTab,
}) => {
  const [showAdmitModal, setShowAdmitModal] = useState<boolean>(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);

  // Allocate Bed form state
  const [admitPatientId, setAdmitPatientId] = useState<string>(patientsList[0]?.id || "");
  const [admitRoomId, setAdmitRoomId] = useState<string>(roomsList[0]?.id || "");
  const [admitBedNum, setAdmitBedNum] = useState<string>("Bed-01");
  const [admitDoctor, setAdmitDoctor] = useState<string>("Dr. Sarah Vance, MD");
  const [admitReason, setAdmitReason] = useState<string>(
    "Post-Op Cardiac Monitoring & Medication Titration"
  );

  // Add Room form state
  const [newRoomNumber, setNewRoomNumber] = useState<string>("405");
  const [newRoomType, setNewRoomType] = useState<Room["type"]>("Semi-Private");
  const [newRoomFloor, setNewRoomFloor] = useState<string>("Floor 4");
  const [newRoomWing, setNewRoomWing] = useState<string>("North Wing");
  const [newRoomRate, setNewRoomRate] = useState<number>(350);
  const [newRoomBeds, setNewRoomBeds] = useState<number>(2);

  const handleAllocateBedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patientsList.find((p) => p.id === admitPatientId);
    const rm = roomsList.find((r) => r.id === admitRoomId);
    if (!pat || !rm) {
      showToast("Please select a valid patient and room");
      return;
    }

    const newAdm: Admission = {
      id: `ADM-${Math.floor(8000 + Math.random() * 9000)}`,
      patientId: pat.id,
      patientName: pat.name,
      roomId: rm.id,
      roomNumber: rm.number,
      bedNumber: `${rm.number}-${admitBedNum}`,
      admittedDate: new Date().toISOString().split("T")[0],
      admittingDoctor: admitDoctor,
      reasonForAdmission: admitReason,
      status: "Admitted",
      cateringDietType: "Regular",
    };

    admitPatientStorage(newAdm);

    const updatedRooms = roomsList.map((r) =>
      r.id === rm.id ? { ...r, occupiedBeds: Math.min(r.totalBeds, r.occupiedBeds + 1) } : r
    );
    setRoomsList(updatedRooms);
    setAdmissionsList((prev) => [newAdm, ...prev]);

    setShowAdmitModal(false);
    showToast(`Successfully allocated Bed ${newAdm.bedNumber} in ${rm.type} to ${pat.name}!`);
  };

  const handleDischargeBed = (admId: string) => {
    const adm = admissionsList.find((a) => a.id === admId);
    if (!adm) return;

    const updatedAdmissions = admissionsList.map((a) =>
      a.id === admId
        ? { ...a, status: "Discharged" as const, dischargedDate: new Date().toISOString().split("T")[0] }
        : a
    );
    saveAdmissions(updatedAdmissions);
    setAdmissionsList(updatedAdmissions);

    const updatedRooms = roomsList.map((r) =>
      r.id === adm.roomId ? { ...r, occupiedBeds: Math.max(0, r.occupiedBeds - 1) } : r
    );
    setRoomsList(updatedRooms);

    const updatedPatients = patientsList.map((p) =>
      p.id === adm.patientId
        ? { ...p, status: "Discharged" as const, assignedRoom: undefined, assignedBed: undefined }
        : p
    );
    savePatients(updatedPatients);
    setPatientsList(updatedPatients);

    addSystemNotification({
      title: "Patient Discharged",
      message: `Patient ${adm.patientName} was discharged from Bed ${adm.bedNumber}`,
      category: "emergency",
      priority: "high",
    });

    showToast(`Discharged ${adm.patientName} & freed up Bed ${adm.bedNumber}!`);
  };

  const handleAddRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoom: Room = {
      id: `ROOM-${newRoomNumber}`,
      number: newRoomNumber,
      type: newRoomType,
      floor: newRoomFloor,
      wing: newRoomWing,
      ratePerDay: newRoomRate,
      totalBeds: newRoomBeds,
      occupiedBeds: 0,
      amenities: ["Central Oxygen", "IV Pole", "Nurse Call Button", "Electric Bed Controls"],
    };

    setRoomsList((prev) => [...prev, newRoom]);
    setShowAddRoomModal(false);
    showToast(`Created Ward / Room ${newRoom.number} (${newRoom.type}) with ${newRoom.totalBeds} Beds!`);
  };

  const activeAdmissions = admissionsList.filter((a) => a.status === "Admitted");

  return (
    <div className="space-y-4 w-full">
      {/* Active Bed Allocation & Inpatient Admissions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4 overflow-hidden w-full">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 w-full">
          {/* Header Title Row */}
          <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                <BedDouble className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                  Ward & Bed Allocation Master
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                  Live IPD ward admissions & bed management
                </p>
              </div>
            </div>

            <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-bold uppercase shrink-0 whitespace-nowrap">
              {roomsList.length} Rooms
            </span>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowAdmitModal(true)}
              className="w-full px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Allocate Bed</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAddRoomModal(true)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Add Room</span>
            </button>
          </div>
        </div>

        {/* Ward Rooms List (Full Width for Clean Mobile Mode Layout) */}
        <div className="flex flex-col space-y-3 w-full">
          {roomsList.map((room) => {
            const availableBeds = Math.max(0, room.totalBeds - room.occupiedBeds);
            const occupancyPct = Math.min(100, (room.occupiedBeds / room.totalBeds) * 100);
            return (
              <div
                key={room.id}
                className="p-3.5 sm:p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs space-y-3 transition-all flex flex-col justify-between overflow-hidden shadow-sm w-full"
              >
                <div className="space-y-2.5 min-w-0 w-full">
                  {/* Room Type & Price Row */}
                  <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-white text-sm block truncate" title={`${room.type} (${room.number})`}>
                        {room.type} ({room.number})
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {room.floor} • {room.wing}
                      </span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 text-xs shrink-0 whitespace-nowrap">
                      ₹{room.ratePerDay}/day
                    </span>
                  </div>

                  {/* Bed Status Visual Progress */}
                  <div className="space-y-1 w-full">
                    <div className="flex justify-between text-xs text-slate-300 gap-1">
                      <span>Bed Occupancy</span>
                      <span className="font-mono font-bold text-purple-300 shrink-0 whitespace-nowrap">
                        {room.occupiedBeds} / {room.totalBeds} Beds
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Only Bed Availability Badge (Amenities text removed to prevent any layering) */}
                <div className="pt-2.5 border-t border-slate-800/80 w-full flex items-center justify-center">
                  <span
                    className={`w-full text-center font-bold py-1.5 px-3 rounded-xl text-xs whitespace-nowrap ${
                      availableBeds > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {availableBeds > 0 ? `${availableBeds} Available` : "Full / Occupied"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Currently Admitted Patients List */}
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
          <h4 className="font-bold text-xs text-white flex items-center justify-between">
            <span>Active Admitted Patients (IPD Ward List)</span>
            <span className="text-[10px] text-purple-400 font-mono">
              {activeAdmissions.length} Patients Currently Admitted
            </span>
          </h4>

          <div className="divide-y divide-slate-800/80 max-h-[260px] overflow-y-auto pr-1">
            {activeAdmissions.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                No active inpatient admissions. Use "Allocate Bed" above to assign a bed.
              </div>
            ) : (
              activeAdmissions.map((adm) => (
                <div
                  key={adm.id}
                  className="py-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:bg-slate-800/40 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold font-mono shrink-0">
                      {adm.bedNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-xs truncate">{adm.patientName}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Dr. {adm.admittingDoctor} • Reason: {adm.reasonForAdmission}
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDischargeBed(adm.id)}
                      className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Discharge & Free Bed</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: Allocate Bed to Patient */}
      {showAdmitModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowAdmitModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-purple-400" />
                <span>Allocate Bed / Inpatient Admission</span>
              </h3>
              <button
                onClick={() => setShowAdmitModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAllocateBedSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Select Patient *</label>
                <select
                  value={admitPatientId}
                  onChange={(e) => setAdmitPatientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-purple-500"
                  required
                >
                  {patientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.uhid}) - Status: {p.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Select Ward / Room *</label>
                  <select
                    value={admitRoomId}
                    onChange={(e) => setAdmitRoomId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-purple-500"
                    required
                  >
                    {roomsList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.type} ({r.number}) - ₹{r.ratePerDay}/day
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Bed Identifier *</label>
                  <input
                    type="text"
                    value={admitBedNum}
                    onChange={(e) => setAdmitBedNum(e.target.value)}
                    placeholder="Bed-01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Admitting Physician *</label>
                <input
                  type="text"
                  value={admitDoctor}
                  onChange={(e) => setAdmitDoctor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Reason for Admission *</label>
                <textarea
                  value={admitReason}
                  onChange={(e) => setAdmitReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all mt-2 cursor-pointer"
              >
                Confirm Admission & Assign Bed
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New Ward / Room */}
      {showAddRoomModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowAddRoomModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <DoorOpen className="w-4 h-4 text-emerald-400" />
                <span>Configure New Ward or Room</span>
              </h3>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRoomSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Room Number *</label>
                  <input
                    type="text"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Ward Category</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as Room["type"])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="General Ward">General Ward</option>
                    <option value="Semi-Private">Semi-Private</option>
                    <option value="Private Suite">Private Suite</option>
                    <option value="ICU">ICU</option>
                    <option value="NICU">NICU</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Floor Location *</label>
                  <input
                    type="text"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Wing Location *</label>
                  <input
                    type="text"
                    value={newRoomWing}
                    onChange={(e) => setNewRoomWing(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Daily Rate (₹) *</label>
                  <input
                    type="number"
                    value={newRoomRate}
                    onChange={(e) => setNewRoomRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Total Capacity (Beds) *</label>
                  <input
                    type="number"
                    value={newRoomBeds}
                    onChange={(e) => setNewRoomBeds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all mt-2 cursor-pointer"
              >
                Save Room & Add to Ward Master
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
