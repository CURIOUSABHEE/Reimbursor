import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"

async function main() {
  let company = await prisma.company.findFirst()

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Default Company",
        currency: "USD",
      },
    })
    console.log(`Created company: ${company.name}`)
  }

  const hashedPasswordEmployee = await hash("123456", 12)
  const hashedPasswordAdmin = await hash("admin123", 12)

  const employee = await prisma.user.upsert({
    where: { email: "spranav0812@gmail.com" },
    update: {
      password: hashedPasswordEmployee,
      role: "EMPLOYEE",
      name: "Spranav",
      companyId: company.id,
    },
    create: {
      email: "spranav0812@gmail.com",
      password: hashedPasswordEmployee,
      role: "EMPLOYEE",
      name: "Spranav",
      companyId: company.id,
    },
  })
  console.log(`Employee: ${employee.email} (${employee.role})`)

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      password: hashedPasswordAdmin,
      role: "ADMIN",
      name: "Admin User",
      companyId: company.id,
    },
    create: {
      email: "admin@example.com",
      password: hashedPasswordAdmin,
      role: "ADMIN",
      name: "Admin User",
      companyId: company.id,
    },
  })
  console.log(`Admin: ${admin.email} (${admin.role})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
