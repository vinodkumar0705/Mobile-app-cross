import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const mockDepartments:Prisma.DepartmentCreateInput[] = [
    {
        name: "Cardiology",
    },
    {
        name: "Dermatology",
    },
    {
        name: "Neurology",
    },
    {
        name: "Orthopedics",
    },
    {
        name: "Pediatrics",
    },
    {
        name: "Psychiatry",
    },
    {
        name: "Urology",
    },
    {
        name:"Dentistry"
    },
    {
        name:"Gastroenterology"
    },
    {
        name:"Radiology"
    }
]
export async function createDepartments() {
    try {
        await prisma.speciality.deleteMany()
        await prisma.department.deleteMany()
        const departments = mockDepartments.map((department) => {
            return prisma.department.create({
                data: {
                    ...department,
                    speciality:{
                        createMany:{
                            data:[
                                {
                                    name:"Tier A"
                                },
                                {
                                    name:"Tier B"
                                },
                                {
                                    name:"Tier C"
                                }
                            ]
                        }
                    }
                }, 
            })
        })
        await Promise.all(departments)
        console.log("Departments created")
    } catch (error) {
        console.log("Error creating departments", error)
    }
}
