import { apiRequest } from "../lib/apiClient";
import { LabOrder, LabParameterResult } from "../types/hms";

export interface LabTestConfig {
  id: string;
  name: string;
  description?: string;
  category?: "BLOOD" | "URINE" | "IMAGING" | "CARDIAC" | "PATHOLOGY" | "MICROBIOLOGY" | "OTHER" | string;
  price?: number;
  duration?: string;
  preparationInstructions?: string;
  reportType?: "NUMERIC" | "TEXT" | "RANGE" | "IMAGE" | "MULTIPLE" | string;
  isActive?: boolean;
  parameters?: Array<{
    id?: string;
    labConfigId?: string;
    name: string;
    unit?: string;
    normalRange?: string;
    isCritical?: boolean;
  }>;
}

export const labService = {
  /**
   * Fetches the complete master list of Diagnostic Tests / Panels (LabConfiguration) from the PostgreSQL database.
   */
  async getLabConfigurations(): Promise<{ success: boolean; data: LabTestConfig[]; isLiveBackend: boolean }> {
    const res = await apiRequest("/organization/labConfiguration");
    if (res.success && Array.isArray(res.data)) {
      const mapped: LabTestConfig[] = res.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        category: item.category || "BLOOD",
        price: typeof item.price === "number" ? item.price : Number(item.price) || 0,
        duration: item.duration || "Same Day",
        preparationInstructions: item.preparationInstructions || "",
        reportType: item.reportType || "RANGE",
        isActive: item.isActive !== false,
        parameters: Array.isArray(item.parameters) ? item.parameters : [],
      }));
      return { success: true, data: mapped, isLiveBackend: true };
    }
    return { success: false, data: [], isLiveBackend: false };
  },

  /**
   * Creates a new Diagnostic Test in the PostgreSQL database (LabConfiguration table).
   */
  async createLabConfiguration(config: {
    name: string;
    category?: "BLOOD" | "URINE" | "IMAGING" | "CARDIAC" | "PATHOLOGY" | "MICROBIOLOGY" | "OTHER";
    price?: string | number;
    duration?: string;
    description?: string;
    reportType?: "NUMERIC" | "TEXT" | "RANGE" | "IMAGE" | "MULTIPLE";
    parameters?: Array<{ name: string; unit?: string; normalRange?: string; isCritical?: boolean }>;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const payload: any = {
      name: config.name.trim(),
      description: config.description || "",
      category: config.category || "BLOOD",
      price: config.price ? String(config.price) : "0",
      duration: config.duration || "Same Day",
      reportType: config.reportType || "RANGE",
      isActive: true,
    };

    if (config.parameters && config.parameters.length > 0) {
      payload.parameters = {
        create: config.parameters.map((p) => ({
          name: p.name,
          unit: p.unit || "",
          normalRange: p.normalRange || "",
          isCritical: !!p.isCritical,
        })),
      };
    }

    const res = await apiRequest("/organization/labConfiguration", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to create lab test in database" };
  },

  /**
   * Fetches all live Lab Orders from PostgreSQL database with full relations (Patient, Doctor, TestIds, Results).
   */
  async getAllLabOrders(): Promise<{ success: boolean; data: LabOrder[]; isLiveBackend: boolean }> {
    const res = await apiRequest("/lab/getLabOrders?limit=100");
    if (res.success && Array.isArray(res.data)) {
      const mappedOrders: LabOrder[] = res.data.map((item: any, idx: number) => {
        // Patient Name mapping from relation patient.user
        const pFName = item.patient?.user?.fName || item.patient?.fName || "";
        const pLName = item.patient?.user?.lName || item.patient?.lName || "";
        const patientName = [pFName, pLName].filter(Boolean).join(" ") || item.patientName || "Patient";

        // Doctor Name mapping from relation doctor.user
        const dFName = item.doctor?.user?.fName || item.doctor?.fName || "";
        const dLName = item.doctor?.user?.lName || item.doctor?.lName || "";
        const doctorName = [dFName, dLName].filter(Boolean).join(" ")
          ? `Dr. ${[dFName, dLName].filter(Boolean).join(" ")}`
          : item.doctorName || "Dr. Sarah Vance";

        // Test Name mapping from relation testIds array
        let testName = "Complete Blood Count (CBC)";
        if (Array.isArray(item.testIds) && item.testIds.length > 0) {
          testName = item.testIds.map((t: any) => t.name).filter(Boolean).join(", ");
        } else if (item.testName) {
          testName = item.testName;
        }

        // Category mapping
        const category = item.testIds?.[0]?.category || item.category || "Biochemistry";

        // Status mapping (normalize PENDING -> Pending, COMPLETED -> Completed, etc.)
        let status: LabOrder["status"] = "Pending";
        const rawStatus = (item.status || "").toUpperCase();
        if (rawStatus === "COMPLETED" || rawStatus === "VERIFIED") status = "Completed";
        else if (rawStatus === "PROCESSING" || rawStatus === "COLLECTED") status = "Processing";
        else if (rawStatus === "CANCELLED") status = "Cancelled";
        else status = "Pending";

        // Cost mapping
        const cost = typeof item.totalPrice === "number"
          ? item.totalPrice
          : item.testIds?.[0]?.dynamicPrice || item.cost || 50;

        // Date mapping
        const dateVal = item.orderDate || item.createdAt;
        const orderedDate = dateVal
          ? new Date(dateVal).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        return {
          id: item.id || `LAB-${5000 + idx}`,
          patientId: item.patientId || item.patient?.id || "PAT-1092",
          patientName,
          doctorId: item.doctorId || item.doctor?.id || "U-101",
          doctorName,
          testName,
          category,
          orderedDate,
          sampleType: item.sampleType || "Venous Blood / Specimen",
          status,
          cost,
          results: Array.isArray(item.labTestResults)
            ? item.labTestResults
            : Array.isArray(item.results)
            ? item.results
            : [],
          notes: item.notes || "",
          verifiedBy: item.verifiedBy || "",
        };
      });
      return { success: true, data: mappedOrders, isLiveBackend: true };
    }

    return { success: false, data: [], isLiveBackend: false };
  },

  /**
   * Dispatches a new Lab Order directly into PostgreSQL (LabOrder table).
   */
  async createLabOrder(data: {
    patientId: string;
    doctorId: string;
    testIds: string[];
    notes?: string;
    admissionId?: string;
    visitId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await apiRequest("/lab/createLabOrder", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to create lab order in database" };
  },

  async enterLabValues(orderId: string, results: LabParameterResult[]): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await apiRequest(`/lab/enterLabValues/${orderId}`, {
      method: "POST",
      body: JSON.stringify({ results }),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to submit lab parameter values" };
  },
};
