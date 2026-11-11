import { apiRequest } from "../lib/apiClient";
import { Patient } from "../types/hms";
import { getPatients as getStoredPatients } from "../lib/storage";

export const patientService = {
  async getPatients(): Promise<{ success: boolean; data: Patient[]; isLiveBackend: boolean }> {
    const res = await apiRequest("/patient");
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mappedPatients: Patient[] = res.data.map((item: any, idx: number) => ({
        id: item.id || `PAT-${1000 + idx}`,
        uhid: item.uhid || item.patientId || `HMS-2026-${1000 + idx}`,
        name: [item.fName, item.lName].filter(Boolean).join(" ") || item.name || "Patient",
        age: item.age || 35,
        gender: item.gender || "Other",
        bloodGroup: item.bloodGroup || "O+",
        phone: item.phoneNumber || item.phone || "+1 555-0199",
        email: item.email || "patient@hms-hospital.org",
        address: item.address || "Main Street, Metro City",
        emergencyContact: {
          name: item.emergencyContactName || "Emergency Contact",
          relationship: item.emergencyContactRel || "Spouse",
          phone: item.emergencyPhone || "+1 555-0199",
        },
        allergies: Array.isArray(item.allergies) ? item.allergies : ["None reported"],
        chronicConditions: Array.isArray(item.chronicConditions) ? item.chronicConditions : ["Hypertension"],
        registeredDate: item.createdAt ? new Date(item.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        status: item.isAdmitted ? "Inpatient" : "Outpatient",
      }));
      return { success: true, data: mappedPatients, isLiveBackend: true };
    }

    return { success: true, data: getStoredPatients(), isLiveBackend: false };
  },

  async createPatient(patientData: Partial<Patient>): Promise<{ success: boolean; data?: Patient; error?: string }> {
    const res = await apiRequest("/patient", {
      method: "POST",
      body: JSON.stringify(patientData),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to create patient record" };
  },

  async getPatientHistory(patientId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await apiRequest(`/patient/getPatientHistory/${patientId}`);
    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to fetch patient history from database" };
  },

  async getPatientMedicalHistory(patientId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await apiRequest(`/patient/getPatientMedicalHistory/${patientId}`);
    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to fetch medical history from database" };
  },
};
