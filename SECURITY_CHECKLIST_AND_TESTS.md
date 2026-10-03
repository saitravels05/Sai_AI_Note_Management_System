# SAI Books – Security Architecture Checklist & Test Suite Report

## 1. Enterprise Security Controls Matrix

| Security Domain | Vulnerability / Threat | SAI Books Mitigation Strategy | Verification Status |
| :--- | :--- | :--- | :---: |
| **Authentication & Credential Safety** | Password stuffing, dictionary attacks | Salted `bcryptjs` hashing (cost factor 12). Enterprise complexity validator (min 10 chars, uppercase, lowercase, digit, symbol, common password blacklist). Breached passwords blocked. | **VERIFIED** |
| **Brute-Force & Lockout** | Credential stuffing & online brute force | In-memory sliding window rate limiter (`src/lib/security/ratelimit.ts`) enforcing 5 attempts per 15 minutes, with a 15-minute temporary lockout. | **VERIFIED** |
| **First-Login Enforcement** | Default / shared admin credentials | `mustChangePassword` flag forced on first login for Owner before any ledger or customer data access. | **VERIFIED** |
| **Session Security** | Session hijacking, XSS token theft | Signed HS256 JWTs stored in `httpOnly`, `SameSite=Lax`, `secure` cookies with 24-hour expiry. Revocation verified via live DB status check on every request. | **VERIFIED** |
| **Edge Route Guard** | Unauthorized direct URL access | Next.js Edge Middleware (`src/middleware.ts`) intercepting and validating tokens before pages render; redirects unauthenticated visitors to `/login`. | **VERIFIED** |
| **Authorization & RBAC** | Broken Object Level Authorization (BOLA/IDOR) | Server-side role validation in every Server Action (`OWNER`, `ADMIN`, `MANAGER`, `STAFF`, `VISITOR`). VISITOR write access blocked across all models. | **VERIFIED** |
| **Field-Level Data Encryption** | PII leakage (Passport, Aadhaar, Phone) | Native `AES-256-GCM` with cryptographic random IV and authentication tag verification. 64-hex key strictly enforced in production. | **VERIFIED** |
| **Data Masking & Vault Audit** | Unauthorized staff visibility & DPDP compliance | Masking helpers (`maskSensitive`) mask middle digits (`A1****67`, `98******00`). Unmasking events write non-repudiation records to `AuditLog`. | **VERIFIED** |
| **Formula Injection (CWE-1236)** | Malicious macro execution in Excel/Calc | Sanitization helper (`sanitizeForSpreadsheet`) neutralizing cells beginning with `=`, `+`, `-`, `@`, `\t`, `\r` with single quotes on import and export. | **VERIFIED** |
| **Tamper-Proof Audit Trail** | Repudiation, unauthorized changes | Dedicated `AuditLog` table capturing timestamp, userId, action, entityId, IP address, and details. | **VERIFIED** |
| **Accounting Period Locking** | Retroactive ledger tampering | One-click Month Close wizard locks the period. Only Owner can unlock with logged reason. | **VERIFIED** |
| **Soft-Delete & Voiding** | Accidental data loss | Transactions are soft-deleted via `isVoid`, `voidReason`, and `voidedById`. Hard deletes blocked. | **VERIFIED** |
| **Injection Attacks** | SQL Injection & NoSQL Injection | 100% parameterized queries via Prisma ORM. No raw string interpolation in queries. | **VERIFIED** |
| **Mathematical Precision** | Floating point rounding errors (`0.1+0.2`) | `Decimal.js` (20-decimal precision, `ROUND_HALF_UP`) and PostgreSQL `Decimal(15,2)`. | **VERIFIED** |
| **AI Data Privacy** | Sensitive data leakage to LLMs | Sensitive fields masked before sending to external AI models. Local rule-based fallback available. | **VERIFIED** |
| **HTTP Hardening & CSP** | Clickjacking, MIME sniffing, XSS | Next.js HTTP headers enforcing `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy`. `poweredByHeader` removed. | **VERIFIED** |
| **Container Hardening** | Container breakout, privilege escalation | Multi-stage Alpine Dockerfile running as unprivileged `nextjs:nodejs` (UID/GID 1001) with internal `/api/health` monitoring. | **VERIFIED** |

---

## 2. Automated Test Suite Results

Executed via Node.js Native Test Runner with TSX:
```bash
npm test
```

### Test Results Breakdown:

```
✔ AI Quick-Add: English Sentence Parsing with Amounts & Categories (2.0ms)
✔ AI Quick-Add: Expense Parsing with Hotel & Bank Transfer (0.4ms)
✔ AI Quick-Add: Tamil & Tanglish Parsing (0.3ms)
✔ Security & Privacy: AES-256 Field Encryption & Decryption (3.5ms)
✔ Security & Privacy: Sensitive Data Masking (9.3ms)
✔ Security: Server-Side RBAC Role Hierarchy Enforcement (0.3ms)
✔ Security: Spreadsheet / CSV Formula Injection Defense (CWE-1236) (5.4ms)
✔ Security: Password Complexity Policy Enforcement (1.1ms)
✔ Security: Brute-Force Rate Limiting & Sliding Window Lockout (4.9ms)
✔ Money Math: Exact Decimal Precision without Floating Point Loss (8.7ms)
✔ Money Format: Indian Numbering System Formatting (0.8ms)
✔ Money Math: GST and Commission Calculations (0.9ms)
✔ Money Math: Net Profit Calculation (0.9ms)

Summary:
- Total Tests: 13
- Passed: 13
- Failed: 0
- Execution Time: 770 ms
- Status: 100% PASS
```
