import { Prisma } from "@prisma/client";
import { generateId } from "./generateId";

type IdType = "PATIENT" | "EMPLOYEE";

export async function generateOrganizationScopedId(tx: Prisma.TransactionClient, type: IdType) {
    const org = await tx.organization.findFirst({
        select: {
            id: true,
            patientIdPrefix: true,
            employeeIdPrefix: true,
            idLength: true,
            patientIdCounter: true,
            employeeIdCounter: true,
        },
    });

    if (!org) throw new Error("Organization not found");

    let prefix: string | null | undefined;
    let sequence: number;

    if (type === "PATIENT") {
        prefix = org.patientIdPrefix;
        sequence = org.patientIdCounter + 1;

        await tx.organization.update({
            where: { id: org.id },
            data: { patientIdCounter: sequence },
        });
    } else {
        prefix = org.employeeIdPrefix;
        sequence = org.employeeIdCounter + 1;

        await tx.organization.update({
            where: { id: org.id },
            data: { employeeIdCounter: sequence },
        });
    }

    return generateId({
        prefix,
        idLength: org.idLength ?? 6,
        sequence,
    });
}
