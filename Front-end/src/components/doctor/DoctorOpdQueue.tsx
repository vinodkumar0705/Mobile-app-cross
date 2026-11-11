import React, { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from "lucide-react";
import { Appointment } from "../../types/hms";

interface DoctorOpdQueueProps {
  doctorName: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  doctorAppointments: Appointment[];
  selectedAppointment: Appointment | null;
  setSelectedAppointment: (apt: Appointment) => void;
  onNavigateTab?: (tab: string) => void;
}

export const DoctorOpdQueue: React.FC<DoctorOpdQueueProps> = ({
  doctorName,
  selectedDate,
  setSelectedDate,
  doctorAppointments,
  selectedAppointment,
  setSelectedAppointment,
  onNavigateTab,
}) => {
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  const getMinDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  };

  const getMaxDateStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  };

  const getQuickDates = () => {
    const list = [
      { label: "3 Days Ago", offset: -3 },
      { label: "Yesterday", offset: -1 },
      { label: "Today", offset: 0 },
      { label: "Tomorrow", offset: 1 },
      { label: "In 2 Days", offset: 2 },
      { label: "In 3 Days", offset: 3 },
    ];
    return list.map((item) => {
      const d = new Date();
      d.setDate(d.getDate() + item.offset);
      return {
        label: item.label,
        date: d.toISOString().split("T")[0],
      };
    });
  };

  const handlePrevDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() - 1);
    const newDateStr = curr.toISOString().split("T")[0];
    if (newDateStr >= getMinDateStr()) {
      setSelectedDate(newDateStr);
    }
  };

  const handleNextDay = () => {
    const curr = new Date(selectedDate);
    curr.setDate(curr.getDate() + 1);
    const newDateStr = curr.toISOString().split("T")[0];
    if (newDateStr <= getMaxDateStr()) {
      setSelectedDate(newDateStr);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col space-y-3 w-full">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
            {doctorName.split(" ")[0]}'s OPD Queue
          </h3>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">
            {doctorAppointments.length} Tokens
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar Date Stepper & Picker Modal */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs shadow-inner">
            <button
              type="button"
              onClick={handlePrevDay}
              disabled={selectedDate <= getMinDateStr()}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Previous Day (-1 day)"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-blue-400" />
            </button>

            <button
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-mono text-[11px] transition-all cursor-pointer"
              title="Click to open calendar modal picker"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{selectedDate}</span>
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              disabled={selectedDate >= getMaxDateStr()}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Next Day (+1 day)"
            >
              <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
            </button>
          </div>
        </div>
      </div>

      {/* OPD Token Queue Horizontal Carousel / List */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {doctorAppointments.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs w-full bg-slate-950/60 rounded-xl border border-slate-800/80">
            No patient appointments scheduled for {selectedDate}. Use date stepper or admin hub to schedule appointments.
          </div>
        ) : (
          doctorAppointments.map((apt) => (
            <div
              key={apt.id}
              onClick={() => setSelectedAppointment(apt)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between shrink-0 min-w-[210px] text-xs ${
                selectedAppointment?.id === apt.id
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-mono font-bold text-blue-400 text-xs">
                  Token #{apt.tokenNumber}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    apt.status === "In-Consultation"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : apt.status === "Completed"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {apt.status}
                </span>
              </div>
              <div className="py-1">
                <span className="font-bold text-white block text-sm truncate">{apt.patientName}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>{apt.timeSlot}</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 truncate mt-1">
                Complaint: {apt.chiefComplaint || "General Checkup"}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Calendar Modal Picker */}
      {showCalendarModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowCalendarModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">Select OPD Queue Date</h3>
                  <p className="text-[10px] text-slate-400">Restricted: Past 7 days to Next 7 days</p>
                </div>
              </div>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Date Shortcuts */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Quick Select Date
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {getQuickDates().map((item) => (
                  <button
                    key={item.date}
                    onClick={() => {
                      setSelectedDate(item.date);
                      setShowCalendarModal(false);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedDate === item.date
                        ? "bg-emerald-600 text-white border-emerald-500 font-bold shadow-md shadow-emerald-600/20"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <span className="block text-[11px] font-bold">{item.label}</span>
                    <span className="block text-[9px] text-slate-400 font-mono mt-0.5">{item.date}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Native Date Input */}
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
                    value={selectedDate}
                    min={getMinDateStr()}
                    max={getMaxDateStr()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const min = getMinDateStr();
                      const max = getMaxDateStr();
                      if (val < min) setSelectedDate(min);
                      else if (val > max) setSelectedDate(max);
                      else setSelectedDate(val);
                      setShowCalendarModal(false);
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
                onClick={() => setShowCalendarModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
