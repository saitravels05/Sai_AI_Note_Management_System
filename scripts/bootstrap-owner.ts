import { PrismaClient, Role, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_INITIAL_EMAIL || "saipassportmdu@gmail.com";
  let rawPassword = process.env.OWNER_INITIAL_PASSWORD;
  let isGenerated = false;

  console.log(`=======================================================`);
  console.log(`SAI Books – Secure Owner Account Bootstrap`);
  console.log(`=======================================================`);
  console.log(`Target Email: ${email}`);

  if (!rawPassword) {
    // Generate a cryptographically random one-time password
    rawPassword = crypto.randomBytes(18).toString("base64url") + "!Aa9";
    isGenerated = true;
  }

  if (rawPassword.length < 8) {
    console.error("Error: Initial password must be at least 8 characters.");
    process.exit(1);
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

  // Upsert the Owner user account
  const owner = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      updatedAt: new Date(),
    },
    create: {
      email,
      name: "Owner (Sai Tours & Travels)",
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
    },
  });

  console.log(`[SUCCESS] Owner account provisioned: ${owner.email} (ID: ${owner.id})`);
  console.log(`[SECURITY] 'mustChangePassword' is set to TRUE. User MUST choose a personal strong password upon first login.`);

  if (isGenerated) {
    console.log(`-------------------------------------------------------`);
    console.log(`[ACTION REQUIRED] Temporary Initial Setup Secret generated:`);
    console.log(`Password: ${rawPassword}`);
    console.log(`(Store this immediately. It will be invalidated upon first login.)`);
    console.log(`-------------------------------------------------------`);
  }

  // Initialize Business Profile
  const business = await prisma.businessProfile.upsert({
    where: { id: "default-business-profile" },
    update: {
      name: "Sai Tours and Travels",
      email: owner.email,
      logoUrl: "/brand/logo.jpg",
    },
    create: {
      id: "default-business-profile",
      name: "Sai Tours and Travels",
      legalName: "Sai Tours & Travels Madurai",
      email: owner.email,
      phone: "+91 98421 00000",
      address: "Madurai, Tamil Nadu, India",
      currency: "INR",
      currencySymbol: "₹",
      logoUrl: "/brand/logo.jpg",
      financialYearStart: 4,
      defaultGstRate: 5.0,
      aiEnabled: true,
    },
  });

  console.log(`[SUCCESS] Business Profile initialized: ${business.name}`);
  console.log(`=======================================================`);
}

main()
  .catch((e) => {
    console.error("[FATAL] Bootstrap failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
