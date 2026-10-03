# SAI Books – Setup & Production Deployment Guide
## "Tours & Travels Notes & Accounts"

### System Architecture Summary
- **Frontend / Application Engine**: Next.js 16 (Turbopack, App Router, React 19, TypeScript)
- **Styling & Aesthetics**: Tailwind CSS v4, Glassmorphism, Micro-Animations, Saffron & Gold Theme
- **Database**: PostgreSQL 14+ / Embedded PostgreSQL, Prisma ORM
- **Financial Precision**: Decimal.js (20-decimal precision, zero floating-point error)
- **AI Intelligence**: Google Gemini 3.8 Flash (`@google/genai`) with offline rule-based fallback
- **Security**: AES-256-GCM Field-Level Encryption, JWT HTTP-Only Cookies, Salted Bcrypt Passwords, Role-Based Access Control (RBAC), Immutable Audit Log

---

## 1. Quick Local Setup (Development)

### Prerequisites
- **Node.js**: >= 20.0.0 (Tested on Node v24.19)
- **npm**: >= 10.0.0
- **PostgreSQL**: Port 5432 (or running embedded PostgreSQL cluster)

### Step 1: Clone / Enter Directory
```bash
cd "e:\Softwares\AI Powered Data Management"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your database connection string and secret keys are set:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sai_books_db?schema=public"
JWT_SECRET="sai-books-super-secret-production-grade-key-2026-secure-random-bytes"
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
GEMINI_API_KEY="" # Optional: Add your Google Gemini API key for advanced multimodal parsing
```

### Step 4: Synchronize Database Schema
```bash
npx prisma db push
```

### Step 5: Provision the Owner Account (Secure Bootstrap)
Creates the Owner account (`saipassportmdu@gmail.com`) with `mustChangePassword = true` and initializes the company profile with the official logo:
```bash
npm run bootstrap:owner
```

### Step 6: Populate Realistic Demo Notes (Optional)
```bash
npx tsx scripts/seed-dummy-data.ts
```

### Step 7: Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 2. Default Credentials & First Login Flow

1. Navigate to `http://localhost:3000/login`
2. **Email**: `saipassportmdu@gmail.com`
3. **Initial Password**: `TemporarySetupPassword123!` (defined in `.env`)
4. Upon clicking Sign In, the security engine immediately redirects to `/change-password` to force setting a personal, strong password before any ledger access is granted.

---

## 3. Automated Test Verification

Run all test suites (Money Precision, Indian Numbering, AES-256 Field Encryption, RBAC Hierarchy, NLP Parser):
```bash
npm test
```
Run TypeScript strict type validation:
```bash
npm run typecheck
```

---

## 4. Production Deployment with Docker

### Production Dockerfile (`Dockerfile`)
```dockerfile
# Stage 1: Dependencies & Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Checklist Before Launch
- [ ] Set `NODE_ENV="production"`
- [ ] Generate a cryptographically random `JWT_SECRET` (e.g. `openssl rand -base64 48`)
- [ ] Generate a 64-hex-char `ENCRYPTION_KEY` for AES-256
- [ ] Enable TLS/HTTPS on your reverse proxy (Caddy / Nginx / Cloudflare)
- [ ] Configure daily automated PostgreSQL backups via `pg_dump`
