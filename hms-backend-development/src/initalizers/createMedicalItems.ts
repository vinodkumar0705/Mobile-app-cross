import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const medicalItems: Prisma.MedicalItemCreateInput[] = [
    { name: "Paracetamol", strength: "500mg", itemType: "MEDICINE", unit: "TABLET" },
    { name: "Amoxicillin", strength: "500mg", itemType: "MEDICINE", unit: "CAPSULE" },
    { name: "Ibuprofen", strength: "500mg", itemType: "MEDICINE", unit: "TABLET" },
    { name: "Aspirin", strength: "500mg", itemType: "MEDICINE", unit: "TABLET" },
    { name: "Amoxicillin", strength: "500mg", itemType: "MEDICINE", unit: "CAPSULE" },
    { name: "Ibuprofen", strength: "500mg", itemType: "MEDICINE", unit: "TABLET" },
    { name: "Aspirin", strength: "500mg", itemType: "MEDICINE", unit: "TABLET" },
    { name: "Cottom Swab 100 units", strength: "500mg", itemType: "DISPOSABLE", unit: "1" },
];
export const createMedicalItems = async () => {
    try {
        await prisma.medicalItem.createMany({
            data: medicalItems,
        });
    } catch (error) {
        console.error(error);
    }
};
