import { PrismaClient } from "@prisma/client";
import { compare, hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("No user found.");
    return;
  }
  console.log("User:", user.email);
  const isMatch = await compare("password123", user.password);
  console.log("Compare result:", isMatch);
}

main().catch(console.error).finally(() => prisma.$disconnect());
