import { prisma } from "./src/lib/prisma";

async function inspectDoctorMapping() {
  const doctors = await prisma.user.findMany({
    where: { isDoctor: true },
    include: { employeeInfo: true },
    take: 5,
  });

  console.log("Doctors sample:");
  doctors.forEach((doc) => {
    console.log({
      userId: doc.id,
      fName: doc.fName,
      lName: doc.lName,
      email: doc.email,
      employeeInfoId: doc.employeeInfo?.id,
    });
  });

  const appointments = await prisma.appointment.findMany({
    take: 5,
    select: {
      id: true,
      doctorId: true,
      doctor: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              id: true,
              fName: true,
              lName: true,
            },
          },
        },
      },
    },
  });

  console.log("\nAppointments doctor relation sample:");
  console.log(JSON.stringify(appointments, null, 2));
}

inspectDoctorMapping().finally(() => prisma.$disconnect());
