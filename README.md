# Nadi42

**Nadi42 is a 42-day postpartum continuity platform that turns missed warning signs into actionable follow-up for mothers, families, ASHAs, and PHCs.**

Most maternal-health tools focus on pregnancy and delivery. Once a mother goes home, the care loop often disappears. Nadi42 focuses on those first 42 days — detecting risk early and making sure it's actually followed up on, not just logged.

> **Mother goes home → Nadi42 checks in → risk is detected → family/ASHA is alerted → care is connected → follow-up is closed.**

---

## Table of Contents

- [Overview](#overview)
- [User Roles](#user-roles)
- [The Nadi Risk Loop](#the-nadi-risk-loop)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Design (MongoDB)](#database-design-mongodb)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [External Integrations](#external-integrations)
- [Demo Accounts & Seed Data](#demo-accounts--seed-data)
- [Roadmap / Out of Scope for MVP](#roadmap--out-of-scope-for-mvp)

---

## Overview

Nadi42 is a single responsive web application with three role-based dashboards:

| Role | What they do |
|---|---|
| 👩 Mother | Daily check-ins, symptom reporting, recovery timeline, request help |
| 🧑‍⚕️ ASHA / Health Worker | View assigned mothers, receive risk alerts, log follow-ups, escalate to PHC |
| 🏥 PHC / Supervisor | Population-level dashboard, high-risk case monitoring, follow-up analytics |

The core idea is **continuity**, not another pregnancy-tracking app.

---

## User Roles

### Mother
- Complete daily/periodic check-ins
- Report symptoms
- See recovery timeline
- Request help
- View upcoming follow-ups
- Get simple multilingual guidance

### ASHA / Health Worker
- See assigned mothers and risk status
- See missed check-ins
- Receive real-time alerts
- Call/message mother
- Record follow-up
- Escalate to PHC

### PHC / Supervisor
- Population-level dashboard
- View high-risk cases
- Monitor unresolved cases
- Track follow-up completion
- Identify geographic/service gaps

---

## The Nadi Risk Loop

The product's centerpiece — everything else supports this flow:

```
MOTHER
   ↓
Daily / scheduled check-in
   ↓
Risk engine (deterministic rules, not an LLM)
   ↓
┌──────────────┬──────────────┬──────────────┐
│     GREEN    │    AMBER     │     RED      │
│   Continue   │  Follow-up   │   Urgent     │
│   monitoring │  required    │   escalation │
└──────────────┴──────────────┴──────────────┘
                     ↓
              ASHA notification
                     ↓
               Follow-up action
                     ↓
              PHC escalation
                     ↓
                 CASE CLOSED
```

The risk engine is a deterministic rules engine, not an LLM — this keeps the safety-critical decision auditable. AI is used only to assist communication (translation, summarization, message generation), never to make the clinical call.


```

> Clinical rules used in a real deployment must be validated by qualified maternal-health professionals and aligned with applicable Indian clinical protocols. The above is a hackathon/demo simplification.

---

## Tech Stack

### Frontend
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- React Hook Form + Zod
- Recharts
- Lucide Icons

### Backend
- **Next.js API Routes / Route Handlers**
- **MongoDB** (via Mongoose or the native MongoDB Node.js driver)
- **NextAuth.js** (or a custom JWT-based auth layer) for authentication
- **Socket.io** or **MongoDB Change Streams** for realtime updates (replaces Supabase Realtime)
- File storage via **Cloudinary** or **AWS S3** (replaces Supabase Storage), if needed

### External Services
- Twilio (SMS/WhatsApp check-in prompts and ASHA alerts)
- Google Maps (nearest-facility routing on escalation)
- OpenAI (optional — local-language interpretation, note summarization)

### Analytics
- PostHog

### Deployment
- Vercel (app)
- MongoDB Atlas (database)

---

## Project Structure

```
nadi42/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── onboarding/
│   │
│   ├── mother/
│   │   ├── dashboard/
│   │   ├── check-in/
│   │   ├── timeline/
│   │   └── help/
│   │
│   ├── asha/
│   │   ├── dashboard/
│   │   ├── mothers/
│   │   ├── alerts/
│   │   └── cases/
│   │
│   ├── phc/
│   │   ├── dashboard/
│   │   ├── cases/
│   │   └── analytics/
│   │
│   ├── api/
│   │   ├── risk/
│   │   ├── notifications/
│   │   ├── ai/
│   │   └── maps/
│   │
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   ├── charts/
│   ├── forms/
│   ├── check-in/
│   ├── alerts/
│   ├── maps/
│   └── navigation/
│
├── lib/
│   ├── db/
│   │   ├── connect.ts        # MongoDB connection helper
│   │   └── models/           # Mongoose schemas/models
│   ├── risk-engine/
│   ├── twilio/
│   ├── maps/
│   ├── openai/
│   └── analytics/
│
├── hooks/
│   ├── useMother.ts
│   ├── useCheckIn.ts
│   └── useRealtimeCases.ts
│
├── types/
│   ├── mother.ts
│   ├── checkin.ts
│   └── case.ts
│
├── constants/
│   ├── questions.ts
│   └── risk.ts
│
├── public/
│   ├── icons/
│   └── illustrations/
│
├── scripts/
│   └── seed.ts                # MongoDB seed script
│
├── middleware.ts
├── package.json
└── README.md
```

---

## Database Design (MongoDB)

Instead of relational tables, Nadi42 uses MongoDB collections. Relationships are modeled with `ObjectId` references, and frequently-read summary fields (like `riskLevel`) are denormalized onto the `mothers` document for fast dashboard reads.

### `users`
```js
{
  _id: ObjectId,
  email: String,
  passwordHash: String,
  role: "mother" | "asha" | "phc",
  name: String,
  phone: String,
  language: String,
  createdAt: Date
}
```

### `mothers`
```js
{
  _id: ObjectId,
  userId: ObjectId,       // ref: users
  ashaId: ObjectId,       // ref: users
  phcId: ObjectId,        // ref: facilities
  deliveryDate: Date,
  location: {
    type: "Point",
    coordinates: [Number, Number] // [lng, lat]
  },
  riskLevel: "green" | "amber" | "red",
  lastCheckinAt: Date,
  createdAt: Date
}
```

### `checkins`
```js
{
  _id: ObjectId,
  motherId: ObjectId,      // ref: mothers
  bleeding: "normal" | "increasing" | "heavy",
  fever: Boolean,
  headache: Boolean,
  visionChanges: Boolean,
  emotionalState: String,
  feedingDifficulty: Boolean,
  riskLevel: "green" | "amber" | "red",
  createdAt: Date
}
```

### `cases`
```js
{
  _id: ObjectId,
  motherId: ObjectId,      // ref: mothers
  checkinId: ObjectId,     // ref: checkins
  riskLevel: "green" | "amber" | "red",
  status: "open" | "in_progress" | "resolved",
  trigger: String,
  assignedTo: ObjectId,    // ref: users (ASHA)
  createdAt: Date,
  resolvedAt: Date
}
```

### `followups`
```js
{
  _id: ObjectId,
  caseId: ObjectId,        // ref: cases
  ashaId: ObjectId,        // ref: users
  scheduledAt: Date,
  completedAt: Date,
  notes: String,
  status: "pending" | "completed"
}
```

### `notifications`
```js
{
  _id: ObjectId,
  recipientId: ObjectId,   // ref: users
  type: String,
  message: String,
  read: Boolean,
  createdAt: Date
}
```

### `facilities`
```js
{
  _id: ObjectId,
  name: String,
  type: "PHC" | "hospital",
  location: {
    type: "Point",
    coordinates: [Number, Number]
  },
  phone: String
}
```

### Suggested Indexes

```js
db.mothers.createIndex({ ashaId: 1 });
db.mothers.createIndex({ phcId: 1 });
db.mothers.createIndex({ location: "2dsphere" });
db.checkins.createIndex({ motherId: 1, createdAt: -1 });
db.cases.createIndex({ status: 1, riskLevel: 1 });
db.cases.createIndex({ assignedTo: 1 });
db.facilities.createIndex({ location: "2dsphere" });
```

The `2dsphere` indexes support "nearest facility" geo queries for the escalation flow (used with `$near` / `$geoNear`).

### Continuity Relationship

```
Mother
   │
   ├── Check-ins ──→ Risk result
   │
   ├── Cases ──→ ASHA, PHC
   │
   └── Follow-ups ──→ Resolution
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB instance)
- Twilio account (for SMS/WhatsApp alerts)
- Google Maps API key
- (Optional) OpenAI API key

### Installation

```bash
git clone <your-repo-url>
cd nadi42
npm install
```

### Configure environment

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env.local
```

### Run the database seed script

```bash
npm run seed
```

### Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/nadi42

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Google Maps
GOOGLE_MAPS_API_KEY=

# OpenAI (optional)
OPENAI_API_KEY=

# Analytics
POSTHOG_KEY=
POSTHOG_HOST=
```

---

## External Integrations

### Twilio
- Sends daily check-in prompts to mothers via SMS/WhatsApp
- Sends real-time risk alerts to ASHAs

### Google Maps
- Powers the "nearest facility" escalation screen when a case turns red
- Provides directions and distance/ETA from mother's location to nearest PHC

### OpenAI (optional)
- Converts local-language mother responses into structured symptom signals
- Generates concise case summaries for ASHAs
- Note: AI never decides risk level — the deterministic rules engine always makes that call.

---

## Demo Accounts & Seed Data

The seed script (`scripts/seed.ts`) populates MongoDB with:

```
428 mothers
  351 Green
  56 Amber
  21 Red

391 check-ins today
37 follow-ups pending
34 cases resolved
```

Demo login accounts:

```
Mother  → meena@nadi42.demo
ASHA    → asha@nadi42.demo
PHC     → phc@nadi42.demo
```

A dedicated demo mother ("Meena", postpartum day 11) is seeded to walk through the full red-risk journey: check-in → risk detection → ASHA alert → map escalation → follow-up → case closed.

---

## Roadmap / Out of Scope for MVP

Deliberately **not** part of the initial build:

- Full pregnancy tracking
- Baby growth tracker
- Large article/content library
- Complex appointment booking
- Payments
- Social community features
- Doctor marketplace
- Wearable integrations
- ML-based diagnosis
- Multi-language support beyond 1–2 languages at launch

The goal of the MVP is to execute the **Detect → Alert → Connect → Follow up → Close** loop extremely well, rather than build a broad, half-finished platform.
