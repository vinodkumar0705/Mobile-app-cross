import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Clock,
  Stethoscope,
  Users,
  CheckCircle2,
  X,
  Loader2,
  Check,
  ChevronRight,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Appointment } from "../../types/hms";
import { saveAppointments, addAppointment, addSystemNotification } from "../../lib/storage";
import { appointmentService } from "../../services/appointmentService";
import { apiRequest } from "../../lib/apiClient";

interface AdminAppointmentsProps {
  appointmentsList: Appointment[];
  setAppointmentsList: React.Dispatch<React.SetStateAction<Appointment[]>>;
  patientsList: any[];
  doctorsList: { id: string; name: string; department: string }[];
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
  openScheduleModal?: boolean;
  onCloseScheduleModal?: () => void;
}

export const AdminAppointments: React.FC<AdminAppointmentsProps> = ({
  appointmentsList,
  setAppointmentsList,
  patientsList,
  doctorsList,
  showToast,
  onNavigateTab,
  openScheduleModal,
  onCloseScheduleModal,
}) => {
  const getTodayStr = () => new Date().toISOString().split("T")[0];

  // Filters
  const [aptDateFilter, setAptDateFilter] = useState<string>(getTodayStr());
  const [aptSearch, setAptSearch] = useState<string>("");
  const [aptDoctorFilter, setAptDoctorFilter] = useState<string>("ALL");
  const [aptStatusFilter, setAptStatusFilter] = useState<string>("ALL");

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);

  React.useEffect(() => {
    if (openScheduleModal) {
      setShowScheduleModal(true);
      onCloseScheduleModal?.();
    }
  }, [openScheduleModal]);
  const [showAdminCalendarModal, setShowAdminCalendarModal] = useState<boolean>(false);
  const [selectedAptDetails, setSelectedAptDetails] = useState<Appointment | null>(null);
  const [isSubmittingApt, setIsSubmittingApt] = useState<boolean>(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState<boolean>(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<{
    id: string;
    tokenNumber: number;
    patientName: string;
    doctorName: string;
    department: string;
    date: string;
    timeSlot: string;
    status: string;
  } | null>(null);

  // Schedule Appointment Form State
  const [schedPatientName, setSchedPatientName] = useState<string>("");
  const [schedPatientPhone, setSchedPatientPhone] = useState<string>("");
  const [schedPatientAge, setSchedPatientAge] = useState<string>("");
  const [schedPatientGender, setSchedPatientGender] = useState<string>("");
  const [schedPatientBloodGroup, setSchedPatientBloodGroup] = useState<string>("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [schedDate, setSchedDate] = useState<string>(getTodayStr());
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [complaint, setComplaint] = useState<string>("");
  const [fee, setFee] = useState<number>(75);
  const [schedStatus, setSchedStatus] = useState<Appointment["status"]>("Scheduled");

  const ALL_TIME_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"
  ];

  const parseSlotToMinutes = (slotStr: string): number => {
    const parts = slotStr.trim().split(" ");
    if (parts.length < 2) return 0;
    const [time, modifier] = parts;
    const timeParts = time.split(":").map(Number);
    let hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getSlotAvailability = (slot: string) => {
    const targetDate = schedDate || getTodayStr();
    const isToday = targetDate === getTodayStr();

    let isPast = false;
    if (isToday) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      isPast = parseSlotToMinutes(slot) <= currentMinutes;
    }

    let isBooked = false;
    if (selectedDoctorId) {
      const selectedDoc = doctorsList.find((d) => d.id === selectedDoctorId);
      const docName = selectedDoc?.name || "";

      isBooked = appointmentsList.some((apt) => {
        const matchesDoc =
          apt.doctorId === selectedDoctorId ||
          apt.doctorName === docName ||
          (docName && apt.doctorName.toLowerCase() === docName.toLowerCase());
        const matchesDate = apt.date && apt.date.startsWith(targetDate);
        const notCancelled = apt.status !== "Cancelled";
        return matchesDoc && matchesDate && notCancelled && apt.timeSlot === slot;
      });
    }

    return { isPast, isBooked, isDisabled: isPast || isBooked };
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[a-zA-Z\s]*$/.test(val)) {
      setSchedPatientName(val);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val) && val.length <= 10) {
      setSchedPatientPhone(val);
    }
  };

  const resetScheduleForm = () => {
    setSchedPatientName("");
    setSchedPatientPhone("");
    setSchedPatientAge("");
    setSchedPatientGender("");
    setSchedPatientBloodGroup("");
    setSelectedDoctorId("");
    setSchedDate(aptDateFilter || getTodayStr());
    setTimeSlot("");
    setComplaint("");
    setFee(75);
    setSchedStatus("Scheduled");
  };

  const handleAdminScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctorId) {
      showToast("Please select a doctor from the list!");
      return;
    }
    if (schedPatientPhone.length !== 10) {
      showToast("Contact number must be exactly 10 digits!");
      return;
    }
    if (!schedPatientAge.trim()) {
      showToast("Please enter patient age!");
      return;
    }
    if (!schedPatientGender) {
      showToast("Please select patient gender!");
      return;
    }
    if (!schedPatientBloodGroup) {
      showToast("Please select patient blood group!");
      return;
    }
    if (!timeSlot) {
      showToast("Please select an available doctor time slot!");
      return;
    }

    const { isPast, isBooked } = getSlotAvailability(timeSlot);
    if (isBooked) {
      showToast("This time slot is already booked for this doctor! Please select another slot.");
      return;
    }
    if (isPast) {
      showToast("This time slot has already passed! Please select a future time slot.");
      return;
    }

    setIsSubmittingApt(true);

    const doc = doctorsList.find((d) => d.id === selectedDoctorId);
    const targetDocId = doc ? doc.id : selectedDoctorId;
    const fullPhone = `+91 ${schedPatientPhone}`;
    const targetDate = schedDate || aptDateFilter;

    const apiRes = await appointmentService.createAppointment({
      patientName: schedPatientName.trim(),
      patientPhone: fullPhone,
      patientAge: schedPatientAge.trim(),
      patientGender: schedPatientGender,
      patientBloodGroup: schedPatientBloodGroup,
      doctorId: targetDocId,
      doctorName: doc ? doc.name : "Doctor",
      department: doc ? doc.department : "General Medicine",
      date: targetDate,
      timeSlot,
      chiefComplaint: complaint.trim() || "General Consultation",
      consultationFee: fee,
      status: schedStatus,
    });

    const newApt: Appointment = {
      id: apiRes.data?.id || `APT-${Math.floor(4000 + Math.random() * 9000)}`,
      tokenNumber: appointmentsList.length + 1,
      patientId: apiRes.data?.patientId || `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
      patientName: schedPatientName.trim(),
      patientPhone: fullPhone,
      doctorId: targetDocId,
      doctorName: doc ? doc.name : "Doctor",
      department: doc ? doc.department : "General Medicine",
      date: targetDate,
      timeSlot,
      type: "OPD Regular",
      status: schedStatus,
      chiefComplaint: complaint.trim() || "General Consultation",
      consultationFee: fee,
      paymentStatus: "Paid",
    };

    addAppointment(newApt);

    const dbAppointments = await appointmentService.getAllAppointments();
    if (dbAppointments.success && dbAppointments.data && dbAppointments.data.length > 0) {
      const exists = dbAppointments.data.some(
        (a) => a.id === newApt.id || (a.patientName.toLowerCase() === newApt.patientName.toLowerCase() && a.date === newApt.date)
      );
      if (!exists) {
        setAppointmentsList([newApt, ...dbAppointments.data]);
      } else {
        setAppointmentsList(dbAppointments.data);
      }
    } else {
      setAppointmentsList((prev) => [newApt, ...prev]);
    }

    addSystemNotification({
      title: "New OPD Appointment",
      message: `Appointment scheduled for ${schedPatientName} with ${doc ? doc.name : "Doctor"} on ${targetDate} at ${timeSlot}`,
      category: "appointment",
      priority: "medium",
    });

    const confirmedData = {
      id: apiRes.data?.id || newApt.id,
      tokenNumber: newApt.tokenNumber,
      patientName: schedPatientName.trim(),
      doctorName: doc ? doc.name : "Doctor",
      department: doc ? doc.department : "General Medicine",
      date: targetDate,
      timeSlot,
      status: schedStatus,
    };

    setSubmittedAppointment(confirmedData);
    setIsSubmittingApt(false);
    setShowScheduleModal(false);
    setShowSubmittedModal(true);
    resetScheduleForm();
    showToast(`Appointment for ${schedPatientName} submitted successfully!`);
  };

  const handleUpdateAptStatus = (aptId: string, newStatus: Appointment["status"]) => {
    const apt = appointmentsList.find((a) => a.id === aptId);
    const updated = appointmentsList.map((a) => (a.id === aptId ? { ...a, status: newStatus } : a));
    saveAppointments(updated);
    setAppointmentsList(updated);

    // Synchronize status update with backend if live API is connected
    try {
      let backendStatus = "CONFIRMED";
      if (newStatus === "In-Consultation") backendStatus = "IN_PROGRESS";
      else if (newStatus === "Completed") backendStatus = "COMPLETED";
      else if (newStatus === "Cancelled") backendStatus = "CANCELLED";
      else if (newStatus === "Scheduled") backendStatus = "CONFIRMED";

      apiRequest(`/patient/updateAppointment/${aptId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: backendStatus }),
      }).catch(() => {});
    } catch (e) {}

    if (newStatus === "Completed") {
      addSystemNotification({
        title: "Consultation Completed",
        message: `Consultation completed for ${apt?.patientName || "Patient"} with ${apt?.doctorName || "Doctor"}.`,
        category: "appointment",
        priority: "medium",
      });
    }
    showToast(`Updated appointment status to '${newStatus}'!`);
  };

  const filteredAppointments = appointmentsList.filter((apt) => {
    const matchesSearch =
      apt.patientName.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.tokenNumber.toString().includes(aptSearch) ||
      apt.chiefComplaint.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.doctorName.toLowerCase().includes(aptSearch.toLowerCase());

    const matchesDoctor =
      aptDoctorFilter === "ALL" ||
      apt.doctorId === aptDoctorFilter ||
      apt.doctorName === aptDoctorFilter ||
      apt.doctorName.toLowerCase().includes(
        (doctorsList.find((d) => d.id === aptDoctorFilter)?.name || "").toLowerCase()
      );

    const matchesStatus = aptStatusFilter === "ALL" || apt.status === aptStatusFilter;

    let matchesDate = true;
    if (aptDateFilter && apt.date) {
      matchesDate = apt.date.startsWith(aptDateFilter);
    }

    return matchesSearch && matchesDoctor && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-4 w-full">
      {/* Connected Doctor Appointments Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-4 overflow-hidden w-full">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-white flex flex-wrap items-center gap-1.5 leading-snug">
                <span>Admin Appointment Scheduling & Doctor Sync Queue</span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                All hospital appointment records across doctors and real-time consultation schedule
              </p>
            </div>
          </div>

          <span className="text-[9px] sm:text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase shrink-0">
            {appointmentsList.length} Appointments
          </span>
        </div>

        {/* Filter Controls Row */}
        <div className="space-y-2 text-xs w-full">
          {/* Search Input - Full width */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={aptSearch}
              onChange={(e) => setAptSearch(e.target.value)}
              placeholder="Search patient, token, complaint..."
              className="w-full h-9 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Selectors Grid: Doctor Filter (50%) + Status Filter (50%) + Date Picker */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full">
            {/* Doctor Filter */}
            <div className="h-9 flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900/80 px-2.5 rounded-xl border border-slate-800 transition-colors relative min-w-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[10px] text-slate-400 font-bold shrink-0">Doc:</span>
              <select
                value={aptDoctorFilter}
                onChange={(e) => setAptDoctorFilter(e.target.value)}
                className="bg-slate-950 text-white text-xs font-semibold focus:outline-none cursor-pointer w-full py-1 pr-4 truncate appearance-none [color-scheme:dark]"
              >
                <option value="ALL" className="bg-[#0f172a] text-white">All Doctors ({doctorsList.length})</option>
                {doctorsList.map((doc) => (
                  <option key={doc.id || doc.name} value={doc.id} className="bg-[#0f172a] text-white">
                    {doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
            </div>

            {/* Status Filter */}
            <div className="h-9 flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900/80 px-2.5 rounded-xl border border-slate-800 transition-colors relative min-w-0">
              <span className="text-[10px] text-slate-400 font-bold shrink-0">Status:</span>
              <select
                value={aptStatusFilter}
                onChange={(e) => setAptStatusFilter(e.target.value)}
                className="bg-slate-950 text-white text-xs font-semibold focus:outline-none cursor-pointer w-full py-1 pr-4 truncate appearance-none [color-scheme:dark]"
              >
                <option value="ALL" className="bg-[#0f172a] text-white">All Statuses</option>
                <option value="Scheduled" className="bg-[#0f172a] text-amber-400 font-medium">Scheduled</option>
                <option value="In-Consultation" className="bg-[#0f172a] text-blue-400 font-medium">In-Consultation</option>
                <option value="Completed" className="bg-[#0f172a] text-emerald-400 font-medium">Completed</option>
                <option value="Cancelled" className="bg-[#0f172a] text-rose-400 font-medium">Cancelled</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
            </div>

            {/* Date Picker Button */}
            <div
              onClick={() => setShowAdminCalendarModal(true)}
              className="h-9 flex items-center justify-between gap-1.5 bg-slate-950 hover:bg-slate-900/80 px-3 rounded-xl border border-slate-800 cursor-pointer transition-colors col-span-2 sm:col-span-1 min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono text-white truncate text-xs">
                  {aptDateFilter ? (aptDateFilter === getTodayStr() ? "Today" : aptDateFilter) : "All Dates"}
                </span>
              </div>
              <span className="text-[9px] text-emerald-400 font-bold uppercase shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {aptDateFilter ? "Change" : "Filter"}
              </span>
            </div>
          </div>
        </div>

        {/* Appointments List Grid / Queue Cards */}
        <div className="space-y-2 pt-1 max-h-[480px] overflow-y-auto overflow-x-hidden pr-0.5">
          {filteredAppointments.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                No appointments found for {aptDateFilter ? `date ${aptDateFilter}` : "the selected filter"}
              </p>
              <div className="text-xs text-slate-500">
                {aptDateFilter && (
                  <button
                    type="button"
                    onClick={() => setAptDateFilter("")}
                    className="text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    Click to View All Appointments ({appointmentsList.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex flex-col gap-2.5 transition-all text-xs overflow-hidden"
              >
                {/* ROW 1: Name on first beside its Token Number (Left), Status Badge Dropdown (Right) */}
                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 font-mono font-bold text-emerald-400 text-xs shrink-0">
                      #{apt.tokenNumber}
                    </span>
                    <span className="font-bold text-white text-xs sm:text-sm truncate" title={apt.patientName}>
                      {apt.patientName}
                    </span>
                  </div>

                  {/* Status Dropdown Badge: 100% dark theme, lets user switch status anytime */}
                  <div className="relative shrink-0">
                    <select
                      value={apt.status}
                      onChange={(e) => handleUpdateAptStatus(apt.id, e.target.value as Appointment["status"])}
                      className={`text-[9px] sm:text-[10px] pl-2 pr-5 py-0.5 rounded-full font-bold uppercase tracking-wider border appearance-none cursor-pointer [color-scheme:dark] bg-slate-950 transition-all ${
                        apt.status === "Completed"
                          ? "text-emerald-400 border-emerald-500/40"
                          : apt.status === "In-Consultation"
                          ? "text-blue-400 border-blue-500/40"
                          : apt.status === "Cancelled"
                          ? "text-rose-400 border-rose-500/40"
                          : "text-amber-400 border-amber-500/40"
                      }`}
                    >
                      <option value="Scheduled" className="bg-[#0f172a] text-amber-400 font-semibold">Scheduled</option>
                      <option value="In-Consultation" className="bg-[#0f172a] text-blue-400 font-semibold">In-Consult</option>
                      <option value="Completed" className="bg-[#0f172a] text-emerald-400 font-semibold">Completed</option>
                      <option value="Cancelled" className="bg-[#0f172a] text-rose-400 font-semibold">Cancelled</option>
                    </select>
                    <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>

                {/* ROW 2: Doctor which they are consulting & Department */}
                <div className="flex items-center gap-1.5 text-xs text-slate-300 min-w-0 w-full">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-slate-400 text-[11px] shrink-0">Doctor:</span>
                  <span className="font-semibold text-slate-200 truncate">{apt.doctorName}</span>
                  {apt.department && (
                    <>
                      <span className="text-slate-600 shrink-0">•</span>
                      <span className="text-slate-400 text-[11px] truncate">{apt.department}</span>
                    </>
                  )}
                </div>

                {/* ROW 3: Time on Left, Details & Complete Action on Right */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/60 w-full min-w-0">
                  {/* Left: Time */}
                  <div className="flex items-center gap-1 text-xs text-slate-400 min-w-0">
                    <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="font-mono text-emerald-400 font-semibold text-xs">{apt.timeSlot}</span>
                    {apt.date && apt.date !== getTodayStr() && (
                      <span className="text-[10px] text-slate-500 font-mono hidden xs:inline">({apt.date})</span>
                    )}
                  </div>

                  {/* Right: Details & Complete Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedAptDetails(apt)}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </button>

                    {/* Quick 1-click Action Button */}
                    {apt.status === "In-Consultation" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAptStatus(apt.id, "Completed")}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        title="Click to complete consultation"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    )}

                    {apt.status === "Scheduled" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateAptStatus(apt.id, "In-Consultation")}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-md shadow-blue-600/20 flex items-center gap-1 cursor-pointer transition-all shrink-0"
                        title="Click to start consultation"
                      >
                        <span>In-Consult</span>
                      </button>
                    )}

                    {apt.status === "Completed" && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Done</span>
                      </span>
                    )}

                    {apt.status === "Cancelled" && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1 shrink-0">
                        <span>Cancelled</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Schedule Appointment Modal with Live Database Push */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Schedule New Appointment</h3>
                  <p className="text-[10px] text-slate-400">Fill details to confirm appointment • Default Status: Scheduled</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdminScheduleAppointment} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Patient Full Name */}
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Patient Full Name *</label>
                  <input
                    type="text"
                    value={schedPatientName}
                    onChange={handleNameChange}
                    placeholder="Enter patient full name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Patient Contact Number (10 Digits) */}
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Contact Number (10 digits) *</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-500 font-mono pointer-events-none text-xs">+91</span>
                    <input
                      type="tel"
                      value={schedPatientPhone}
                      onChange={handlePhoneChange}
                      placeholder="9876543210"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Patient Age */}
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Age (Years) *</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={schedPatientAge}
                    onChange={(e) => setSchedPatientAge(e.target.value)}
                    placeholder="Enter age"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Patient Gender */}
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Gender *</label>
                  <select
                    value={schedPatientGender}
                    onChange={(e) => setSchedPatientGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="" disabled>-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Patient Blood Group */}
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Blood Group *</label>
                  <select
                    value={schedPatientBloodGroup}
                    onChange={(e) => setSchedPatientBloodGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="" disabled>-- Select Blood Group --</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Assign Consulting Doctor *</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      setTimeSlot("");
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                    required
                  >
                    <option value="" disabled>-- Select Doctor --</option>
                    {doctorsList.map((doc) => (
                      <option key={doc.id || doc.name} value={doc.id}>
                        {doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`} ({doc.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date and Time Slot Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Appointment Date *</label>
                  <input
                    type="date"
                    value={schedDate}
                    onChange={(e) => {
                      setSchedDate(e.target.value);
                      setTimeSlot("");
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Selected Time Slot *</label>
                  <input
                    type="text"
                    value={timeSlot ? `${timeSlot} (Selected)` : "Pick a slot below"}
                    readOnly
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none cursor-default"
                  />
                </div>
              </div>

              {/* Time Slots Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-400 block font-semibold flex items-center justify-between">
                  <span>Available Doctor Slots</span>
                  <span className="text-[10px] text-slate-500">Filtered for selected date & doctor</span>
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-950 rounded-xl border border-slate-800">
                  {ALL_TIME_SLOTS.map((slot) => {
                    const { isPast, isBooked, isDisabled } = getSlotAvailability(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setTimeSlot(slot)}
                        title={isBooked ? "Slot already booked" : isPast ? "Slot has passed" : "Click to select slot"}
                        className={`py-1.5 px-1 rounded-lg text-center font-mono text-[10px] font-bold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                          timeSlot === slot
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
                            : isDisabled
                            ? "bg-slate-900/50 text-slate-600 border-slate-900 line-through opacity-40"
                            : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chief Complaint & Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Chief Medical Complaint</label>
                  <input
                    type="text"
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="e.g. Chest discomfort, routine follow-up"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={fee}
                    onChange={(e) => setFee(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingApt}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingApt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Confirm Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Submitted Confirmation Pop-up Modal */}
      {showSubmittedModal && submittedAppointment && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowSubmittedModal(false)}
        >
          <div
            className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl shadow-emerald-500/10 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <CheckCircle2 className="w-9 h-9 animate-pulse" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" />
                <span>Submitted</span>
              </div>
              <h3 className="text-xl font-black text-white pt-1">Appointment Confirmed!</h3>
              <p className="text-xs text-slate-400">Successfully booked and confirmed in the hospital system.</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Queue Token</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">#{submittedAppointment.tokenNumber}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Patient</span>
                <span className="font-semibold text-white">{submittedAppointment.patientName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Consulting Doctor</span>
                <span className="font-semibold text-white">{submittedAppointment.doctorName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Department</span>
                <span className="text-slate-300">{submittedAppointment.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date & Time</span>
                <span className="font-semibold text-blue-400">{submittedAppointment.date} • {submittedAppointment.timeSlot}</span>
              </div>
            </div>

            <button
              onClick={() => setShowSubmittedModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer hover:scale-[1.01]"
            >
              OK, Got It
            </button>
          </div>
        </div>
      )}

      {/* Admin Appointments Calendar Modal */}
      {showAdminCalendarModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowAdminCalendarModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Select Appointment Date</h3>
                  <p className="text-[10px] text-slate-400">Default: Today's Appointments Only</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminCalendarModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Quick Select Date
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { label: "Today", dateStr: getTodayStr(), desc: "Today's Queue" },
                  { label: "All Dates", dateStr: "", desc: "All Appointments" },
                  {
                    label: "Yesterday",
                    dateStr: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      return d.toISOString().split("T")[0];
                    })(),
                    desc: "Past Day",
                  },
                  {
                    label: "Tomorrow",
                    dateStr: (() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      return d.toISOString().split("T")[0];
                    })(),
                    desc: "Upcoming",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setAptDateFilter(item.dateStr);
                      setShowAdminCalendarModal(false);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      aptDateFilter === item.dateStr
                        ? "bg-emerald-600 text-white border-emerald-500 font-bold shadow-md shadow-emerald-600/20"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="block text-[11px] font-bold">{item.label}</span>
                    <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                      {item.dateStr || "All Records"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Or Pick Custom Date
              </label>
              <div
                onClick={(e) => {
                  const input = e.currentTarget.querySelector("input");
                  if (input) {
                    try {
                      input.showPicker();
                    } catch (err) {
                      input.focus();
                    }
                  }
                }}
                className="flex items-center justify-between gap-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <Calendar className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <input
                    type="date"
                    value={aptDateFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setAptDateFilter(val);
                      setShowAdminCalendarModal(false);
                    }}
                    className="w-full bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer [color-scheme:dark]"
                  />
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Tap to Pick
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowAdminCalendarModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Appointment Details Modal */}
      {selectedAptDetails && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedAptDetails(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-black text-sm flex items-center justify-center font-mono shrink-0">
                  #{selectedAptDetails.tokenNumber}
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">Appointment & Patient Details</h3>
                  <p className="text-[10px] text-slate-400 font-mono">{selectedAptDetails.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAptDetails(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Appointment Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                    selectedAptDetails.status === "Completed"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : selectedAptDetails.status === "In-Consultation"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : selectedAptDetails.status === "Cancelled"
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {selectedAptDetails.status}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Patient Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Patient Name</span>
                    <span className="font-bold text-white text-xs">{selectedAptDetails.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Contact Number</span>
                    <span className="font-mono text-white text-xs">{selectedAptDetails.patientPhone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Patient ID</span>
                    <span className="font-mono text-emerald-400 text-xs">{selectedAptDetails.patientId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Age / Gender / Blood Group</span>
                    <span className="font-medium text-slate-200 text-xs">
                      {(selectedAptDetails as any).patientAge || "N/A"} Yrs • {(selectedAptDetails as any).patientGender || "N/A"} • {(selectedAptDetails as any).patientBloodGroup || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-400" />
                  <span>Doctor & Time Slot Information</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 pt-1 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Attending Doctor</span>
                    <span className="font-bold text-blue-400 text-xs">{selectedAptDetails.doctorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Department</span>
                    <span className="font-medium text-slate-200 text-xs">{selectedAptDetails.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Appointment Date</span>
                    <span className="font-mono text-white text-xs">{selectedAptDetails.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Time Slot</span>
                    <span className="font-mono text-emerald-400 font-bold text-xs">{selectedAptDetails.timeSlot}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 text-[10px]">Chief Complaint:</span>
                  <span className="font-medium text-white">{selectedAptDetails.chiefComplaint}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500 text-[10px]">Consultation Fee:</span>
                  <span className="font-mono text-emerald-400 font-bold">₹{selectedAptDetails.consultationFee} ({selectedAptDetails.paymentStatus})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Update Status
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["Scheduled", "In-Consultation", "Completed", "Cancelled"] as Appointment["status"][]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        handleUpdateAptStatus(selectedAptDetails.id, st);
                        setSelectedAptDetails({ ...selectedAptDetails, status: st });
                      }}
                      className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        selectedAptDetails.status === st
                          ? st === "Completed"
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20"
                            : st === "In-Consultation"
                            ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                            : st === "Cancelled"
                            ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20"
                            : "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {st === "In-Consultation" ? "In-Consult" : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedAptDetails(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
