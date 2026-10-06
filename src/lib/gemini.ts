import { GoogleGenAI } from "@google/genai";
import { RecordType, ServiceCategory, PaymentMode } from "@prisma/client";

export interface ParsedNoteCard {
  title: string;
  amount: number;
  customerAmount?: number;
  agentAmount?: number;
  serviceCharge?: number;
  type: RecordType;
  category: ServiceCategory;
  paymentMode: PaymentMode;
  notes?: string;
  partyName?: string;
  confidence: number;
  source: "gemini" | "local_heuristic";
}

/**
 * Smart Quick-Add Sentence Parser supporting English, Tamil, and Tanglish
 */
export async function parseQuickAddSentence(text: string): Promise<ParsedNoteCard> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a financial accounting assistant for a Tours & Travels agency in Tamil Nadu, India.
Analyze the following sentence written in English, Tamil, or Tanglish:
"${text}"

Extract and return a JSON object with:
- title: concise title for the record (e.g., "Kumar - Chennai flight ticket")
- amount: total or customer numerical value in INR (e.g. 5000)
- customerAmount: amount charged to customer if specified (or same as amount)
- agentAmount: cost paid to agent/supplier if specified (or 0)
- type: one of "INCOME", "EXPENSE", "RECEIVABLE", "PAYABLE"
- category: one of "FLIGHT_TICKET", "TRAIN_TICKET", "BUS_TICKET", "HOTEL_BOOKING", "TOUR_PACKAGE", "PASSPORT_SERVICE", "VISA_SERVICE", "VEHICLE_RENTAL", "OFFICE_EXPENSE", "COMMISSION", "OTHER"
- paymentMode: one of "CASH", "UPI", "BANK_TRANSFER", "CARD", "CREDIT_UNPAID"
- partyName: name of customer or vendor mentioned
- confidence: number between 0.50 and 0.99

Respond ONLY with valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      const parsedAmt = Number(parsed.amount) || 0;
      const custAmt = Number(parsed.customerAmount) || parsedAmt;
      const agtAmt = Number(parsed.agentAmount) || 0;
      const sCharge = custAmt - agtAmt;

      return {
        title: parsed.title || text.slice(0, 50),
        amount: custAmt || parsedAmt,
        customerAmount: custAmt,
        agentAmount: agtAmt,
        serviceCharge: sCharge,
        type: parsed.type in RecordType ? (parsed.type as RecordType) : RecordType.INCOME,
        category: parsed.category in ServiceCategory ? (parsed.category as ServiceCategory) : ServiceCategory.OTHER,
        paymentMode: parsed.paymentMode in PaymentMode ? (parsed.paymentMode as PaymentMode) : PaymentMode.CASH,
        notes: text,
        partyName: parsed.partyName || "",
        confidence: Number(parsed.confidence) || 0.95,
        source: "gemini",
      };
    } catch (err) {
      console.warn("[Gemini API Warning] Falling back to local NLP heuristics:", err);
    }
  }

  // Robust local rule-based heuristic fallback (Works 100% offline & without API key)
  return parseWithLocalHeuristics(text);
}

