import { apiRequest } from "../lib/apiClient";
import { Appointment, Admission, AppointmentStatus } from "../types/hms";
import { getAppointments, getAdmissions } from "../lib/storage";

export const appointmentService = {
  async getAllAppointments(): Promise<{ success: boolean; data: Appointment[]; isLiveBackend: boolean }> {
    // 1. Try querying /patient/getAllAppointments?limit=200 which returns ALL database appointments across all doctors
    let res = await apiRequest("/patient/getAllAppointments?limit=200");

    // 2. Fallback to /doctor/getAllAppointments if needed
    if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
      res = await apiRequest("/doctor/getAllAppointments");
    }

    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mappedAppointments: Appointment[] = res.data.map((item: any, idx: number) => {
        // Patient Name mapping
        const pFName = item.patient?.user?.fName || item.patient?.fName || item.patientUser?.fName || item.user?.fName || "";
        const pLName = item.patient?.user?.lName || item.patient?.lName || item.patientUser?.lName || item.user?.lName || "";
        let patientName = [pFName, pLName].filter((n: string) => Boolean(n) && n.trim() !== "User").join(" ").trim();
        if (!patientName) {
          patientName = item.patientName || item.patient?.name || (typeof item.patientUser === "string" ? item.patientUser : "") || `Patient #${idx + 1}`;
        }

        // Patient Phone mapping
        const patientPhone = item.patient?.user?.phoneNumber || item.patient?.phoneNumber || item.patientPhone || "+1 555-0199";

        // Doctor Name mapping
        const dFName = item.doctor?.user?.fName || item.doctor?.fName || "";
        const dLName = item.doctor?.user?.lName || item.doctor?.lName || "";
        const doctorName = [dFName, dLName].filter(Boolean).join(" ") ? `Dr. ${[dFName, dLName].filter(Boolean).join(" ")}` : item.doctorName || "Dr. Sarah Vance";

        // Status mapping
        let mappedStatus: AppointmentStatus = "Scheduled";
        const rawStatus = (item.status || "").toUpperCase();
        if (rawStatus === "CONFIRMED" || rawStatus === "SCHEDULED") mappedStatus = "Scheduled";
        else if (rawStatus === "IN_PROGRESS" || rawStatus === "IN-CONSULTATION") mappedStatus = "In-Consultation";
        else if (rawStatus === "COMPLETED") mappedStatus = "Completed";
        else if (rawStatus === "CANCELLED") mappedStatus = "Cancelled";

        // Time slot formatting
        let formattedTime = "10:30 AM";
        if (item.startTime) {
          try {
            formattedTime = new Date(item.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          } catch (e) {}
        } else if (item.timeSlot) {
          formattedTime = item.timeSlot;
        }

        // Patient Age, Gender, Blood Group mapping
        const patientAge = item.patientAge || item.patient?.age || item.patient?.user?.age || item.age || item.patientUser?.age || "";
        const patientGender = item.patientGender || item.patient?.gender || item.patient?.user?.gender || item.gender || item.patientUser?.gender || "";
        const patientBloodGroup = item.patientBloodGroup || item.patient?.bloodGroup || item.patient?.user?.bloodGroup || item.bloodGroup || item.patientUser?.bloodGroup || "";

        return {
          id: item.id || `APT-${1000 + idx}`,
          tokenNumber: item.tokenNumber || idx + 1,
          patientId: item.patient?.id || item.patientId || `PAT-${1000 + idx}`,
          patientName,
          patientPhone,
          patientAge,
          patientGender,
          patientBloodGroup,
          doctorId: item.doctor?.id || item.doctorId || "U-101",
          doctorName,
          department: item.department || item.doctor?.department || "General Medicine",
          date: item.appointmentDate ? new Date(item.appointmentDate).toISOString().split("T")[0] : item.date || new Date().toISOString().split("T")[0],
          timeSlot: formattedTime,
          type: item.appointmentType || item.type || "OPD Regular",
          status: mappedStatus,
          chiefComplaint: item.chiefComplaint || item.reason || "General Consultation",
          consultationFee: item.paidAmount || item.doctor?.consultationCharge || item.fee || 75,
          paymentStatus: item.paidAmount ? "Paid" : "Pending",
        } as Appointment & { patientAge?: string; patientGender?: string; patientBloodGroup?: string };
      });

      return { success: true, data: mappedAppointments, isLiveBackend: true };
    }

    return { success: true, data: getAppointments(), isLiveBackend: false };
  },

  async getAllAdmissions(): Promise<{ success: boolean; data: Admission[]; isLiveBackend: boolean }> {
    let res = await apiRequest("/doctor/getAllAdmissions");
    if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
      res = await apiRequest("/patient/getAllAdmissions");
    }

    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mappedAdmissions: Admission[] = res.data.map((item: any, idx: number) => {
        const pFName = item.patient?.user?.fName || item.patient?.fName || "";
        const pLName = item.patient?.user?.lName || item.patient?.lName || "";
        const patientName = [pFName, pLName].filter(Boolean).join(" ") || item.patientName || "Patient";

        const dFName = item.doctor?.user?.fName || item.doctor?.fName || "";
        const dLName = item.doctor?.user?.lName || item.doctor?.lName || "";
        const admittingDoctor = [dFName, dLName].filter(Boolean).join(" ") ? `Dr. ${[dFName, dLName].filter(Boolean).join(" ")}` : item.admittingDoctor || "Dr. Sarah Vance, MD";

        return {
          id: item.id || `ADM-${8000 + idx}`,
          patientId: item.patient?.id || item.patientId || `PAT-${1000 + idx}`,
          patientName,
          roomId: item.roomId || item.room?.id || "ROOM-302",
          roomNumber: item.roomNumber || item.room?.roomNumber || "302",
          bedNumber: item.bedNumber || "Bed-01",
          admittedDate: item.admittedDate ? new Date(item.admittedDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          admittingDoctor,
          reasonForAdmission: item.reasonForAdmission || item.reason || "Post-Op Monitoring",
          status: item.status || "Admitted",
          cateringDietType: item.cateringDietType || "Diabetic Soft Diet",
        };
      });
      return { success: true, data: mappedAdmissions, isLiveBackend: true };
    }

    return { success: true, data: getAdmissions(), isLiveBackend: false };
  },

  async createAppointment(data: {
    patientName: string;
    patientPhone: string;
    patientAge?: string;
    patientGender?: string;
    patientBloodGroup?: string;
    doctorId: string;
    doctorName?: string;
    department?: string;
    date: string;
    timeSlot: string;
    chiefComplaint: string;
    consultationFee?: number;
    status?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const names = data.patientName.trim().split(" ");
    const fName = names[0] || "Patient";
    const lName = names.slice(1).join(" ");

    const payload = {
      patientInfo: {
        fName,
        lName,
        phoneNumber: data.patientPhone || "+91 9876543210",
        age: data.patientAge || "30",
        gender: data.patientGender || "MALE",
        bloodGroup: data.patientBloodGroup || "O+",
      },
      doctorId: data.doctorId,
      appointmentDate: data.date,
      reason: data.chiefComplaint,
      paidAmount: data.consultationFee || 75,
      status: "CONFIRMED",
    };

    const res = await apiRequest("/patient/bookAppointment", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to save appointment to database" };
  },
};
