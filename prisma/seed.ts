import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ========== CLINICS ==========
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

  // ========== USERS ==========
  const ownerPassword = await bcrypt.hash("solidrock75", 12);
  const secretaryPassword = await bcrypt.hash("hellocrb123", 12);
  const otPassword = await bcrypt.hash("otpass123", 12);

  const ownerUser = await prisma.user.upsert({
    where: { email: "camelia@crb-ot.com" },
    update: {},
    create: {
      email: "camelia@crb-ot.com",
      passwordHash: ownerPassword,
      firstName: "Camelia",
      lastName: "Boquia",
      role: UserRole.owner,
      primaryClinicId: null,
      isActive: true,
    },
  });

  const secretaryUser = await prisma.user.upsert({
    where: { email: "secretary@crb-ot.com" },
    update: {},
    create: {
      email: "secretary@crb-ot.com",
      passwordHash: secretaryPassword,
      firstName: "Ana",
      lastName: "Ramos",
      role: UserRole.secretary,
      primaryClinicId: bangkalClinic.id,
      isActive: true,
    },
  });

  // Licensed OTs
  const licensedOt1 = await prisma.user.upsert({
    where: { email: "maria.santos@crb-ot.com" },
    update: {},
    create: {
      email: "maria.santos@crb-ot.com",
      passwordHash: otPassword,
      firstName: "Maria",
      lastName: "Santos",
      role: UserRole.licensed_ot,
      primaryClinicId: bangkalClinic.id,
      isActive: true,
    },
  });

  const licensedOt2 = await prisma.user.upsert({
    where: { email: "juan.delacruz@crb-ot.com" },
    update: {},
    create: {
      email: "juan.delacruz@crb-ot.com",
      passwordHash: otPassword,
      firstName: "Juan",
      lastName: "Dela Cruz",
      role: UserRole.licensed_ot,
      primaryClinicId: bangkalClinic.id,
      isActive: true,
    },
  });

  const licensedOt3 = await prisma.user.upsert({
    where: { email: "elena.reyes@crb-ot.com" },
    update: {},
    create: {
      email: "elena.reyes@crb-ot.com",
      passwordHash: otPassword,
      firstName: "Elena",
      lastName: "Reyes",
      role: UserRole.licensed_ot,
      primaryClinicId: panaboClinic.id,
      isActive: true,
    },
  });

  // Unlicensed OTs
  const unlicensedOt1 = await prisma.user.upsert({
    where: { email: "pedro.garcia@crb-ot.com" },
    update: {},
    create: {
      email: "pedro.garcia@crb-ot.com",
      passwordHash: otPassword,
      firstName: "Pedro",
      lastName: "Garcia",
      role: UserRole.unlicensed_ot,
      primaryClinicId: bangkalClinic.id,
      isActive: true,
    },
  });

  const unlicensedOt2 = await prisma.user.upsert({
    where: { email: "rosa.mendoza@crb-ot.com" },
    update: {},
    create: {
      email: "rosa.mendoza@crb-ot.com",
      passwordHash: otPassword,
      firstName: "Rosa",
      lastName: "Mendoza",
      role: UserRole.unlicensed_ot,
      primaryClinicId: panaboClinic.id,
      isActive: true,
    },
  });

  console.log("Created users:", {
    owner: ownerUser.email,
    secretary: secretaryUser.email,
    licensedOts: [licensedOt1.email, licensedOt2.email, licensedOt3.email],
    unlicensedOts: [unlicensedOt1.email, unlicensedOt2.email],
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

  // ========== CLIENTS ==========
  const clients = [
    {
      firstName: "Miguel",
      lastName: "Torres",
      dateOfBirth: new Date("2019-03-15"),
      diagnosis: "Autism Spectrum Disorder",
      guardianName: "Roberto Torres",
      guardianPhone: "09171234567",
      guardianRelation: "Father",
      mainClinicId: bangkalClinic.id,
      primaryTherapistId: licensedOt1.id,
    },
    {
      firstName: "Sofia",
      lastName: "Villanueva",
      dateOfBirth: new Date("2020-07-22"),
      diagnosis: "Developmental Delay",
      guardianName: "Carmen Villanueva",
      guardianPhone: "09182345678",
      guardianRelation: "Mother",
      mainClinicId: bangkalClinic.id,
      primaryTherapistId: licensedOt1.id,
    },
    {
      firstName: "Lucas",
      lastName: "Fernandez",
      dateOfBirth: new Date("2018-11-08"),
      diagnosis: "ADHD",
      guardianName: "Jose Fernandez",
      guardianPhone: "09193456789",
      guardianRelation: "Father",
      mainClinicId: bangkalClinic.id,
      primaryTherapistId: licensedOt2.id,
    },
    {
      firstName: "Isabella",
      lastName: "Cruz",
      dateOfBirth: new Date("2021-01-30"),
      diagnosis: "Sensory Processing Disorder",
      guardianName: "Maria Cruz",
      guardianPhone: "09204567890",
      guardianRelation: "Mother",
      mainClinicId: bangkalClinic.id,
      primaryTherapistId: licensedOt2.id,
    },
    {
      firstName: "Gabriel",
      lastName: "Santos",
      dateOfBirth: new Date("2017-05-12"),
      diagnosis: "Cerebral Palsy",
      guardianName: "Elena Santos",
      guardianPhone: "09215678901",
      guardianRelation: "Mother",
      mainClinicId: bangkalClinic.id,
      primaryTherapistId: unlicensedOt1.id,
    },
    {
      firstName: "Mia",
      lastName: "Reyes",
      dateOfBirth: new Date("2019-09-25"),
      diagnosis: "Down Syndrome",
      guardianName: "Antonio Reyes",
      guardianPhone: "09226789012",
      guardianRelation: "Father",
      mainClinicId: panaboClinic.id,
      primaryTherapistId: licensedOt3.id,
    },
    {
      firstName: "Daniel",
      lastName: "Garcia",
      dateOfBirth: new Date("2020-02-14"),
      diagnosis: "Autism Spectrum Disorder",
      guardianName: "Lucia Garcia",
      guardianPhone: "09237890123",
      guardianRelation: "Mother",
      mainClinicId: panaboClinic.id,
      primaryTherapistId: licensedOt3.id,
    },
    {
      firstName: "Olivia",
      lastName: "Mendoza",
      dateOfBirth: new Date("2018-08-03"),
      diagnosis: "Developmental Coordination Disorder",
      guardianName: "Pedro Mendoza",
      guardianPhone: "09248901234",
      guardianRelation: "Father",
      mainClinicId: panaboClinic.id,
      primaryTherapistId: unlicensedOt2.id,
    },
    {
      firstName: "Ethan",
      lastName: "Bautista",
      dateOfBirth: new Date("2019-12-20"),
      diagnosis: "Speech Delay",
      guardianName: "Rosa Bautista",
      guardianPhone: "09259012345",
      guardianRelation: "Mother",
      mainClinicId: panaboClinic.id,
      primaryTherapistId: unlicensedOt2.id,
    },
    {
      firstName: "Emma",
      lastName: "Aquino",
      dateOfBirth: new Date("2021-04-18"),
      diagnosis: "Global Developmental Delay",
      guardianName: "Carlos Aquino",
      guardianPhone: "09260123456",
      guardianRelation: "Father",
      mainClinicId: panaboClinic.id,
      primaryTherapistId: licensedOt3.id,
    },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: {
        id: `seed-${client.firstName.toLowerCase()}-${client.lastName.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `seed-${client.firstName.toLowerCase()}-${client.lastName.toLowerCase()}`,
        ...client,
      },
    });
  }

  console.log("Created clients:", clients.length);
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
