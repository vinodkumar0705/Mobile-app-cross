import { apiRequest } from "../lib/apiClient";
import { INITIAL_STAFF } from "../lib/mockData";

export interface StaffEmployee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Off Duty";
  shift: string;
}

export const staffService = {
  async getAllEmployees(): Promise<{ success: boolean; data: StaffEmployee[]; isLiveBackend: boolean }> {
    const res = await apiRequest("/employee/getAllEmployees?limit=200");
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const mapped: StaffEmployee[] = res.data.map((item: any, idx: number) => {
        let role = item.role || item.designation;
        if (!role && Array.isArray(item.roles) && item.roles.length > 0) {
          role = item.roles.map((r: any) => r.name).join(", ");
        }
        if (!role) {
          if (item.isDoctor) role = "Doctor";
          else if (item.isAdmin) role = "Admin";
          else role = "Staff";
        }

        let dept = item.department;
        if (!dept && item.employeeInfo?.department && Array.isArray(item.employeeInfo.department)) {
          dept = item.employeeInfo.department.map((d: any) => d.name).join(", ");
        }
        if (!dept) dept = item.employeeInfo?.department?.name || "General Medicine";

        return {
          id: item.employeeInfo?.id || item.id || `EMP-${100 + idx}`,
          name: [item.fName, item.lName].filter(Boolean).join(" ") || item.name || "Staff Member",
          role,
          department: dept,
          email: item.email || "staff@hms-hospital.org",
          phone: item.phoneNumber || item.phone || "+1 555-0199",
          status: item.status || "Active",
          shift: item.shift || "Morning (08:00 - 16:00)",
          opdRoomNumber: item.employeeInfo?.id || `OPD-${101 + idx}`,
          isDoctor: item.isDoctor,
          isAdmin: item.isAdmin,
        };
      });
      return { success: true, data: mapped, isLiveBackend: true };
    }

    return {
      success: true,
      data: INITIAL_STAFF.map((stf) => ({
        id: stf.id,
        name: stf.name,
        role: stf.role,
        department: stf.department,
        email: stf.email,
        phone: stf.phone,
        status: stf.status as any,
        shift: (stf as any).shift || "Morning (08:00 - 16:00)",
        opdRoomNumber: stf.opdRoomNumber,
      })),
      isLiveBackend: false,
    };
  },

  async createEmployee(employeeData: Partial<StaffEmployee>): Promise<{ success: boolean; data?: StaffEmployee; error?: string }> {
    const res = await apiRequest("/employee/createEmployee", {
      method: "POST",
      body: JSON.stringify(employeeData),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to create staff record" };
  },

  async updateEmployee(id: string, employeeData: Partial<StaffEmployee>): Promise<{ success: boolean; data?: StaffEmployee; error?: string }> {
    const res = await apiRequest(`/employee/updateEmployee/${id}`, {
      method: "PUT",
      body: JSON.stringify(employeeData),
    });

    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || "Failed to update staff record" };
  },

  async deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiRequest(`/employee/deleteEmployee/${id}`, {
      method: "DELETE",
    });

    if (res.success) {
      return { success: true };
    }
    return { success: false, error: res.error || "Failed to delete staff record" };
  },
};
