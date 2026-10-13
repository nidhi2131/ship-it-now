# CareConnect

CareConnect is a modern elder-care platform designed to connect families with verified, experienced local caregivers across India. Built on TanStack Start and React 19, the application provides an accessible, bilingual experience with seamless role-based workflows for both care seekers and care workers.

---

## Overview

The platform simplifies elder-care coordination by enabling families to specify personalized care requirements—including assistance with daily activities, mobility, medication reminders, and companionship—while allowing caregivers to showcase their verified skills, availability, and service locations.

### Key Capabilities

- **Role-Based Onboarding**: Guided setup flows tailored for both care seekers and care workers.
- **Discovery and Filtering**: Search caregivers by locality, language spoken, skills, rate range, and availability type.
- **Direct Messaging**: Dedicated conversation threads between matched families and caregivers.
- **Multilingual Support**: Fully localized in English, Hindi (हिंदी), and Gujarati (ગુજરાતી).
- **Hybrid Data Layer**: Real-time Supabase cloud persistence with automatic local storage fallback for offline resilience.
- **Accessible Design**: High-contrast, clean UI built with Radix primitives and Tailwind CSS.

---

## Tech Stack

| Layer              | Technology                                      |
| ------------------ | ----------------------------------------------- |
| Framework          | TanStack Start (SSR & File-based Routing)       |
| Core Library       | React 19                                        |
| Language           | TypeScript                                      |
| Styling            | Tailwind CSS v4, Lucide Icons                   |
| UI Primitives      | Radix UI                                        |
| Database & Auth    | Supabase (PostgreSQL, Row Level Security, Auth) |
| Build Tool         | Vite 7                                          |
| Validation & Forms | Zod, React Hook Form                            |

---

## Directory Structure

```text
ship-it-now/
├── public/                     Static assets (favicon, robots.txt)
├── src/
│   ├── components/             Core application UI components
│   │   ├── form-bits.tsx       Shared form controls, inputs, buttons, and chips
│   │   ├── seeker-card.tsx     Family care request summary card
│   │   ├── site-chrome.tsx     Site header, navigation, language switcher, and footer
│   │   └── worker-card.tsx     Caregiver summary card
│   ├── lib/
│   │   ├── i18n/               Localization dictionaries (English, Hindi, Gujarati)
│   │   ├── error-capture.ts    Runtime error capture utilities
│   │   ├── error-page.ts       Fallback error page renderer
│   │   ├── error-reporting.ts  Client error reporting handler
│   │   ├── store.ts            Reactive state store, auth sessions, and live Supabase sync
│   │   └── supabase.ts         Supabase client initialization
│   ├── routes/                 File-based routes and pages
│   │   ├── __root.tsx          Root application shell, SEO metadata, and layout
│   │   ├── index.tsx           Landing page
│   │   ├── login.tsx           Authentication page (Email / Mobile Number login)
│   │   ├── messages.$id.tsx    Request-gated real-time messaging thread
│   │   ├── onboarding.index.tsxAccount creation step
│   │   ├── onboarding.role.tsx Role selection step (Family vs. Caregiver)
│   │   ├── onboarding.seeker.tsxFamily care request onboarding form
│   │   ├── onboarding.worker.tsxCaregiver onboarding form
│   │   ├── profile.seeker.$id.tsxProtected care request detail page
│   │   ├── profile.worker.$id.tsxProtected caregiver profile & review page
│   │   ├── search.tsx          Protected Caregiver & Care Request directory with filters
│   │   ├── seeker.dashboard.tsxFamily dashboard (matches, offers, sent requests)
│   │   └── worker.dashboard.tsxCaregiver dashboard (matches, incoming requests, reviews)
│   ├── router.tsx              TanStack Router configuration
│   ├── routeTree.gen.ts        Auto-generated route tree
│   ├── server.ts               SSR server entry point
│   ├── start.ts                TanStack Start configuration
│   └── styles.css              Global Tailwind CSS v4 theme and styles
├── supabase-schema.sql         PostgreSQL schema, indexes, triggers, and Realtime config
├── SUPABASE_SETUP.md           Supabase setup and configuration guide
├── tsconfig.json               TypeScript configuration
├── vite.config.ts              Vite + TanStack Start build configuration
└── package.json                Project scripts and dependencies
```

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm, pnpm, or bun

### 1. Installation

Clone or extract the repository and install the dependencies:

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

_Note: If no Supabase credentials are provided, CareConnect runs in local fallback mode using browser storage and built-in seed accounts._

### 3. Database Setup (Optional)

To connect your Supabase database:

1. Open the SQL Editor in your Supabase dashboard.
2. Execute the queries provided in `supabase-schema.sql`.
3. Review `SUPABASE_SETUP.md` for specific Auth and Row Level Security settings.

### 4. Running the Development Server

Start the local development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Available Scripts

| Command           | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | Starts the Vite development server with hot module replacement |
| `npm run build`   | Builds the client and server bundles for production            |
| `npm run preview` | Runs a local preview of the production build                   |
| `npm run lint`    | Runs ESLint to verify code quality across the project          |
| `npm run format`  | Formats all files using Prettier                               |
