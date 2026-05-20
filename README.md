# The Foresight Budget

A full-stack budget and income tracking web app for two partners managing finances from different locations.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL) via Prisma ORM
- **Auth**: NextAuth.js with credentials provider (PIN-based, bcrypt-hashed)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

---

## Setup Instructions

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → Database**
3. Under **Connection string**, copy:
   - **URI** (the `postgresql://...` connection string) — this is your `DIRECT_URL`
   - Under **Connection pooling**, copy the pooler URL — this is your `DATABASE_URL`
     - Make sure it ends with `?pgbouncer=true`

### 2. Clone and install

```bash
git clone <your-repo-url>
cd foresight-budget
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
DATABASE_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Push the database schema

```bash
npx prisma generate
npx prisma db push
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first visit you'll be redirected to `/setup` to create both partner accounts.

---

## Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. In **Environment Variables**, add all four variables from `.env.example`:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (set to your Vercel production URL, e.g. `https://foresight-budget.vercel.app`)
4. Deploy

The `vercel.json` and the `build` script both run `prisma generate` automatically before building.

---

## App Sections

| Route | Description |
|-------|-------------|
| `/dashboard` | Combined overview — income, budget totals, savings progress |
| `/personal` | Each partner's private monthly expenses |
| `/jobs` | Per-user job tracker with material expenses |
| `/wedding` | Shared wedding budget (traditional + civil + transport) |
| `/son` | Son's relocation costs and recurring support |
| `/relocation` | Shared home setup and monthly living costs |
| `/savings-calculator` | Goal tracker with monthly savings target calculator |

---

## First-time Setup

On first visit, the app redirects to `/setup` where both partners create their accounts (name, email, 4-digit PIN). This page is only accessible when zero users exist in the database. After setup, each partner signs in at `/login`.
