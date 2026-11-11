import { apiRequest } from "../lib/apiClient";

export interface OrganizationInfo {
  id: string;
  brandName: string;
  legalName: string;
  organizationLogo?: string | null;
  organizationTagline?: string | null;
  officialEmail?: string | null;
  officialPhoneNumber?: string | null;
}

const ORG_LOGO_CACHE_KEY = "hms_cached_org_logo";
const ORG_NAME_CACHE_KEY = "hms_cached_org_name";

export const organizationService = {
  getCachedLogo(): string | null {
    try {
      return localStorage.getItem(ORG_LOGO_CACHE_KEY);
    } catch (e) {
      return null;
    }
  },

  getCachedName(): string {
    try {
      return localStorage.getItem(ORG_NAME_CACHE_KEY) || "Sudheer Hospital";
    } catch (e) {
      return "Sudheer Hospital";
    }
  },

  async getOrganizationDetails(): Promise<{ success: boolean; data?: OrganizationInfo; logoUrl?: string; error?: string }> {
    const res = await apiRequest("/organization/organization");

    if (res.success && res.data) {
      // res.data can be an array of organization objects or a single object
      const org = Array.isArray(res.data) ? res.data[0] : res.data;
      if (org) {
        const logo = org.organizationLogo || null;
        const name = org.legalName || org.brandName || "Sudheer Hospital";

        if (logo) {
          try {
            localStorage.setItem(ORG_LOGO_CACHE_KEY, logo);
          } catch (e) {}
        }
        if (name) {
          try {
            localStorage.setItem(ORG_NAME_CACHE_KEY, name);
          } catch (e) {}
        }

        return {
          success: true,
          data: org,
          logoUrl: logo,
        };
      }
    }

    return {
      success: false,
      logoUrl: this.getCachedLogo() || undefined,
      error: res.error || "Failed to fetch organization details from database",
    };
  },
};
