import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy Gemini AI client initialization
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Gemini AI Clinical Assistant Route
app.post("/api/gemini/clinical-assistant", async (req, res) => {
  try {
    const { prompt, patientData, taskType } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(503).json({
        error: "Gemini API key is not configured in environment variables.",
      });
    }

    let systemInstruction = `You are a clinical decision support system for an enterprise Hospital Management System (HMS).
You assist certified doctors, clinical nurses, laboratory specialists, and healthcare staff.
Provide clear, structured, accurate, and professional medical analysis, differential diagnosis suggestions, lab test interpretations, or prescription safety reviews.
Format output cleanly with markdown formatting (bullet points, clear headers, bold key clinical markers).
Always include a brief standard note: "Note: Clinical AI support tool for reference only; final diagnostic and treatment decisions rest with the attending physician."`;

    let userMessage = prompt || "Summarize patient status and clinical recommendations.";
    if (patientData) {
      userMessage += `\n\n[Patient Clinical Context]:\n${JSON.stringify(patientData, null, 2)}`;
    }

    if (taskType === "lab_analysis") {
      systemInstruction += " Focus on interpreting abnormal lab values, potential underlying etiologies, and recommended follow-up diagnostic tests.";
    } else if (taskType === "prescription_check") {
      systemInstruction += " Focus on potential drug-drug interactions, contraindications, dosage considerations, and allergy warnings.";
    } else if (taskType === "discharge_summary") {
      systemInstruction += " Format output as a concise, high-quality Hospital Discharge Summary including admission cause, course of treatment, discharge vitals, medications, and follow-up plan.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const resultText = response.text || "No response generated.";
    return res.json({ result: resultText });
  } catch (err: any) {
    console.error("Error in Gemini Clinical Assistant:", err);
    return res.status(500).json({
      error: err.message || "Failed to process AI clinical assistance request.",
    });
  }
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`HMS Mobile Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
