// API Client for connecting HMS Front-end with Express Backend (hms-backend-development)

export const DEFAULT_LAN_IP = "192.168.15.84";
const DEFAULT_API_BASE_URL = `http://${DEFAULT_LAN_IP}:8080/api/v1`;
const DEFAULT_HEALTH_URL = `http://${DEFAULT_LAN_IP}:8080/api/health`;

export const getApiBaseUrl = (): string => {
  try {
    const custom = localStorage.getItem("hms_custom_api_url");
    if (custom && custom.trim().length > 0) {
      if (custom.includes("192.168.15.208")) {
        localStorage.removeItem("hms_custom_api_url");
      } else {
        return custom.trim();
      }
    }
  } catch (e) {}

  if ((import.meta as any).env?.VITE_API_BASE_URL) {
    return (import.meta as any).env.VITE_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    // Web browser running on localhost or 127.0.0.1 -> ALWAYS connect directly to localhost:8080
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8080/api/v1";
    }

    // Web browser accessed via LAN IP or domain
    if (window.location.hostname && window.location.hostname !== "") {
      return `http://${window.location.hostname}:8080/api/v1`;
    }

    // Capacitor native app or mobile web environment
    if (
      window.location.protocol === "capacitor:" ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ) {
      return `http://${DEFAULT_LAN_IP}:8080/api/v1`;
    }
  }

  return "http://localhost:8080/api/v1";
};

export const setCustomApiBaseUrl = (url: string): void => {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem("hms_custom_api_url");
    } else {
      let formatted = url.trim();
      if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
        formatted = `http://${formatted}`;
      }
      if (!formatted.endsWith("/api/v1")) {
        formatted = `${formatted.replace(/\/$/, "")}/api/v1`;
      }
      localStorage.setItem("hms_custom_api_url", formatted);
    }
  } catch (e) {}
};

export const DEFAULT_AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXYwdm5oa3cwMDIycG90emx2NnhrcHFmIiwiaWF0IjoxNzkxODc2MTA4LCJleHAiOjE4MjM0MzM3MDh9.8UE8Y427pPDdSUlspHrqSnFUP3T8-Tg6YDW4XzluSl8";

export const getAuthToken = (): string | null => {
  try {
    const token = localStorage.getItem("hms_auth_token");
    if (token && token.trim().length > 0) {
      return token.trim();
    }
  } catch (e) {}
  return DEFAULT_AUTH_TOKEN;
};

export const setAuthToken = (token: string): void => {
  try {
    localStorage.setItem("hms_auth_token", token);
  } catch (e) {
    console.warn("Failed to save auth token to localStorage", e);
  }
};

export const removeAuthToken = (): void => {
  try {
    localStorage.removeItem("hms_auth_token");
  } catch (e) {
    console.warn("Failed to remove auth token", e);
  }
};

export const getAuthUser = (): any | null => {
  try {
    const userStr = localStorage.getItem("hms_auth_user");
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const setAuthUser = (user: any): void => {
  try {
    localStorage.setItem("hms_auth_user", JSON.stringify(user));
  } catch (e) {
    console.warn("Failed to save auth user to localStorage", e);
  }
};

export const removeAuthUser = (): void => {
  try {
    localStorage.removeItem("hms_auth_user");
  } catch (e) {
    console.warn("Failed to remove auth user", e);
  }
};

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export async function checkBackendHealth(): Promise<{ isOnline: boolean; service?: string }> {
  const tryUrl = async (url: string) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        return { isOnline: true, service: data.service || "backend" };
      }
    } catch (err) {}
    return { isOnline: false };
  };

  const primaryBase = getApiBaseUrl().replace(/\/api\/v1\/?$/, "");
  const primaryHealth = `${primaryBase}/api/health`;
  const primaryRes = await tryUrl(primaryHealth);
  if (primaryRes.isOnline) return primaryRes;

  const lanHealth = `http://${DEFAULT_LAN_IP}:8080/api/health`;
  if (primaryHealth !== lanHealth) {
    const lanRes = await tryUrl(lanHealth);
    if (lanRes.isOnline) return lanRes;
  }

  const localHealth = `http://localhost:8080/api/health`;
  if (primaryHealth !== localHealth && (lanHealth as string) !== localHealth) {
    const localRes = await tryUrl(localHealth);
    if (localRes.isOnline) return localRes;
  }

  return { isOnline: false };
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const { params, headers, ...customConfig } = options;
  let baseUrl = getApiBaseUrl();

  const makeCall = async (base: string) => {
    let url = `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const token = getAuthToken();
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const config: RequestInit = {
        method: options.method || "GET",
        headers: requestHeaders,
        credentials: "include",
        signal: controller.signal,
        ...customConfig,
      };

      const response = await fetch(url, config);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: responseData.message || responseData.error || `HTTP error! status: ${response.status}`,
        };
      }

      return {
        success: true,
        data: responseData.data !== undefined ? responseData.data : responseData,
        message: responseData.message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await makeCall(baseUrl);
  } catch (err: any) {
    console.warn(`[API Client] Request to ${baseUrl}${endpoint} failed. Trying fallback...`, err);
    // 1. Try localhost if baseUrl wasn't localhost
    if (baseUrl !== "http://localhost:8080/api/v1") {
      try {
        return await makeCall("http://localhost:8080/api/v1");
      } catch (locErr: any) {}
    }
    // 2. Try LAN IP if baseUrl wasn't LAN IP
    const fallbackBase = `http://${DEFAULT_LAN_IP}:8080/api/v1`;
    if (baseUrl !== fallbackBase) {
      try {
        return await makeCall(fallbackBase);
      } catch (fallbackErr: any) {}
    }
    return {
      success: false,
      error: err.message || "Network request failed. Is the backend server running?",
    };
  }
}