function parseWithLocalHeuristics(text: string): ParsedNoteCard {
  const lower = text.toLowerCase();

  // 1. Amount Extraction (₹5000, 25.50, ₹1,500.75, 1.5k, etc.)
  let amount = 0;
  const amtMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(k|thousand))?\b/i);
  if (amtMatch) {
    const rawNum = amtMatch[1].replace(/,/g, "");
    amount = parseFloat(rawNum) || 0;
    const unit = amtMatch[2]?.toLowerCase();
    if (unit === "k" || unit === "thousand") {
      amount *= 1000;
    }
  }

  // 2. Determine Type (Income vs Expense vs Due)
  let type: RecordType = RecordType.INCOME;
  if (
    lower.includes("paid") ||
    lower.includes("spent") ||
    lower.includes("expense") ||
    lower.includes("koduthom") ||
    lower.includes("selavu") ||
    lower.includes("கொடுத்தேன்")
  ) {
    type = RecordType.EXPENSE;
  } else if (
    lower.includes("due to receive") ||
    lower.includes("owes") ||
    lower.includes("pending from") ||
    lower.includes("baaki") ||
    lower.includes("தர வேண்டும்")
  ) {
    type = RecordType.RECEIVABLE;
  } else if (
    lower.includes("due to pay") ||
    lower.includes("owe") ||
    lower.includes("payable") ||
    lower.includes("நாம் தர வேண்டும்")
  ) {
    type = RecordType.PAYABLE;
  }

  // 3. Category Detection
  let category: ServiceCategory = ServiceCategory.OTHER;
  if (lower.includes("flight") || lower.includes("air") || lower.includes("plane") || lower.includes("விமானம்")) {
    category = ServiceCategory.FLIGHT_TICKET;
  } else if (lower.includes("train") || lower.includes("railway") || lower.includes("irctc") || lower.includes("ரயில்")) {
    category = ServiceCategory.TRAIN_TICKET;
  } else if (lower.includes("bus") || lower.includes("பேருந்து")) {
    category = ServiceCategory.BUS_TICKET;
  } else if (lower.includes("hotel") || lower.includes("room") || lower.includes("ஹோட்டல்")) {
    category = ServiceCategory.HOTEL_BOOKING;
  } else if (lower.includes("tour") || lower.includes("package") || lower.includes("goa") || lower.includes("kerala")) {
    category = ServiceCategory.TOUR_PACKAGE;
  } else if (lower.includes("passport") || lower.includes("பாஸ்போர்ட்")) {
    category = ServiceCategory.PASSPORT_SERVICE;
  } else if (lower.includes("visa") || lower.includes("விசா")) {
    category = ServiceCategory.VISA_SERVICE;
  } else if (lower.includes("cab") || lower.includes("car") || lower.includes("taxi") || lower.includes("vehicle")) {
    category = ServiceCategory.VEHICLE_RENTAL;
  } else if (lower.includes("rent") || lower.includes("office") || lower.includes("tea") || lower.includes("electricity")) {
    category = ServiceCategory.OFFICE_EXPENSE;
  }

  // 4. Payment Mode
  let paymentMode: PaymentMode = PaymentMode.CASH;
  if (lower.includes("upi") || lower.includes("gpay") || lower.includes("phonepe") || lower.includes("paytm")) {
    paymentMode = PaymentMode.UPI;
  } else if (lower.includes("bank") || lower.includes("neft") || lower.includes("imps") || lower.includes("rtgs")) {
    paymentMode = PaymentMode.BANK_TRANSFER;
  } else if (lower.includes("card") || lower.includes("credit") || lower.includes("debit")) {
    paymentMode = PaymentMode.CARD;
  } else if (type === RecordType.RECEIVABLE || type === RecordType.PAYABLE) {
    paymentMode = PaymentMode.CREDIT_UNPAID;
  }

  // 5. Party Name Extraction
  let partyName = "";
  const fromMatch = text.match(/(?:from|by|to|for|இடமிருந்து|வாடிக்கையாளர்)\s+([A-Z][a-zA-Z]+)/);
  if (fromMatch) {
    partyName = fromMatch[1];
  }

  // 6. Explicit Customer vs Agent Amount parsing if present
  let customerAmount = amount;
  let agentAmount = 0;
  const custMatch = text.match(/(?:cust(?:omer)?(?:\s*amt|\s*amount)?)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  const agentMatch = text.match(/(?:agent(?:\s*amt|\s*amount|\s*cost)?)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (custMatch) {
    customerAmount = parseFloat(custMatch[1].replace(/,/g, "")) || customerAmount;
  }
  if (agentMatch) {
    agentAmount = parseFloat(agentMatch[1].replace(/,/g, "")) || 0;
  }
  const serviceCharge = customerAmount - agentAmount;

  return {
    title: text.length > 50 ? `${text.slice(0, 47)}...` : text,
    amount: customerAmount || amount,
    customerAmount: customerAmount || amount,
    agentAmount,
    serviceCharge,
    type,
    category,
    paymentMode,
    notes: text,
    partyName,
    confidence: 0.85,
    source: "local_heuristic",
  };
}

/**
 * Generate WhatsApp Reminder Text for Pending Dues
 */
export function generatePaymentReminder(
  customerName: string,
  amount: string,
  serviceName: string,
  dueDate: string,
  lang: "en" | "ta" = "en"
): string {
  if (lang === "ta") {
    return `வணக்கம் ${customerName}, சாய் டூர்ஸ் & டிராவல்ஸ் நிறுவனத்திலிருந்து. உங்கள் ${serviceName} முன்பதிவிற்கான நிலுவைத் தொகை ₹${amount} இன்னும் பெறப்படவில்லை. தயவுசெய்து விரைவாக செலுத்தவும். நன்றி!`;
  }
  return `Dear ${customerName}, Greetings from Sai Tours & Travels! A friendly reminder that your balance payment of ₹${amount} for ${serviceName} is due. Kindly settle via UPI/Bank at your earliest convenience. Thank you!`;
}
