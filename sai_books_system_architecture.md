# SAI Books – Advanced Enterprise Tours & Travels ERP Architecture

## 1. System Overview
**SAI Books** is an enterprise-grade ERP, accounting, and travel services management system purpose-built for **Sai Tours & Travels** (Madurai, Tamil Nadu). It combines zero-jargon bookkeeping, GST compliance, passport desk management, customer CRM with AES-256 encrypted vaults, vendor ledgers, and Gemini AI financial analytics.

---

## 2. Core Modules & Endpoints

| Endpoint | Module | Capabilities |
| :--- | :--- | :--- |
| `/` | **Executive Console** | Real-time KPI metric cards, Recharts Area & Donut charts, NLP Quick Add, recent activity stream. |
| `/records` | **Notes & Records Journal** | 4-view journal (Cards, Timeline, Kanban, Accounting Table), Void record protection. |
| `/invoices` | **GST Tax Invoices** | Indian CBIC compliant tax invoices, SAC Code 998553, automated CGST/SGST/IGST, printable invoice, WhatsApp sharing. |
| `/customers` | **Customer 360 CRM** | Contact directory, spend history, AES-256-GCM encrypted passport/Aadhaar vault with role-restricted reveal. |
| `/suppliers` | **Supplier & Vendor Desk** | Airlines, bus operators, hotels, cab vendors ledger, balances payable, payment voucher recording. |
| `/receivables` | **Receivables & Aging Desk** | 0-30, 31-60, 61-90, 90+ days aging buckets, 1-click Tamil & English WhatsApp payment reminders, payment settlement. |
| `/passport-visa` | **Passport & Visa Services Desk** | Madurai PSK appointment scheduler, 6-stage workflow pipeline, document checklist toggles, ARN tracking. |
| `/month-end` | **Month-End Closing & Period Lock** | Tamper-proof month closure, anomaly & fraud inspector, category reconciliation, Owner re-open authorization. |
| `/reports` | **Reports & BI Desk** | 1-Click Excel (.xlsx) and CSV downloads for P&L, Day Book, GST GSTR-1, Customer Dues, Monthly Summary. |
| `/ai-studio` | **Gemini AI Studio** | Conversational data assistant ("Ask Your Data"), prompt library, OCR smart text parser. |
| `/settings` | **Settings & Backups** | Multi-branch configuration, business profile editor, full database JSON disaster recovery backup. |
| `/users` | **User Access & Security** | Staff pending approval desk, role assignment (OWNER, ADMIN, MANAGER, STAFF, VISITOR). |
| `/login` | **Authentication** | Salted bcrypt credentials, jose JWT session tokens (httpOnly, SameSite=Lax). |
| `/change-password` | **Security First-Login** | Forced password change for default administrative credentials. |

---

## 3. Security, Encryption & Integrity
1. **AES-256-GCM Encryption**: Customer passport numbers, Aadhaar numbers, and phone numbers are encrypted at rest with authenticated encryption.
2. **Role-Based Access Control (RBAC)**:
   - `OWNER`: Full administrative access, database backup exports, role promotions, month reopening.
   - `ADMIN`: User approvals, month closing, customer credential reveal.
   - `MANAGER`: Financial recording, invoice creation, supplier settlements.
   - `STAFF`: Note card creation, passport application updates, document checklist toggling.
3. **Tamper-Proof Audit Trail**: Every critical action (`CLOSE_MONTH`, `UNLOCK_MONTH`, `VOID_RECORD`, `LOGIN`) is logged in the `AuditLog` table with timestamp and actor ID.
4. **Exact 20-Digit Decimal Precision**: All calculations use `Decimal.js` via the `Money` abstraction to eliminate IEEE-754 floating-point errors.
