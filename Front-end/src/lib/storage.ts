import {
  Patient,
  Appointment,
  Vitals,
  Admission,
  Prescription,
  LabOrder,
  StockBatch,
  PatientDiet,
  OfflineAction,
  SavedPrescriptionTemplate,
} from "../types/hms";
import {
  INITIAL_PATIENTS,
  INITIAL_APPOINTMENTS,
  INITIAL_VITALS,
  INITIAL_ADMISSIONS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_LAB_ORDERS,
  INITIAL_STOCK_BATCHES,
  INITIAL_PATIENT_DIETS,
  INITIAL_SAVED_TEMPLATES,
} from "./mockData";

const KEYS = {
  PATIENTS: "hms_patients_v1",
  APPOINTMENTS: "hms_appointments_v1",
  VITALS: "hms_vitals_v1",
  ADMISSIONS: "hms_admissions_v1",
  PRESCRIPTIONS: "hms_prescriptions_v1",
  TEMPLATES: "hms_rx_templates_v1",
  LAB_ORDERS: "hms_lab_orders_v1",
  STOCK: "hms_stock_v1",
  DIETS: "hms_diets_v1",
  OFFLINE_QUEUE: "hms_offline_queue_v1",
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to localStorage`, e);
  }
}

// Patients
export function getPatients(): Patient[] {
  return getStored<Patient[]>(KEYS.PATIENTS, INITIAL_PATIENTS);
}
export function savePatients(patients: Patient[]) {
  setStored(KEYS.PATIENTS, patients);
}
export function addPatient(patient: Patient) {
  const list = getPatients();
  list.unshift(patient);
  savePatients(list);
}

// Appointments
export function getAppointments(): Appointment[] {
  return getStored<Appointment[]>(KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
}
export function saveAppointments(appointments: Appointment[]) {
  setStored(KEYS.APPOINTMENTS, appointments);
}
export function addAppointment(apt: Appointment) {
  const list = getAppointments();
  list.unshift(apt);
  saveAppointments(list);
}
export function updateAppointmentStatus(id: string, status: Appointment["status"]) {
  const list = getAppointments();
  const updated = list.map((a) => (a.id === id ? { ...a, status } : a));
  saveAppointments(updated);
}

// Vitals
export function getVitals(): Vitals[] {
  return getStored<Vitals[]>(KEYS.VITALS, INITIAL_VITALS);
}
export function addVitals(v: Vitals) {
  const list = getVitals();
  list.unshift(v);
  setStored(KEYS.VITALS, list);
}

// Admissions
export function getAdmissions(): Admission[] {
  return getStored<Admission[]>(KEYS.ADMISSIONS, INITIAL_ADMISSIONS);
}
export function saveAdmissions(admissions: Admission[]) {
  setStored(KEYS.ADMISSIONS, admissions);
}
export function admitPatientStorage(adm: Admission) {
  const list = getAdmissions();
  list.unshift(adm);
  saveAdmissions(list);

  // Update patient status to Inpatient
  const patients = getPatients();
  const updatedPatients = patients.map((p) =>
    p.id === adm.patientId
      ? {
          ...p,
          status: "Inpatient" as const,
          assignedRoom: `Room ${adm.roomNumber}`,
          assignedBed: adm.bedNumber,
        }
      : p
  );
  savePatients(updatedPatients);
}

// Prescriptions
export function getPrescriptions(): Prescription[] {
  return getStored<Prescription[]>(KEYS.PRESCRIPTIONS, INITIAL_PRESCRIPTIONS);
}
export function addPrescriptionStorage(rx: Prescription) {
  const list = getPrescriptions();
  list.unshift(rx);
  setStored(KEYS.PRESCRIPTIONS, list);
}

// Prescription Templates
export function getSavedTemplates(): SavedPrescriptionTemplate[] {
  return getStored<SavedPrescriptionTemplate[]>(KEYS.TEMPLATES, INITIAL_SAVED_TEMPLATES);
}

// Lab Orders
export function getLabOrders(): LabOrder[] {
  return getStored<LabOrder[]>(KEYS.LAB_ORDERS, INITIAL_LAB_ORDERS);
}
export function saveLabOrders(orders: LabOrder[]) {
  setStored(KEYS.LAB_ORDERS, orders);
}
export function addLabOrderStorage(order: LabOrder) {
  const list = getLabOrders();
  list.unshift(order);
  saveLabOrders(list);
}
export function updateLabOrderStorage(id: string, updates: Partial<LabOrder>) {
  const list = getLabOrders();
  const updated = list.map((o) => (o.id === id ? { ...o, ...updates } : o));
  saveLabOrders(updated);
}

// Stock Batches
export function getStockBatches(): StockBatch[] {
  return getStored<StockBatch[]>(KEYS.STOCK, INITIAL_STOCK_BATCHES);
}
export function saveStockBatches(batches: StockBatch[]) {
  setStored(KEYS.STOCK, batches);
}

// Diets
export function getDiets(): PatientDiet[] {
  return getStored<PatientDiet[]>(KEYS.DIETS, INITIAL_PATIENT_DIETS);
}
export function saveDiets(diets: PatientDiet[]) {
  setStored(KEYS.DIETS, diets);
}

// Offline Queue
export function getOfflineQueue(): OfflineAction[] {
  return getStored<OfflineAction[]>(KEYS.OFFLINE_QUEUE, []);
}
export function addOfflineAction(actionType: string, payload: any) {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    id: `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actionType,
    payload,
    timestamp: new Date().toISOString(),
    synced: false,
  };
  queue.push(newAction);
  setStored(KEYS.OFFLINE_QUEUE, queue);
  return newAction;
}
export function clearOfflineQueue() {
  setStored(KEYS.OFFLINE_QUEUE, []);
}

// Notifications System Storage
export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  category: "emergency" | "lab" | "pharmacy" | "appointment";
  timestamp: string;
  isRead: boolean;
  priority: "high" | "medium" | "low";
}

const NOTIFICATIONS_KEY = "hms_notifications_v1";

export function getStoredNotifications(): SystemNotification[] {
  return getStored<SystemNotification[]>(NOTIFICATIONS_KEY, []);
}

export function saveStoredNotifications(notifs: SystemNotification[]) {
  setStored(NOTIFICATIONS_KEY, notifs);
}

export function addSystemNotification(notif: {
  title: string;
  message: string;
  category: "emergency" | "lab" | "pharmacy" | "appointment";
  priority?: "high" | "medium" | "low";
  id?: string;
  timestamp?: string;
  isRead?: boolean;
}) {
  const list = getStoredNotifications();
  const newNotif: SystemNotification = {
    id: notif.id || `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    title: notif.title,
    message: notif.message,
    category: notif.category,
    timestamp: notif.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    isRead: notif.isRead ?? false,
    priority: notif.priority || "medium",
  };
  const isDuplicate = list.some((n) => n.title === newNotif.title && n.message === newNotif.message);
  if (!isDuplicate) {
    list.unshift(newNotif);
    saveStoredNotifications(list);
  }
  return newNotif;
}

export function clearAllNotifications() {
  setStored(NOTIFICATIONS_KEY, []);
}
