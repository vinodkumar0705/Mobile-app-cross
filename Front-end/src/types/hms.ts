export type UserRole =
  | "admin"
  | "doctor"
  | "clinical_nurse"
  | "lab_tech"
  | "pharmacist"
  | "patient";

export type PermissionCode =
  | "patientManagement"
  | "doctor"
  | "laboratory"
  | "reports"
  | "configuration"
  | "referralDashboard"
  | "pharmacyBilling"
  | "logistics"
  | "permissions";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department?: string;
  phone?: string;
  branch?: string;
  patientId?: string; // If role === 'patient'
  permissions: PermissionCode[];
}

export interface Patient {
  id: string; // e.g. PAT-1092
  uhid: string; // Unique Health ID e.g. HMS-2026-9812
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  bloodGroup: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: string[];
  chronicConditions: string[];
  registeredDate: string;
  status: "Outpatient" | "Inpatient" | "Discharged";
  assignedDoctor?: string;
  assignedRoom?: string;
  assignedBed?: string;
}

export interface Vitals {
  id: string;
  patientId: string;
  timestamp: string;
  bpSystolic: number;
  bpDiastolic: number;
  pulseRate: number; // bpm
  temperature: number; // °F
  spO2: number; // %
  respiratoryRate: number; // /min
  bloodSugar?: number; // mg/dL
  recordedBy: string;
  notes?: string;
}

export type AppointmentStatus =
  | "Scheduled"
  | "In-Consultation"
  | "Completed"
  | "Cancelled"
  | "No-Show";

export interface Appointment {
  id: string; // e.g. APT-4012
  tokenNumber: number; // e.g. 14
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  timeSlot: string;
  type: "OPD Regular" | "Follow-up" | "Emergency" | "Teleconsult";
  status: AppointmentStatus;
  chiefComplaint: string;
  consultationFee: number;
  paymentStatus: "Paid" | "Pending";
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage: string; // e.g. 500mg
  frequency: string; // e.g. 1-0-1 (BD)
  duration: string; // e.g. 5 Days
  instructions: string; // e.g. After meals
  quantity: number;
  unitPrice: number;
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  admissionId?: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string;
  diagnosis: string[];
  icdCodes?: string[];
  items: PrescriptionItem[];
  vitalsAtPrescription?: Vitals;
  doctorNotes?: string;
  followUpDate?: string;
}

export interface SavedPrescriptionTemplate {
  id: string;
  title: string;
  category: string;
  diagnosis: string;
  items: Omit<PrescriptionItem, "id">[];
}

export interface Room {
  id: string; // e.g. ROOM-302
  number: string; // 302
  type: "General Ward" | "Semi-Private" | "Private Suite" | "ICU" | "NICU";
  floor: string; // Floor 3
  wing: string; // East Wing
  ratePerDay: number; // ₹ / $
  totalBeds: number;
  occupiedBeds: number;
  amenities: string[];
}

export interface Admission {
  id: string; // e.g. ADM-8041
  patientId: string;
  patientName: string;
  roomId: string;
  roomNumber: string;
  bedNumber: string;
  admittedDate: string;
  dischargedDate?: string;
  admittingDoctor: string;
  reasonForAdmission: string;
  status: "Admitted" | "Discharged" | "Transferred";
  cateringDietType: string;
}

export type LabOrderStatus =
  | "Pending"
  | "Sample Collected"
  | "In Analysis"
  | "Processing"
  | "Verified"
  | "Completed"
  | "Cancelled";

export interface LabParameterResult {
  parameterName: string;
  value: string;
  unit: string;
  referenceRange: string;
  isAbnormal: boolean;
}

export interface LabOrder {
  id: string; // e.g. LAB-9012
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  testName: string;
  category: "Hematology" | "Biochemistry" | "Radiology" | "Microbiology" | "Pathology";
  orderedDate: string;
  sampleType: string;
  status: LabOrderStatus;
  cost: number;
  results?: LabParameterResult[];
  notes?: string;
  verifiedBy?: string;
}

export interface StockBatch {
  id: string; // BATCH-501
  drugName: string;
  genericName: string;
  category: "Tablet" | "Syrup" | "Injection" | "Ointment" | "Equipment";
  batchNumber: string;
  manufacturer: string;
  expiryDate: string;
  quantityInStock: number;
  unitPrice: number;
  mrp: number;
  reorderLevel: number;
}

export interface PharmacyBillItem {
  drugId: string;
  drugName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PharmacyBill {
  id: string; // PHARM-2091
  patientId: string;
  patientName: string;
  date: string;
  items: PharmacyBillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: "Cash" | "Card" | "UPI/Online" | "Insurance";
  status: "Paid" | "Pending";
}

export interface FoodItem {
  id: string;
  name: string;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  dietType: "Regular" | "Diabetic Low Sodium" | "High Protein" | "Clear Liquid" | "Renal";
  calories: number;
  price: number;
}

export interface PatientDiet {
  id: string;
  admissionId: string;
  patientName: string;
  roomBed: string;
  dietType: string;
  breakfastStatus: "Ordered" | "Delivered" | "NPO";
  lunchStatus: "Ordered" | "Delivered" | "NPO";
  dinnerStatus: "Ordered" | "Delivered" | "NPO";
  specialInstructions?: string;
}

export interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  designation: string;
  department: string;
  phone: string;
  email: string;
  status: "Active" | "On Leave" | "Off Duty";
  opdRoomNumber?: string;
}

export interface OfflineAction {
  id: string;
  actionType: string; // e.g. "ADD_VITALS", "BOOK_APPOINTMENT", "ADD_PRESCRIPTION", "SUBMIT_LAB"
  payload: any;
  timestamp: string;
  synced: boolean;
}

export type PlatformType = "ios" | "android" | "responsive";

export interface MobileDeviceConfig {
  platform: PlatformType;
  isOffline: boolean;
  batteryLevel: number;
  wifiSignal: "High" | "Medium" | "Low";
}
