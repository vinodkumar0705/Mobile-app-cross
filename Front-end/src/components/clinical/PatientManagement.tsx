import React, { useState } from "react";
import {
  Users,
  Search,
  UserPlus,
  CalendarPlus,
  BedDouble,
  HeartPulse,
  Plus,
  X,
  CheckCircle2,
  ShieldCheck,
  Building2,
  ChevronRight,
} from "lucide-react";
import { Patient, Appointment, Room, Admission, Vitals } from "../../types/hms";
import {
  getPatients,
  addPatient,
  getAppointments,
  addAppointment,
  admitPatientStorage,
  getAdmissions,
  getVitals,
  addVitals,
  savePatients,
} from "../../lib/storage";
import { INITIAL_ROOMS, INITIAL_USERS, INITIAL_STAFF } from "../../lib/mockData";

interface PatientManagementProps {
  subTab: string;
  onOpenPrint: () => void;
}

export const PatientManagement: React.FC<PatientManagementProps> = ({
  subTab,
  onOpenPrint,
}) => {
  const [patients, setPatients] = useState<Patient[]>(getPatients());
  const [appointments, setAppointments] = useState<Appointment[]>(getAppointments());
  const [admissions, setAdmissions] = useState<Admission[]>(getAdmissions());
  const [vitals, setVitalsList] = useState<Vitals[]>(getVitals());

  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals state
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);
  const [showBookAptModal, setShowBookAptModal] = useState<boolean>(false);
  const [showAdmitModal, setShowAdmitModal] = useState<boolean>(false);
  const [selectedPatientForAction, setSelectedPatientForAction] = useState<Patient | null>(null);

  // New Patient Form
  const [pName, setPName] = useState("");
  const [pAge, setPAge] = useState(35);
  const [pGender, setPGender] = useState<"Male" | "Female" | "Other">("Male");
  const [pPhone, setPPhone] = useState("+1 (555) ");
  const [pBlood, setPBlood] = useState("O+");

  // Book Apt Form
  const [aptType, setAptType] = useState<"OPD Regular" | "Follow-up" | "Emergency">("OPD Regular");
  const [aptFee, setAptFee] = useState(75);
  const [aptComplaint, setAptComplaint] = useState("General Health Assessment");

  // Admit Form
  const [selectedRoom, setSelectedRoom] = useState<Room>(INITIAL_ROOMS[0]);
  const [selectedBed, setSelectedBed] = useState<string>("301-B");
  const [admitReason, setAdmitReason] = useState("Observation and IV Anti-infective therapy");

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;

    const newPat: Patient = {
      id: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      uhid: `HMS-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      name: pName,
      age: pAge,
      gender: pGender,
      bloodGroup: pBlood,
      phone: pPhone,
      email: `${pName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      address: "Springfield, IL",
      emergencyContact: { name: "Family Member", relationship: "Relative", phone: pPhone },
      allergies: ["None Reported"],
      chronicConditions: ["Routine Screening"],
      registeredDate: new Date().toISOString().split("T")[0],
      status: "Outpatient",
      assignedDoctor: "Dr. Sarah Vance, MD",
    };

    addPatient(newPat);
    setPatients(getPatients());
    setShowNewPatientModal(false);
    showToast(`Registered Patient: ${newPat.name} (${newPat.uhid})`);
  };

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("U-101");

  const doctorsList = INITIAL_USERS.filter((s) => s.role === "doctor");

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForAction) return;

    const chosenDoctor = INITIAL_USERS.find((u) => u.id === selectedDoctorId) || INITIAL_USERS[0];

    const newApt: Appointment = {
      id: `APT-${Math.floor(4000 + Math.random() * 9000)}`,
      tokenNumber: appointments.length + 1,
      patientId: selectedPatientForAction.id,
      patientName: selectedPatientForAction.name,
      patientPhone: selectedPatientForAction.phone,
      doctorId: chosenDoctor.id,
      doctorName: chosenDoctor.name,
      department: chosenDoctor.department || "Cardiology / OPD",
      date: new Date().toISOString().split("T")[0],
      timeSlot: "11:30 AM",
      type: aptType,
      status: "Scheduled",
      chiefComplaint: aptComplaint,
      consultationFee: aptFee,
      paymentStatus: "Paid",
    };

    addAppointment(newApt);
    setAppointments(getAppointments());
    setShowBookAptModal(false);
    showToast(`Booked Token #${newApt.tokenNumber} for ${selectedPatientForAction.name} with ${chosenDoctor.name}`);
  };

  const handleAdmitPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientForAction) return;

    const newAdmission: Admission = {
      id: `ADM-${Math.floor(8000 + Math.random() * 9000)}`,
      patientId: selectedPatientForAction.id,
      patientName: selectedPatientForAction.name,
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.number,
      bedNumber: selectedBed,
      admittedDate: new Date().toISOString(),
      admittingDoctor: "Dr. Sarah Vance, MD",
      reasonForAdmission: admitReason,
      status: "Admitted",
      cateringDietType: "Diabetic Low Sodium",
    };

    admitPatientStorage(newAdmission);
    setPatients(getPatients());
    setAdmissions(getAdmissions());
    setShowAdmitModal(false);
    showToast(`Admitted ${selectedPatientForAction.name} to ${selectedRoom.type} Bed ${selectedBed}`);
  };

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 bg-slate-950 text-slate-100 space-y-4">
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-xl font-medium text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">
              Patient Registry & Clinical Admissions
            </h2>
            <p className="text-[11px] text-slate-400">
              Master records, OPD booking, and IPD Ward Allocation
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewPatientModal(true)}
          className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Patient Name, UHID (e.g. HMS-2026-9812), or Phone..."
          className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Patients Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Master Patient Directory ({filteredPatients.length})</span>
        </div>

        <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto">
          {filteredPatients.map((p) => (
            <div
              key={p.id}
              className="p-3 sm:p-3.5 hover:bg-slate-800/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-700 shrink-0">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">{p.name}</span>
                    <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-semibold">
                      {p.uhid}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        p.status === "Inpatient"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>
                      {p.age} Y • {p.gender} • Blood Group:{" "}
                      <strong className="text-red-400">{p.bloodGroup}</strong>
                    </span>
                    <span>Phone: {p.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 shrink-0">
                <button
                  onClick={() => {
                    setSelectedPatientForAction(p);
                    setShowBookAptModal(true);
                  }}
                  className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <CalendarPlus className="w-3.5 h-3.5" />
                  <span>Book OPD Token</span>
                </button>

                {p.status !== "Inpatient" && (
                  <button
                    onClick={() => {
                      setSelectedPatientForAction(p);
                      setShowAdmitModal(true);
                    }}
                    className="flex-1 sm:flex-initial px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-medium text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <BedDouble className="w-3.5 h-3.5" />
                    <span>Admit to IPD</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Patient Registration Modal */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Register New Patient</span>
              </h3>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. Michael Scott"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Age</label>
                  <input
                    type="number"
                    value={pAge}
                    onChange={(e) => setPAge(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Gender</label>
                  <select
                    value={pGender}
                    onChange={(e: any) => setPGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={pBlood}
                    onChange={(e) => setPBlood(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all mt-2"
              >
                Register & Generate UHID
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Book OPD Token Modal */}
      {showBookAptModal && selectedPatientForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-blue-400" />
                <span>Book OPD Token for {selectedPatientForAction.name}</span>
              </h3>
              <button
                onClick={() => setShowBookAptModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Select Attending Doctor</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  {INITIAL_USERS.filter(u => u.role === "doctor").map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Chief Complaint</label>
                <input
                  type="text"
                  value={aptComplaint}
                  onChange={(e) => setAptComplaint(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Appointment Type</label>
                  <select
                    value={aptType}
                    onChange={(e: any) => setAptType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-white"
                  >
                    <option value="OPD Regular">OPD Regular</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Fee ($)</label>
                  <input
                    type="number"
                    value={aptFee}
                    onChange={(e) => setAptFee(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all mt-2"
              >
                Issue Token & Confirm Appointment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admit IPD Modal */}
      {showAdmitModal && selectedPatientForAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-purple-400" />
                <span>Admit {selectedPatientForAction.name} to IPD</span>
              </h3>
              <button
                onClick={() => setShowAdmitModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdmitPatient} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Reason for Admission</label>
                <input
                  type="text"
                  value={admitReason}
                  onChange={(e) => setAdmitReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Room Selection Cards */}
              <div className="space-y-1.5">
                <label className="text-slate-400 block">Select Ward / Room Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  {INITIAL_ROOMS.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        selectedRoom.id === room.id
                          ? "bg-purple-600/20 border-purple-500 text-white"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="font-bold text-slate-200">{room.type} ({room.number})</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Rate: ${room.ratePerDay}/day • Beds: {room.occupiedBeds}/{room.totalBeds}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Bed Number</label>
                <input
                  type="text"
                  value={selectedBed}
                  onChange={(e) => setSelectedBed(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all mt-2"
              >
                Confirm Admission & Assign Bed
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
