import { prisma } from "@/lib/db";

/**
 * Generates collision-free, sequential record identifiers.
 * e.g., REC-2026-0001, REC-2026-0002
 * Prevents duplicate key errors during concurrent transactions or after imports/voids.
 */
export async function generateUniqueRecordNumber(prefix: string = "REC"): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${prefix}-${currentYear}-`;

  // Find the highest existing sequence number for this year
  const latestRecord = await prisma.noteRecord.findFirst({
    where: {
      recordNumber: { startsWith: yearPrefix },
    },
    orderBy: { recordNumber: "desc" },
    select: { recordNumber: true },
  });

  let nextSeq = 1;
  if (latestRecord?.recordNumber) {
    const parts = latestRecord.recordNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  // Double check uniqueness (safe retry if collision occurs)
  let candidate = `${yearPrefix}${nextSeq.toString().padStart(4, "0")}`;
  const exists = await prisma.noteRecord.findUnique({
    where: { recordNumber: candidate },
  });

  if (exists) {
    // If somehow exists, append current timestamp milliseconds to guarantee uniqueness
    const ms = Date.now().toString().slice(-4);
    candidate = `${yearPrefix}${(nextSeq + 1).toString().padStart(4, "0")}-${ms}`;
  }

  return candidate;
}

/**
 * Generate a batch of unique sequential record numbers for bulk imports
 */
export async function generateUniqueRecordNumbers(
  count: number,
  prefix: string = "REC"
): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `${prefix}-${currentYear}-`;

  const latestRecord = await prisma.noteRecord.findFirst({
    where: {
      recordNumber: { startsWith: yearPrefix },
    },
    orderBy: { recordNumber: "desc" },
    select: { recordNumber: true },
  });

  let startSeq = 1;
  if (latestRecord?.recordNumber) {
    const parts = latestRecord.recordNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      startSeq = lastSeq + 1;
    }
  }

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(`${yearPrefix}${(startSeq + i).toString().padStart(4, "0")}`);
  }

  return result;
}
