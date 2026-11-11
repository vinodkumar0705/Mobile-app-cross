import { prisma } from "./src/lib/prisma";

async function test() {
  try {
    const doc = await prisma.employeeInfo.findFirst();
    console.log("Found doc:", doc?.id);
    const res = await prisma.$transaction(async (tx) => {
      let user = await tx.user.create({
        data: {
          fName: "RahulTest",
          lName: "VermaTest",
          isPatient: true,
          phoneNumber: "+919876543210",
          email: "rahultest@test.com",
        },
      });

      const pat = await tx.patientInfo.create({
        data: {
          id: "PAT_TEST_" + Date.now(),
          userId: user.id,
          age: "28",
          gender: "MALE",
        },
      });

      const apt = await tx.appointment.create({
        data: {
          appointmentDate: new Date(),
          startTime: new Date(),
          appointmentType: "NEW_APPOINTMENT",
          status: "IN_PROGRESS",
          patientId: pat.id,
          doctorId: doc!.id,
          reason: "Checkup",
        },
      });

      await tx.medicalHistory.create({
        data: {
          appointmentId: apt.id,
          patientId: pat.id,
        },
      });

      return apt;
    });
    console.log("SUCCESS APPOINTMENT ID:", res.id);
  } catch (e) {
    console.error("EXACT TRANSACTION ERROR:", e);
  }
}

test().finally(() => prisma.$disconnect());
