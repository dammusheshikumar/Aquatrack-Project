# AquaTrack — Water Consumption & Billing Platform

A full-stack apartment water-metering and billing system.

**Stack:** React.js (plain JavaScript, no TypeScript) · Spring Boot 3 (Java 17) · MySQL 8 · Spring Security + JWT · Flyway · Apache PDFBox · Spring Mail · Google Identity Services

---

## 1. Project structure

```
aquatrack/
├── aquatrack-backend/          Spring Boot API
│   ├── src/main/java/com/aquatrack/
│   │   ├── config/              Security, JWT, CORS
│   │   ├── controller/          REST endpoints
│   │   ├── service/              Business logic (billing engine, alerts, email, PDF, approvals, fines)
│   │   ├── entity/                JPA entities
│   │   ├── repository/          Spring Data repositories
│   │   ├── dto/                    Request/response payloads (auth, household, usage, tariff, billing, admin)
│   │   ├── scheduler/           Scheduled alert job
│   │   └── exception/          Centralized error handling
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/       Flyway SQL migration (MySQL)
├── aquatrack-frontend/         React app
│   └── src/
│       ├── pages/                LandingPage, LoginPage, RegisterPage, ResidentDashboard, AdminPanel
│       ├── components/       Navbar, GoogleSignInButton
│       ├── context/              AuthContext (JWT session)
│       ├── api/                    Axios client
│       └── routes/               ProtectedRoute (role-based)
└── docker-compose.yml         MySQL for local development
```

## 2. Features

- **Landing page** — product overview, ripple-motif hero, contact/raise-a-query form, footer with copyright.
- **Role-based auth** — register/login as **Admin** or **Resident**, JWT-secured API, protected React routes per role.
- **Google Sign-In (residents only)** — verified server-side against Google's public keys; a Google email matching an admin account is rejected.
- **Resident approval workflow** — every new resident account (password or Google) starts **PENDING** and cannot log in until an admin approves it from the Admin Console's Pending Approvals tab (badge-flagged). Approve/reject both send the resident a confirmation email.
- **Household & apartment management** — admins register apartments and flats (size, occupancy, meter serial, optional daily usage limit), and can edit or delete an apartment (cascading).
- **Households & Residents view** — the admin console shows exactly who lives in each household (name, email, sign-in method, approval status) and lets the admin **impose a fine directly on that household**, right there.
- **Fines** — admin-imposed, reason-tracked, with UNPAID/PAID/WAIVED status; visible to the resident on their dashboard; imposing one raises an alert + sends an email immediately.
- **Usage logging** — admin-only (manual entry or bulk CSV upload); consumption is derived from the delta against the previous reading, with duplicate-reading detection.
- **N-tier tariff billing engine** — apartments configure any number of rate tiers (not just a fixed base/excess pair); `BillingService.tieredCharge()` walks the ordered tier list and bills each slice of consumption at its own rate.
- **Itemized bulk water purchases** — tanker / municipal / other, each individually recorded with a weighted-average unit cost recomputed across every purchase in the cycle.
- **Shared-cost apportionment** — proportional to metered consumption, with an automatic flat-area fallback for households whose meter is inactive.
- **Billing cycle lifecycle** — OPEN → FINALIZED → ARCHIVED, with one invoice generated per household on finalize, plus post-finalize reason-tracked adjustments.
- **PDF invoices** — generated server-side with Apache PDFBox, downloadable from the resident dashboard, and **attached directly to the billing-complete email** — the same PDF both places.
- **Alert engine — three detection strategies**, each raising an alert visible on both the resident dashboard and admin console, and each emailing the household immediately:
  1. **Absolute daily-limit breach** — a household's usage on a single day exceeds its configured cap.
  2. **Relative overuse** — usage vs. a configurable % of the household's recent average.
  3. **2σ statistical anomaly (leak detection)** — usage more than 2 standard deviations above the household's historical average.
  Runs on a daily `@Scheduled` cron job, or on-demand via "Run Check Now". A given alert type won't re-fire (or re-email) while the previous one of that type is still unresolved.
- **Dashboards** — resident: consumption trend chart, peer comparison (apartment average + similar-sized flats), invoice history, fines, alerts feed, water-saving tips. Admin: household consumption comparison chart, active alerts feed, tariff/billing/meter-upload/fines/approval consoles.

## 3. Running locally

### 3.1 Database

```bash
docker compose up -d mysql
```

Flyway creates every table automatically on first backend startup.

### 3.2 Backend

```bash
cd aquatrack-backend
cp .env.example .env      # edit DB, mail, and Google credentials
mvn spring-boot:run
```

Export the same variables as real environment variables (Spring Boot doesn't read `.env` natively) — e.g. `export $(cat .env | xargs)` on Linux/macOS, or set them in your IDE run configuration.

API: `http://localhost:8080`. Swagger UI: `http://localhost:8080/swagger-ui.html`.

**Email:** for Gmail, use an [App Password](https://myaccount.google.com/apppasswords) (a regular password won't work with 2FA). Any SMTP provider works — just change `MAIL_HOST`/`MAIL_PORT`.

**Google Sign-In:** create an OAuth 2.0 Client ID at the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (type: Web application), add `http://localhost:5000` as an authorized JavaScript origin, and set `GOOGLE_CLIENT_ID`. The backend calls out to Google at runtime to verify tokens, so it needs outbound internet access.

### 3.3 Frontend

```bash
cd aquatrack-frontend
npm install
cp .env.example .env       # set REACT_APP_GOOGLE_CLIENT_ID too
npm start
```

Runs on `http://localhost:5000`.

## 4. Typical workflow

1. **Register an Admin** on the landing page → log in immediately (admins skip the approval workflow).
2. In the Admin Console: **create an Apartment**, register **Households** (flats), and optionally set a per-household daily usage limit.
3. Configure a **Tariff Plan** — add as many rate tiers as needed (e.g. ₹20/kL up to 10 kL, ₹35/kL up to 25 kL, ₹50/kL beyond).
4. Residents **register** (password or Google) by selecting their apartment + flat — their account is created **PENDING**.
5. The admin reviews it in **Pending Approvals** and approves (or rejects) — the resident is emailed either way, and can only log in after approval.
6. Admin logs meter readings — **bulk CSV** or **manual entry** — from the Meter Uploads tab.
7. Admin **opens a billing cycle**, records **bulk water purchases** (tanker/municipal, with volume + unit cost).
8. Admin **finalizes the cycle** — tiered charges + proportional shared allocation are computed per household, invoices are generated, and each resident is emailed their bill **with the PDF invoice attached**.
9. The alert scheduler (or "Run Check Now") flags daily-limit breaches, overuse, and 2σ leak anomalies — visible on both dashboards and emailed instantly.
10. From **Households**, the admin can see who lives where and **impose a fine directly** on a household; from **Fines**, track and resolve them.

## 5. Notes on scope

This is a complete, runnable project covering the full flow end to end with real business logic — not stubs — for the tariff engine, cost apportionment, anomaly detection, PDF generation + email delivery, and the approval/fine workflows. Things you'd likely want before production: refresh tokens, password reset, pagination on large tables, audit logging, and rate limiting on the registration/login endpoints.
