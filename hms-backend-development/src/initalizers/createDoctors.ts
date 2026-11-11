import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const mockDoctors: Prisma.UserCreateInput[] = [
    { fName: "Rajesh", lName: "Kumar", email: "rajesh.kumar@example.com" },
    { fName: "Priya", lName: "Sharma", email: "priya.sharma@example.com" },
    { fName: "Amit", lName: "Patel", email: "amit.patel@example.com" },
    { fName: "Sneha", lName: "Singh", email: "sneha.singh@example.com" },
    { fName: "Vikram", lName: "Reddy", email: "vikram.reddy@example.com" },
    { fName: "Anjali", lName: "Desai", email: "anjali.desai@example.com" },
    { fName: "Rahul", lName: "Mehta", email: "rahul.mehta@example.com" },
    { fName: "Pooja", lName: "Joshi", email: "pooja.joshi@example.com" },
    { fName: "Sanjay", lName: "Malhotra", email: "sanjay.malhotra@example.com" },
    { fName: "Neha", lName: "Gupta", email: "neha.gupta@example.com" },
];

export function random() {
    return Math.floor(Math.random() * 10);
}

async function generatePassword(doctor: Partial<Prisma.UserCreateInput>) {
    if (doctor?.fName && doctor?.lName) {
        return await bcrypt.hash(doctor?.fName?.toLowerCase() + doctor?.lName?.toLowerCase() + "@123", 10);
    }
    return "@123";
}

export async function createDoctors() {
    try {
        const departments = await prisma.department.findMany();
        const qualifications = await prisma.qualification.findMany();
        await prisma.employeeInfo.deleteMany({
            where: {
                user: {
                    email: {
                        in: mockDoctors.map((doctor) => doctor.email) as string[],
                    },
                },
            },
        });
        await prisma.user.deleteMany({
            where: {
                email: {
                    in: mockDoctors.map((doctor) => doctor.email) as string[],
                },
            },
        });
        if (departments.length > 0 && qualifications.length > 0) {
            const passwords = await Promise.all(mockDoctors.map((doctor) => generatePassword(doctor)));
            const newMockDoctors = mockDoctors.map((doctor, i) => {
                return prisma.user.create({
                    data: {
                        ...doctor,
                        isDoctor: true,
                        isPatient: false,
                        password: passwords[i],
                        email: doctor.email,
                        employeeInfo: {
                            create: {
                                department: {
                                    connect: {
                                        id: departments[random()].id,
                                    },
                                },
                                qualification: {
                                    connect: {
                                        id: qualifications[random()].id,
                                    },
                                },
                                experience: random(),
                                salary: random() * 1000,
                            },
                        },
                    },
                });
            });

            await Promise.all(newMockDoctors);
            console.log("Doctors created");
        }
        return;
    } catch (error) {
        console.log("Error creating doctors", error);
    }
}
