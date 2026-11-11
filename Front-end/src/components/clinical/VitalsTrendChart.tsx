import React, { useState } from "react";
import { Activity, Heart, Thermometer, Droplets, TrendingUp, AlertTriangle } from "lucide-react";
import { Vitals } from "../../types/hms";

interface VitalsTrendChartProps {
  vitalsHistory?: Vitals[];
  patientName?: string;
}

export const VitalsTrendChart: React.FC<VitalsTrendChartProps> = ({
  vitalsHistory = [
    {
      id: "v-1",
      patientId: "PAT-1092",
      timestamp: "2026-08-20 09:00",
      bpSystolic: 138,
      bpDiastolic: 88,
      pulseRate: 78,
      temperature: 98.6,
      spO2: 98,
      respiratoryRate: 16,
      bloodSugar: 110,
      recordedBy: "Nurse Johnson",
    },
    {
      id: "v-2",
      patientId: "PAT-1092",
      timestamp: "2026-08-21 09:00",
      bpSystolic: 132,
      bpDiastolic: 84,
      pulseRate: 74,
      temperature: 98.4,
      spO2: 99,
      respiratoryRate: 15,
      bloodSugar: 105,
      recordedBy: "Nurse Johnson",
    },
    {
      id: "v-3",
      patientId: "PAT-1092",
      timestamp: "2026-08-22 09:00",
      bpSystolic: 142,
      bpDiastolic: 92,
      pulseRate: 82,
      temperature: 99.1,
      spO2: 97,
      respiratoryRate: 18,
      bloodSugar: 135,
      recordedBy: "Nurse Davis",
    },
    {
      id: "v-4",
      patientId: "PAT-1092",
      timestamp: "2026-08-23 09:00",
      bpSystolic: 128,
      bpDiastolic: 80,
      pulseRate: 72,
      temperature: 98.6,
      spO2: 99,
      respiratoryRate: 16,
      bloodSugar: 98,
      recordedBy: "Nurse Johnson",
    },
    {
      id: "v-5",
      patientId: "PAT-1092",
      timestamp: "2026-08-24 09:00",
      bpSystolic: 125,
      bpDiastolic: 78,
      pulseRate: 70,
      temperature: 98.2,
      spO2: 99,
      respiratoryRate: 14,
      bloodSugar: 95,
      recordedBy: "Nurse Johnson",
    },
  ],
  patientName = "Eleanor Vance",
}) => {
  const [selectedMetric, setSelectedMetric] = useState<"bp" | "pulse" | "spo2" | "sugar">("bp");

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case "bp":
        return { line: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" };
      case "pulse":
        return { line: "#ef4444", bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" };
      case "spo2":
        return { line: "#3b82f6", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400" };
      case "sugar":
        return { line: "#f59e0b", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" };
      default:
        return { line: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" };
    }
  };

  const currentColor = getMetricColor(selectedMetric);

  // SVG Chart Dimensions
  const svgWidth = 500;
  const svgHeight = 160;
  const padding = 30;

  const points = vitalsHistory.map((item, index) => {
    const x = padding + (index * (svgWidth - padding * 2)) / (vitalsHistory.length - 1 || 1);
    let val = item.bpSystolic;
    let minVal = 60;
    let maxVal = 180;

    if (selectedMetric === "pulse") {
      val = item.pulseRate;
      minVal = 50;
      maxVal = 120;
    } else if (selectedMetric === "spo2") {
      val = item.spO2;
      minVal = 85;
      maxVal = 100;
    } else if (selectedMetric === "sugar") {
      val = item.bloodSugar || 100;
      minVal = 70;
      maxVal = 200;
    }

    const y = svgHeight - padding - ((val - minVal) / (maxVal - minVal)) * (svgHeight - padding * 2);
    return { x, y, val, timestamp: item.timestamp };
  });

  const polylinePath = points.map((p) => `${p.x},${p.y}`).join(" ");

  const latestVitals = vitalsHistory[vitalsHistory.length - 1] || vitalsHistory[0];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 text-xs">
      {/* Title & Patient Telemetry Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              Patient Vitals Telemetry Trends
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                REAL-TIME MONITOR
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Tracking clinical progress for <strong className="text-slate-200">{patientName}</strong>
            </p>
          </div>
        </div>

        {/* Metric Switcher Buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px] font-bold">
          <button
            onClick={() => setSelectedMetric("bp")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedMetric === "bp" ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Blood Pressure
          </button>
          <button
            onClick={() => setSelectedMetric("pulse")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedMetric === "pulse" ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Pulse Rate
          </button>
          <button
            onClick={() => setSelectedMetric("spo2")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedMetric === "spo2" ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            SpO2 (%)
          </button>
          <button
            onClick={() => setSelectedMetric("sugar")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedMetric === "sugar" ? "bg-amber-600 text-white shadow-md shadow-amber-600/20" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Blood Sugar
          </button>
        </div>
      </div>

      {/* Vital Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Blood Pressure</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-extrabold text-white text-base font-mono">
            {latestVitals.bpSystolic}/{latestVitals.bpDiastolic}{" "}
            <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Heart / Pulse Rate</span>
            <Heart className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          </div>
          <div className="font-extrabold text-white text-base font-mono">
            {latestVitals.pulseRate} <span className="text-[10px] text-slate-400 font-normal">BPM</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>SpO2 Oxygen</span>
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="font-extrabold text-white text-base font-mono">
            {latestVitals.spO2}% <span className="text-[10px] text-emerald-400 font-normal">Normal</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Blood Sugar</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="font-extrabold text-white text-base font-mono">
            {latestVitals.bloodSugar || 105} <span className="text-[10px] text-slate-400 font-normal">mg/dL</span>
          </div>
        </div>
      </div>

      {/* SVG Telemetry Trend Line Graph */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>7-Day Progression Curve</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            Last Recorded: {latestVitals.timestamp}
          </span>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 overflow-visible">
            {/* Grid Horizontal Reference Lines */}
            <line x1="20" y1="30" x2={svgWidth - 20} y2="30" stroke="#1f2937" strokeDasharray="3,3" />
            <line x1="20" y1="80" x2={svgWidth - 20} y2="80" stroke="#1f2937" strokeDasharray="3,3" />
            <line x1="20" y1="130" x2={svgWidth - 20} y2="130" stroke="#1f2937" strokeDasharray="3,3" />

            {/* Polyline Path */}
            <polyline
              fill="none"
              stroke={currentColor.line}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePath}
            />

            {/* Data Points and Labels */}
            {points.map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r="5" fill={currentColor.line} className="hover:r-7 transition-all cursor-pointer" />
                <text x={pt.x} y={pt.y - 10} fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">
                  {pt.val}
                </text>
                <text x={pt.x} y={svgHeight - 8} fill="#64748b" fontSize="8" textAnchor="middle">
                  {pt.timestamp.split(" ")[0].slice(5)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
