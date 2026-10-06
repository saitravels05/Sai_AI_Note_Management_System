"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { Money } from "@/lib/money";
import { GoogleGenAI } from "@google/genai";
import { RecordType, ServiceCategory, PaymentMode } from "@prisma/client";

export interface AiChatResponse {
  answer: string;
  confidence: number;
  dataPointsUsed: number;
  source: "gemini" | "local_analytics";
}

export async function askYourDataAction(userQuestion: string): Promise<AiChatResponse> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized.");
  }

  // 1. Fetch current business aggregates from Prisma (Full Database Grounding)
  const totalRecords = await prisma.noteRecord.count({ where: { isVoid: false } });
  const [inflowAgg, outflowAgg, duesAgg, categoryGroups, recentRecords] = await Promise.all([
    prisma.noteRecord.aggregate({
      where: { isVoid: false, type: RecordType.INCOME },
      _sum: { amount: true },
    }),
    prisma.noteRecord.aggregate({
      where: { isVoid: false, type: RecordType.EXPENSE },
      _sum: { amount: true },
    }),
    prisma.noteRecord.aggregate({
      where: { isVoid: false },
      _sum: { balanceDue: true },
    }),
    prisma.noteRecord.groupBy({
      by: ["category"],
      where: { isVoid: false, type: RecordType.INCOME },
      _sum: { amount: true },
    }),
    prisma.noteRecord.findMany({
      where: { isVoid: false },
      select: {
        title: true,
        amount: true,
        amountPaid: true,
        balanceDue: true,
        type: true,
        category: true,
        paymentMode: true,
        date: true,
      },
      take: 20,
      orderBy: { date: "desc" },
    }),
  ]);

  const totalInflow = Money.from(inflowAgg._sum.amount ?? 0);
  const totalOutflow = Money.from(outflowAgg._sum.amount ?? 0);
  const totalDues = Money.from(duesAgg._sum.balanceDue ?? 0);
  const netProfit = totalInflow.sub(totalOutflow);

  const catSummary: Record<string, number> = {};
  for (const group of categoryGroups) {
    catSummary[group.category] = Money.from(group._sum.amount ?? 0).toNumber();
  }

  const contextData = {
    totalRecordsCount: totalRecords,
    totalIncome: totalInflow.formatIndian(true),
    totalExpense: totalOutflow.formatIndian(true),
    netProfit: netProfit.formatIndian(true),
    unpaidCustomerDues: totalDues.formatIndian(true),
    categoryIncomeBreakdown: catSummary,
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are the executive financial assistant for Sai Tours and Travels.
Answer the user question accurately using ONLY the grounded data below.
Do not make up facts or balances. If the question is in Tamil, answer in polite, clear Tamil. If in English, answer in polite, clear English.

GROUNDED BUSINESS DATA:
${JSON.stringify(contextData, null, 2)}

USER QUESTION:
"${userQuestion}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return {
        answer: response.text || "I was unable to analyze the data.",
        confidence: 0.98,
        dataPointsUsed: totalRecords,
        source: "gemini",
      };
    } catch (err) {
      console.warn("Gemini query failed, falling back to local analytics:", err);
    }
  }

  // Local grounded answer fallback
  const q = userQuestion.toLowerCase();
  if (q.includes("profit") || q.includes("லாபம்")) {
    return {
      answer: `Your current Net Profit is ${contextData.netProfit} (Total Inflow: ${contextData.totalIncome}, Total Outflow: ${contextData.totalExpense}).`,
      confidence: 0.99,
      dataPointsUsed: totalRecords,
      source: "local_analytics",
    };
  }

  if (q.includes("due") || q.includes("owe") || q.includes("பாக்கி") || q.includes("unpaid")) {
    return {
      answer: `Currently, customers have pending dues totaling ${contextData.unpaidCustomerDues} across active bookings.`,
      confidence: 0.99,
      dataPointsUsed: totalRecords,
      source: "local_analytics",
    };
  }

  return {
    answer: `Sai Books Overview: Total Income is ${contextData.totalIncome}, Total Expense is ${contextData.totalExpense}, and Net Profit is ${contextData.netProfit} across ${contextData.totalRecordsCount} recorded cards.`,
    confidence: 0.95,
    dataPointsUsed: totalRecords,
    source: "local_analytics",
  };
}
