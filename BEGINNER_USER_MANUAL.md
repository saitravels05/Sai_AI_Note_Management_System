# SAI Books – Tours & Travels Notes & Accounts
## Complete Beginner's Manual & Single Source of Truth Guide
### (English & தமிழ்)

---

# SECTION 1: THE CORE ARCHITECTURE (How It Works)

### The Single Source of Truth Rule
In **SAI Books**, you **NEVER enter data twice**. The **"Notes & Journal"** screen is the **ONLY** place where human entries are created. 

Every other screen in the entire application—Executive Dashboard, Customer Ledgers, Supplier Ledgers, Receivables, Month-End Closing, GST Reports, Recharts graphs, and the AI Chat Assistant—are **live calculated views**.

```
═══════════════════════════════════════════════════════════════════════════════
                   SAI BOOKS: SINGLE SOURCE OF TRUTH FLOW
═══════════════════════════════════════════════════════════════════════════════

                       ┌──────────────────────────────┐
                       │   USER ENTERS DATA ONCE      │
                       │                              │
                       │   Notes & Journal (Diary)    │
                       │   • Quick-Add Sentence Bar   │
                       │   • Note Card Form           │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │   NoteRecord (PostgreSQL)    │
                       │   Strict Master Database     │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  CENTRAL ACCOUNTING ENGINE   │
                       │  (src/lib/accounting-engine) │
                       │  Pure Deterministic Math     │
                       │  Zero Floating-Point Loss    │
                       └──────┬───────┬───────┬───────┘
                              │       │       │
              ┌───────────────┘       │       └───────────────┐
              ▼                       ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
    │  LIVE DASHBOARD  │    │ DYNAMIC LEDGERS  │    │ REPORTS & EXPORT │
    │  • Today Inflow  │    │ • Customer Dues  │    │ • P&L Statement  │
    │  • Monthly P&L   │    │ • Supplier Dues  │    │ • Day Book       │
    │  • Cash in Hand  │    │ • Running Ledger │    │ • GST Summary    │
    │  • Bank / UPI    │    │ • WhatsApp Draft │    │ • PDF / Excel    │
    │  • Drill-Down    │    │ • Payment Status │    │ • AI Assistant   │
    └──────────────────┘    └──────────────────┘    └──────────────────┘
              ▲                       ▲                       ▲
              └───────────────────────┴───────────────────────┘
                                      │
                       ┌──────────────┴───────────────┐
                       │   RECONCILIATION AUDITOR     │
                       │  ✅ 100% Mathematically      │
                       │     Reconciled (Green Tick)  │
                       └──────────────────────────────┘
```

---

# SECTION 2: THE 7 ENTRY TYPES (When to Use What)

| # | Type | Name | Real-World Travel Agency Example | What Happens Automatically |
|---|---|---|---|---|
| 1 | `INCOME` | **Money Received** | Customer pays ₹14,500 for Delhi flight ticket by UPI. | Inflow increases, UPI balance increases, Net Profit increases by service charge. |
| 2 | `EXPENSE` | **Money Spent** | Paid ₹13,200 to IndiGo portal via Net Banking. | Outflow increases, Bank balance decreases, expense recorded in P&L. |
| 3 | `RECEIVABLE` | **Due to Receive** | Malaysia tour of ₹85,000 booked: customer paid ₹35,000 advance; ₹50,000 due. | ₹35,000 increases UPI balance; ₹50,000 automatically appears in Customer Dues & Ledger. |
| 4 | `PAYABLE` | **Due to Pay** | Taj Hotel ₹30,000 booking: paid ₹10,000 advance; ₹20,000 due to hotel. | ₹10,000 deducted from bank; ₹20,000 appears in Supplier Dues & Vendor Ledger. |
| 5 | `REFUND` | **Refund** | Flight cancelled: ₹1,250 refunded back to customer's GPay. | UPI balance decreases by ₹1,250; Net Income reduces; appears in refund audit trail. |
| 6 | `TRANSFER` | **Transfer (Cash ↔ Bank)** | Deposited ₹10,000 counter cash into HDFC Current Account. | Cash in Hand decreases by ₹10,000; Bank balance increases by ₹10,000; Profit is unchanged. |
| 7 | `NOTE` | **Plain Note** | Passport Annexure-E collected for Anand; appointment at Madurai PSK on 15th. | Recorded in journal & customer timeline; 0 financial impact; zero distraction. |

---

# SECTION 3: STEP-BY-STEP USER GUIDE (ENGLISH)

### Step 1: Adding an Entry in Under 10 Seconds (Quick-Add Bar)
At the top of your screen, type naturally in English, Tamil, or Tanglish:
- `"Received 14500 from Kumar for Delhi flight ticket by UPI"`
- `"Paid 13200 to Indigo portal by Bank"`
- `"Anand Singapore package 85000 advance 35000 due 50000 by UPI"`
- `"Cash deposit 10000 to HDFC Bank"`

Click the **AI Sparkles button** (or press Enter).
The system fills the card with the Amount, Category, Customer Name, and Payment Mode.
Click **"Confirm & Save Card"**!

