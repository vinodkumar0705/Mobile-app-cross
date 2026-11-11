import { prisma } from "./src/lib/prisma";

async function testConnection() {
  try {
    console.log("Connecting to PostgreSQL...");
    const count = await prisma.user.count();
    console.log("SUCCESS! User count in database:", count);
  } catch (err: any) {
    console.error("PRISMA_DB_ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
