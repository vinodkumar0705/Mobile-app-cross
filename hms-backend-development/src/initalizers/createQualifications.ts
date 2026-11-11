import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const mockQualifications: Prisma.QualificationCreateManyInput[] = [
    { name: "MBBS" },
    { name: "MD" },
    { name: "MS" },
    { name: "PhD" },
    { name: "DMD" },
    { name: "DDS" },
    { name: "DVM" },
    { name: "DSS" },
    { name: "DSSM" },
    { name: "DVD" },
];
export async function createQualifications() {
    try {
        await prisma.qualification.deleteMany();
        const qualifications = await prisma.qualification.createMany({
            data: mockQualifications,
        });
        console.log("Qualifications created", qualifications);
    } catch (error) {
        console.log("Error creating qualifications", error);
    }
}