### Step 2: Instant Live Recalculation
Right after clicking Save:
1. **Executive Dashboard**: Today's Inflow, Monthly Profit, and Cash/Bank cards update immediately.
2. **Customer Ledger**: Kumar's balance updates with zero delay.
3. **Drill-Down**: Click on any KPI card (e.g. *Today's Money Received*) to view the exact note card behind that number!
4. **Reconciliation Green Tick**: Look at the top badge—**"100% Reconciled"** confirms that Dashboard = Journal = Ledgers.

### Step 3: Editing or Deleting an Entry
- **Edit**: Click the **Pencil icon** on any card. Modify the amount or category and click Update. All dashboard cards and customer ledgers recalculate immediately.
- **Delete (Soft Delete)**: Click the **Trash icon**. The entry is moved to the Recycle Bin and instantly drops out of all financial totals.
- **Restore**: Restoring a card brings its numbers back into the dashboard instantly.

### Step 4: Month-End Locking
At the end of the month:
1. Navigate to **Month-End Close**.
2. Run the 4-step wizard (Dues Check ➔ Anomaly Check ➔ Confirm Totals ➔ Lock Month).
3. Once **LOCKED**, no staff member can edit or back-date transactions in that period, preventing fraud and accidental tampering.

---

# பகுதி 4: தமிழ் பயனர் வழிகாட்டி (TAMIL MANUAL)

### 1. ஒரே ஒரு முறை பதிவு – அனைத்து பக்கங்களிலும் தானாக மாறும்!
**சாய் புக்ஸ் (SAI Books)** தளத்தின் அடிப்படை விதியானது: **"Notes & Journal"** பக்கத்தில் மட்டுமே தகவல்கள் பதிவு செய்யப்பட வேண்டும்.

டாஷ்போர்டு (Dashboard), வாடிக்கையாளர் பேரேடு (Customer Ledger), சப்ளையர் பேரேடு (Supplier Ledger), நிலுவை பாக்கிகள் (Dues), ஜிஎஸ்டி (GST), மாத கணக்கு முடித்தல் (Month-End) ஆகிய அனைத்தும் நீங்கள் பதிவிடும் குறிப்புகளிலிருந்து **நொடிப் பொழுதில் தானாகவே கணக்கிடப்படுகின்றன**.

### 2. 7 வகை அட்டைகள் – எதை எப்போது பயன்படுத்த வேண்டும்?
1. **வந்த பணம் (Income)**: வாடிக்கையாளர் டிக்கெட் அல்லது டூருக்கு ரொக்கம்/UPI மூலம் பணம் தரும் போது.
2. **செலவு (Expense)**: ஏர்லைன்ஸ் போர்ட்டல் அல்லது ஹோட்டலுக்கு நீங்கள் பணம் செலுத்தும் போது.
3. **வரவேண்டிய பாக்கி (Receivable)**: டூர் அல்லது டிக்கெட் எடுத்து முன்பணம் செலுத்தி மீதி பாக்கி வைத்துள்ள போது.
4. **கொடுக்கவேண்டிய பாக்கி (Payable)**: ஹோட்டல் அல்லது வாகன உரிமையாளருக்கு பின்னர் செலுத்த வேண்டிய தொகை.
5. **திருப்பித் தந்த பணம் (Refund)**: டிக்கெட் ரத்தாகி வாடிக்கையாளருக்கு பணத்தை திருப்பித் தரும் போது.
6. **பணப் பரிமாற்றம் (Transfer)**: கல்லாப்பெட்டி ரொக்கத்தை (Cash) வங்கியில் (Bank) செலுத்தும் போது.
7. **சாதாரண குறிப்பு (Plain Note)**: பாஸ்போர்ட் விண்ணப்ப ஆவணம் அல்லது தூதரக அப்பாயிண்ட்மென்ட் போன்ற நிதிசாரா குறிப்புகள்.

### 3. விரைவு வாக்கியப் பதிவு (Quick-Add)
முகப்பு பெட்டியில் தமிழில் எழுதலாம்:
- `"குமார் டெல்லி டிக்கெட்டுக்கு 14500 UPI-ல் தந்தார்"`
- `"இண்டிகோ போர்ட்டலுக்கு 13200 வங்கி மூலம் செலுத்தினேன்"`
- `"ஆனந்த் சிங்கப்பூர் டூர் 85000 முன்பணம் 35000 மீதி 50000"`

**AI Sparkles** பட்டனை அழுத்தினால் அனைத்தும் தானாக நிரப்பப்படும். **"Confirm & Save Card"** அழுத்தினால் போதும்!

### 4. 100% துல்லியமான சமரசம் (100% Reconciled Green Tick)
முகப்பு பக்கத்தில் பச்சை நிற **"100% Reconciled"** குறியீடு இருக்கும். இதன் பொருள்:
- டாஷ்போர்டு மொத்த தொகை = குறிப்பேட்டின் கூட்டல் தொகை = பேரேடு பாக்கிகள்.
- ஒரு பைசா கூட கணக்கில் மாறுபாடு இருக்காது!

---

# SECTION 5: MATHEMATICAL FORMULAS ENFORCED

1. **Net Profit**:
   $$\text{Net Profit} = \sum \text{Money Received} - \sum \text{Money Paid}$$

2. **Customer Outstanding Due**:
   $$\text{Customer Due} = \text{Billed Amount} - \text{Advance Paid} - \text{Settlements} - \text{Refunds}$$

3. **Cash in Hand Balance**:
   $$\text{Cash Balance} = \text{Opening Cash} + \text{Cash Inflows} - \text{Cash Outflows} \pm \text{Transfers}$$

4. **Bank Account Balance**:
   $$\text{Bank Balance} = \text{Opening Bank} + \text{Bank Inflows} - \text{Bank Outflows} \pm \text{Transfers}$$

5. **GST Payable**:
   $$\text{GST Payable} = \text{GST Collected on Sales} - \text{GST Paid on Purchases}$$

---
*SAI Books – Tours & Travels Notes & Accounts System (Next.js + TypeScript + PostgreSQL)*
