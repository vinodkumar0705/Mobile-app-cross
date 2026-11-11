import { apiRequest, setAuthToken, removeAuthToken, setAuthUser, removeAuthUser, getAuthToken, getAuthUser } from "../lib/apiClient";
import { User, UserRole, PermissionCode } from "../types/hms";

export interface BackendUser {
  id: string;
  fName?: string;
  lName?: string;
  username?: string;
  email?: string;
  phoneNumber?: string;
  isAdmin?: boolean;
  isDoctor?: boolean;
  isPatient?: boolean;
  token?: string;
}

export function mapBackendUserToFrontendUser(backendUser: BackendUser): User {
  const name = [backendUser.fName, backendUser.lName].filter(Boolean).join(" ") || backendUser.username || "Staff User";
  
  let role: UserRole = "admin";
  let department = "Administration";

  if (backendUser.isDoctor) {
    role = "doctor";
    department = "General Medicine & Surgery";
  } else if (backendUser.isPatient) {
    role = "patient";
    department = "Outpatient Care";
  } else if (backendUser.isAdmin) {
    role = "admin";
    department = "Executive Management";
  }

  const permissions: PermissionCode[] = [
    "patientManagement",
    "doctor",
    "laboratory",
    "reports",
    "configuration",
    "pharmacyBilling",
  ];

  return {
    id: backendUser.id || `USER-${Date.now()}`,
    name,
    email: backendUser.email || `${backendUser.username || "user"}@hms-hospital.org`,
    role,
    avatar: `https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80`,
    department,
    phone: backendUser.phoneNumber || "+1 555-0199",
    permissions,
  };
}

export const authService = {
  async login(identifier: string, password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    const res = await apiRequest("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });

    if (res.success && res.data) {
      const data = res.data;
      const token = data.token;
      if (token) {
        setAuthToken(token);
      }
      const frontendUser = mapBackendUserToFrontendUser(data);
      setAuthUser(frontendUser);
      return { success: true, user: frontendUser, token };
    }

    return { success: false, error: res.error || "Authentication failed." };
  },

  async signup(userData: { fName: string; lName: string; email: string; phoneNumber?: string; password: string; isDoctor?: boolean }) {
    const res = await apiRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (res.success && res.data) {
      const frontendUser = mapBackendUserToFrontendUser(res.data);
      if (res.data.token) {
        setAuthToken(res.data.token);
      }
      setAuthUser(frontendUser);
      return { success: true, user: frontendUser };
    }
    return { success: false, error: res.error || "Signup failed." };
  },

  async logout(): Promise<void> {
    await apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
    removeAuthToken();
    removeAuthUser();
  },

  async getCurrentUser(): Promise<User | null> {
    const cachedUser = getAuthUser();
    const token = getAuthToken();

    if (!token && !cachedUser) return null;

    const res = await apiRequest("/auth/me");
    if (res.success && res.data) {
      const frontendUser = mapBackendUserToFrontendUser(res.data);
      setAuthUser(frontendUser);
      return frontendUser;
    }

    return cachedUser || null;
  },
};
