import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking and healing NoteRecord amounts in database...");

  // Update records where amount is 0 or null, but customerAmount is set
  const healedCustomer = await prisma.$executeRawUnsafe(`
    UPDATE "NoteRecord"
    SET "amount" = "customerAmount",
        "amountPaid" = CASE 
          WHEN ("amountPaid" = 0 OR "amountPaid" IS NULL) AND "paymentStatus" = 'COMPLETED' 
          THEN "customerAmount" 
          ELSE "amountPaid" 
        END,
        "serviceCharge" = CASE
          WHEN "serviceCharge" IS NULL OR "serviceCharge" = 0
          THEN COALESCE("customerAmount", 0) - COALESCE("agentAmount", 0)
          ELSE "serviceCharge"
        END
    WHERE ("amount" = 0 OR "amount" IS NULL) AND "customerAmount" > 0;
  `);

  console.log(`Healed ${healedCustomer} records using customerAmount.`);

  // Update records where amount is 0, customerAmount is 0, but agentAmount is set
  const healedAgent = await prisma.$executeRawUnsafe(`
    UPDATE "NoteRecord"
    SET "amount" = "agentAmount",
        "amountPaid" = CASE 
          WHEN ("amountPaid" = 0 OR "amountPaid" IS NULL) AND "paymentStatus" = 'COMPLETED' 
          THEN "agentAmount" 
          ELSE "amountPaid" 
        END
    WHERE ("amount" = 0 OR "amount" IS NULL) AND ("customerAmount" = 0 OR "customerAmount" IS NULL) AND "agentAmount" > 0;
  `);

  console.log(`Healed ${healedAgent} records using agentAmount.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
