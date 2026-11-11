import { prisma } from "./src/lib/prisma";
import bcrypt from "bcryptjs";

async function testUser() {
  const email = "vikram.reddy@example.com";
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: email }, { phoneNumber: email }],
    },
  });

  if (!user) {
    console.log("User NOT found:", email);
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      select: { id: true, email: true, username: true, isAdmin: true, isDoctor: true, isPatient: true },
    });
    console.log("Sample users in DB:", sampleUsers);
    return;
  }

  console.log("User found in DB:", {
    id: user.id,
    fName: user.fName,
    lName: user.lName,
    email: user.email,
    username: user.username,
    isAdmin: user.isAdmin,
    isDoctor: user.isDoctor,
    isPatient: user.isPatient,
    hasPassword: !!user.password,
  });

  const testPass = "vikramreddy@123";
  if (user.password) {
    const isMatch = await bcrypt.compare(testPass, user.password);
    console.log(`Password match test for '${testPass}':`, isMatch);
  }
}

testUser().finally(() => prisma.$disconnect());
