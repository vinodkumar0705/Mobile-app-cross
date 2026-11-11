export type LanguageCode = "en" | "hi" | "te" | "es";

export interface Translations {
  hospitalName: string;
  subTitle: string;
  menu: string;
  staffSignIn: string;
  serverOnline: string;
  emergencyLine: string;
  doctorHub: string;
  patientPortal: string;
  laboratory: string;
  pharmacy: string;
  adminOverview: string;
  patients: string;
  appointments: string;
  vitals: string;
  prescriptions: string;
  labReports: string;
  stockInventory: string;
  addStock: string;
  checkout: string;
  payNow: string;
  notifications: string;
  language: string;
}

export const TRANSLATIONS: Record<LanguageCode, Translations> = {
  en: {
    hospitalName: "Sudheer Hospital",
    subTitle: "Centralized Hospital Management System",
    menu: "Menu",
    staffSignIn: "Staff Portal Sign In",
    serverOnline: "Server Online",
    emergencyLine: "Emergency Line: +1 (800) 555-0199",
    doctorHub: "Doctor Portal",
    patientPortal: "Patient Portal",
    laboratory: "Clinical Lab",
    pharmacy: "Pharmacy POS",
    adminOverview: "Admin Overview",
    patients: "Patients",
    appointments: "Appointments",
    vitals: "Vitals & Telemetry",
    prescriptions: "Prescriptions",
    labReports: "Lab Reports",
    stockInventory: "Stock Inventory",
    addStock: "Add New Medicine Stock",
    checkout: "Checkout & Print Invoice",
    payNow: "Pay Now",
    notifications: "Notifications",
    language: "Language",
  },
  hi: {
    hospitalName: "सुधीर अस्पताल",
    subTitle: "केन्द्रीकृत अस्पताल प्रबंधन प्रणाली",
    menu: "मेनू",
    staffSignIn: "स्टाफ पोर्टल साइन इन",
    serverOnline: "सर्वर ऑनलाइन",
    emergencyLine: "आपातकालीन नंबर: +1 (800) 555-0199",
    doctorHub: "डॉक्टर पोर्टल",
    patientPortal: "मरीज पोर्टल",
    laboratory: "पैथोलॉजी लैब",
    pharmacy: "फार्मेसी बिलिंग",
    adminOverview: "प्रशासन अवलोकन",
    patients: "मरीज",
    appointments: "अपॉइंटमेंट",
    vitals: "महत्वपूर्ण लक्षण (Vitals)",
    prescriptions: "दवा पर्ची (Prescriptions)",
    labReports: "लैब रिपोर्ट",
    stockInventory: "दवा स्टॉक",
    addStock: "नया दवा स्टॉक जोड़ें",
    checkout: "बिल भुगतान एवं प्रिंट",
    payNow: "अभी भुगतान करें",
    notifications: "सूचनाएं",
    language: "भाषा",
  },
  te: {
    hospitalName: "సుధీర్ హాస్పిటల్",
    subTitle: "కేంద్రీకృత హాస్పిటల్ నిర్వహణ వ్యవస్థ",
    menu: "మెనూ",
    staffSignIn: "సిబ్బంది పోర్టల్ లాగిన్",
    serverOnline: "సర్వర్ ఆన్‌లైన్",
    emergencyLine: "అత్యవసర నంబర్: +1 (800) 555-0199",
    doctorHub: "డాక్టర్ పోర్టల్",
    patientPortal: "రోగి పోర్టల్",
    laboratory: "క్లినికల్ ల్యాబ్",
    pharmacy: "ఫార్మసీ బిల్లింగ్",
    adminOverview: "అడ్మిన్ ఓవర్‌వ్యూ",
    patients: "రోగులు",
    appointments: "అపాయింట్‌మెంట్లు",
    vitals: "వైటల్స్ & టెలిమెట్రీ",
    prescriptions: "మందుల చీటీ",
    labReports: "ల్యాబ్ రిపోర్టులు",
    stockInventory: "స్టాక్ ఇన్వెంటరీ",
    addStock: "కొత్త మందుల స్టాక్ చేర్చు",
    checkout: "చెల్లింపు & ప్రింట్",
    payNow: "ఇప్పుడే చెల్లించండి",
    notifications: "నోటిఫికేషన్లు",
    language: "భాష",
  },
  es: {
    hospitalName: "Hospital Sudheer",
    subTitle: "Sistema Centralizado de Gestión Hospitalaria",
    menu: "Menú",
    staffSignIn: "Acceso al Portal de Personal",
    serverOnline: "Servidor En Línea",
    emergencyLine: "Línea de Emergencia: +1 (800) 555-0199",
    doctorHub: "Portal Médico",
    patientPortal: "Portal del Paciente",
    laboratory: "Laboratorio Clínico",
    pharmacy: "Farmacia y Caja",
    adminOverview: "Visión General Admin",
    patients: "Pacientes",
    appointments: "Citas Médicas",
    vitals: "Signos Vitales",
    prescriptions: "Recetas Médicas",
    labReports: "Informes de Lab",
    stockInventory: "Inventario de Medicinas",
    addStock: "Agregar Nuevo Stock",
    checkout: "Cobrar e Imprimir",
    payNow: "Pagar Ahora",
    notifications: "Notificaciones",
    language: "Idioma",
  },
};

export const getStoredLanguage = (): LanguageCode => {
  try {
    const lang = localStorage.getItem("hms_user_lang");
    return (lang as LanguageCode) || "en";
  } catch (e) {
    return "en";
  }
};

export const setStoredLanguage = (lang: LanguageCode): void => {
  try {
    localStorage.setItem("hms_user_lang", lang);
  } catch (e) {
    console.warn("Failed to set language preference", e);
  }
};
