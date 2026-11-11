import React, { useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Stethoscope,
  FlaskConical,
  Pill,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Patient, Vitals, LabOrder, Prescription } from "../../types/hms";

interface ClinicalAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activePatient?: Patient;
  vitals?: Vitals[];
  labOrders?: LabOrder[];
  prescriptions?: Prescription[];
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const ClinicalAiAssistant: React.FC<ClinicalAiAssistantProps> = ({
  isOpen,
  onClose,
  activePatient,
  vitals,
  labOrders,
  prescriptions,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m-1",
      sender: "ai",
      text: "Hello! I am your HMS Gemini AI Clinical Support Assistant. I can help with patient history summarization, differential diagnoses, lab value interpretations, or drug interaction reviews. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendQuery = async (customPrompt?: string, taskType?: string) => {
    const queryText = customPrompt || inputPrompt;
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const patientData = activePatient
        ? {
            patient: activePatient,
            recentVitals: vitals?.slice(0, 3),
            recentLabOrders: labOrders?.slice(0, 3),
            currentPrescriptions: prescriptions?.slice(0, 3),
          }
        : undefined;

      const res = await fetch("/api/gemini/clinical-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: queryText,
          patientData,
          taskType,
        }),
      });

      const data = await res.json();
      if (res.ok && data.result) {
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.result,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(data.error || "Failed to generate AI response.");
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: `⚠️ **Clinical Support Error**: ${err.message || "Unable to reach Gemini AI service. Check network or API configuration."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Gemini Clinical AI</h3>
            <p className="text-[10px] text-slate-400">
              Powered by gemini-3.6-flash
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Patient Context Card */}
      {activePatient && (
        <div className="bg-purple-950/40 border-b border-purple-800/40 px-4 py-2.5 text-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
              Active Patient Context Linked
            </span>
            <span className="font-bold text-white">{activePatient.name}</span>{" "}
            <span className="text-purple-300">
              ({activePatient.age}Y • {activePatient.gender})
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
            {activePatient.id}
          </span>
        </div>
      )}

      {/* Preset Action Chips */}
      <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() =>
            handleSendQuery(
              "Provide a concise clinical summary of this patient's vitals and history.",
              "summary"
            )
          }
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap flex items-center gap-1 transition-all"
        >
          <Stethoscope className="w-3 h-3 text-blue-400" />
          <span>Patient Summary</span>
        </button>

        <button
          onClick={() =>
            handleSendQuery(
              "Analyze recent laboratory values against standard clinical reference ranges.",
              "lab_analysis"
            )
          }
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap flex items-center gap-1 transition-all"
        >
          <FlaskConical className="w-3 h-3 text-purple-400" />
          <span>Lab Analysis</span>
        </button>

        <button
          onClick={() =>
            handleSendQuery(
              "Check current prescription list for drug-drug interactions or safety risks.",
              "prescription_check"
            )
          }
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap flex items-center gap-1 transition-all"
        >
          <Pill className="w-3 h-3 text-emerald-400" />
          <span>Rx Interaction Check</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/90 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${
              m.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.sender === "ai" && (
              <div className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-[82%] p-3 rounded-2xl ${
                m.sender === "user"
                  ? "bg-blue-600 text-white rounded-tr-none"
                  : "bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none whitespace-pre-wrap leading-relaxed"
              }`}
            >
              <div className="text-[11px] font-medium">{m.text}</div>
              <div
                className={`text-[9px] mt-1 text-right ${
                  m.sender === "user" ? "text-blue-200" : "text-slate-500"
                }`}
              >
                {m.timestamp}
              </div>
            </div>

            {m.sender === "user" && (
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-purple-400 text-xs bg-purple-950/40 p-3 rounded-xl border border-purple-800/30 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing clinical data with Gemini AI...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery();
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Ask AI clinical question or diagnostic inquiry..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={isLoading || !inputPrompt.trim()}
          className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white flex items-center justify-center transition-all shadow"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
