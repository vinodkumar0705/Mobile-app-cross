import { prisma } from "./src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Connecting to Database...");
  
  // Find existing admin users
  const existingAdmins = await prisma.user.findMany({
    where: {
      isAdmin: true,
    },
    select: {
      id: true,
      email: true,
      username: true,
      fName: true,
      lName: true,
      phoneNumber: true,
      isAdmin: true,
    }
  });

  console.log("Existing admins in DB:", existingAdmins);

  const adminEmail = "admin@sudheerhospital.com";
  const rawPassword = "AdminPassword@123";

  // Check if admin user exists
  let adminUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { username: "admin" }
      ]
    }
  });

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  if (!adminUser) {
    console.log("Creating Admin user...");
    adminUser = await prisma.user.create({
      data: {
        fName: "Sudheer",
        lName: "Admin",
        email: adminEmail,
        username: "admin",
        password: hashedPassword,
        isAdmin: true,
        phoneNumber: "+15550000000"
      }
    });
    console.log("Created Admin User:", adminUser.id);
  } else {
    console.log("Updating existing Admin password and permissions...");
    adminUser = await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        password: hashedPassword,
        isAdmin: true,
      }
    });
    console.log("Updated Admin User:", adminUser.id);
  }

  console.log("=== ADMIN CREDENTIALS ===");
  console.log(`Email: ${adminUser.email}`);
  console.log(`Username: ${adminUser.username}`);
  console.log(`Password: ${rawPassword}`);
}

main()
  .catch((e) => {
    console.error("Database Error:", e);
  })
  .finally(() => prisma.$disconnect());
