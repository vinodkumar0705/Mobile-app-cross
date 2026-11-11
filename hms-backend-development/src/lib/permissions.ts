export const permissions = [
    { code: "doctor", name: "Doctors module", description: "Doctors module" },
    { code: "patientManagement", name: "Patient Managenment module", description: "Patient Managenment module" },
    { code: "permissions", name: "Permissions module", description: "Permissions module" },
    { code: "configuration", name: "Configuration module", description: "Configuration module" },
    { code: "pharmacyBilling", name: "Pharmacy Billing module", description: "Pharmacy Billing module" },
    { code: "logistics", name: "Logistics module", description: "Logistics module" },
    // {code:"auditlogs", name:"Audit Log module", description:"Audit Logs module"},
] as const;

export type PermissionCode = (typeof permissions)[number]["code"];
export const codesArray = permissions.map((permission) => permission.code);