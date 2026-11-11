import { prisma } from "./src/lib/prisma";

async function checkAppointments() {
  const count = await prisma.appointment.count();
  console.log("Total Appointments in DB:", count);

  const appointments = await prisma.appointment.findMany({
    take: 10,
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      doctor: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("Sample appointments count:", appointments.length);
  appointments.forEach((apt) => {
    console.log({
      id: apt.id,
      doctorId: apt.doctorId,
      doctorUser: apt.doctor?.user ? `${apt.doctor.user.fName} ${apt.doctor.user.lName}` : null,
      patientId: apt.patientId,
      patientUser: apt.patient?.user ? `${apt.patient.user.fName} ${apt.patient.user.lName}` : null,
      appointmentDate: apt.appointmentDate,
      startTime: apt.startTime,
      status: apt.status,
      reason: apt.reason,
    });
  });
}

checkAppointments().finally(() => prisma.$disconnect());
