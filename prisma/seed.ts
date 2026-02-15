import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const bangkalClinic = await prisma.clinic.upsert({
    where: { code: "BANGKAL" },
    update: {},
    create: {
      name: "CRB OT Clinic - Bangkal",
      code: "BANGKAL",
      address: "Bangkal, Davao City",
      contactNumber: "",
      isActive: true,
    },
  });

  const panaboClinic = await prisma.clinic.upsert({
    where: { code: "PANABO" },
    update: {},
    create: {
      name: "CRB OT Clinic - Panabo",
      code: "PANABO",
      address: "Panabo City, Davao del Norte",
      contactNumber: "",
      isActive: true,
    },
  });

  console.log("Created clinics:", { bangkalClinic, panaboClinic });

  const ownerPassword = await bcrypt.hash("admin123", 12);

  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@crb-ot.com" },
    update: {},
    create: {
      email: "owner@crb-ot.com",
      passwordHash: ownerPassword,
      firstName: "Admin",
      lastName: "Owner",
      role: UserRole.owner,
      primaryClinicId: null,
      isActive: true,
    },
  });

  console.log("Created owner user:", ownerUser.email);

  const sessionRates = [
    { clinicId: bangkalClinic.id, therapistType: UserRole.licensed_ot, rate: 700 },
    { clinicId: bangkalClinic.id, therapistType: UserRole.unlicensed_ot, rate: 500 },
    { clinicId: bangkalClinic.id, therapistType: UserRole.st, rate: 600 },
    { clinicId: panaboClinic.id, therapistType: UserRole.licensed_ot, rate: 700 },
    { clinicId: panaboClinic.id, therapistType: UserRole.unlicensed_ot, rate: 500 },
    { clinicId: panaboClinic.id, therapistType: UserRole.st, rate: 600 },
  ];

  for (const sr of sessionRates) {
    await prisma.sessionRate.upsert({
      where: {
        id: `${sr.clinicId}-${sr.therapistType}`,
      },
      update: {
        ratePerSession: sr.rate,
      },
      create: {
        clinicId: sr.clinicId,
        therapistType: sr.therapistType,
        ratePerSession: sr.rate,
        effectiveFrom: new Date(),
      },
    });
  }

  console.log("Created session rates");

  const packages = [
    { name: "4 Sessions Package", sessionCount: 4 },
    { name: "8 Sessions Package", sessionCount: 8 },
    { name: "12 Sessions Package", sessionCount: 12 },
  ];

  for (const pkg of packages) {
    const basePrice = pkg.sessionCount * 700;
    const discountPercent = 5;
    const finalPrice = basePrice * (1 - discountPercent / 100);

    await prisma.package.upsert({
      where: { id: `pkg-${pkg.sessionCount}` },
      update: {},
      create: {
        id: `pkg-${pkg.sessionCount}`,
        name: pkg.name,
        sessionCount: pkg.sessionCount,
        basePrice,
        discountPercent,
        finalPrice,
        validityDays: 30,
        isActive: true,
      },
    });
  }

  console.log("Created packages");
  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
