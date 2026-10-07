import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function healDatabaseRecords() {
  console.log("[DB HEALER] Starting automated journal record self-healing...");

  // 1. Records with customerAmount set, but amount is 0 or null
  const healedCustomer = await prisma.$executeRawUnsafe(`
    UPDATE "NoteRecord"
    SET "amount" = "customerAmount",
        "amountPaid" = CASE 
          WHEN ("amountPaid" = 0 OR "amountPaid" IS NULL) AND "paymentStatus" = 'COMPLETED' AND "paymentMode" != 'CREDIT_UNPAID'
          THEN "customerAmount" 
          ELSE COALESCE("amountPaid", 0)
        END,
        "balanceDue" = CASE
          WHEN "paymentStatus" = 'COMPLETED' AND "paymentMode" != 'CREDIT_UNPAID'
          THEN 0
          WHEN ("balanceDue" = 0 OR "balanceDue" IS NULL) AND "paymentStatus" IN ('PENDING', 'PARTIAL')
          THEN "customerAmount" - COALESCE("amountPaid", 0)
          ELSE COALESCE("balanceDue", 0)
        END,
        "serviceCharge" = CASE
          WHEN ("serviceCharge" IS NULL OR "serviceCharge" = 0) AND "agentAmount" > 0 AND "customerAmount" >= "agentAmount"
          THEN "customerAmount" - "agentAmount"
          ELSE COALESCE("serviceCharge", 0)
        END
    WHERE ("amount" = 0 OR "amount" IS NULL) AND "customerAmount" > 0;
  `);

  // 2. Records with agentAmount set, but amount and customerAmount are 0 or null
  const healedAgent = await prisma.$executeRawUnsafe(`
    UPDATE "NoteRecord"
    SET "amount" = "agentAmount",
        "customerAmount" = "agentAmount",
        "amountPaid" = CASE 
          WHEN ("amountPaid" = 0 OR "amountPaid" IS NULL) AND "paymentStatus" = 'COMPLETED' AND "paymentMode" != 'CREDIT_UNPAID'
          THEN "agentAmount" 
          ELSE COALESCE("amountPaid", 0)
        END,
        "balanceDue" = CASE
          WHEN "paymentStatus" = 'COMPLETED' AND "paymentMode" != 'CREDIT_UNPAID'
          THEN 0
          WHEN ("balanceDue" = 0 OR "balanceDue" IS NULL) AND "paymentStatus" IN ('PENDING', 'PARTIAL')
          THEN "agentAmount" - COALESCE("amountPaid", 0)
          ELSE COALESCE("balanceDue", 0)
        END
    WHERE ("amount" = 0 OR "amount" IS NULL) AND ("customerAmount" = 0 OR "customerAmount" IS NULL) AND "agentAmount" > 0;
  `);

  // 3. Records with amount set, but customerAmount is 0 or null
  const healedPrimaryToCustomer = await prisma.$executeRawUnsafe(`
    UPDATE "NoteRecord"
    SET "customerAmount" = "amount"
    WHERE ("customerAmount" = 0 OR "customerAmount" IS NULL) AND "amount" > 0;
  `);

  // 4. Completed entries with amountPaid = 0 but positive amount
  const healedCompletedPaid = await prisma.$executeRawUnsafe(`
    UPDATE "NoteRecord"
    SET "amountPaid" = "amount",
        "balanceDue" = 0
    WHERE ("amountPaid" = 0 OR "amountPaid" IS NULL) 
      AND "paymentStatus" = 'COMPLETED' 
      AND "paymentMode" != 'CREDIT_UNPAID' 
      AND "amount" > 0;
  `);

  console.log(`[DB HEALER] Summary:
  - Repaired from customerAmount: ${healedCustomer} records
  - Repaired from agentAmount: ${healedAgent} records
  - Populated customerAmount: ${healedPrimaryToCustomer} records
  - Reconciled completed payments: ${healedCompletedPaid} records`);
}

async function main() {
  await healDatabaseRecords();
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
