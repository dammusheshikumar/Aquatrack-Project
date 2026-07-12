# AquaTrack — Water Consumption & Billing Platform

A full-stack apartment water-metering and billing system.

**Stack:** React.js (plain JavaScript, no TypeScript) · Spring Boot 3 (Java 17) · MySQL 8 · Spring Security + JWT · Flyway · Apache PDFBox · Spring Mail

---

## 1. Project structure

```
aquatrack/
├── aquatrack-backend/          Spring Boot API
│   ├── src/main/java/com/aquatrack/
│   │   ├── config/             Security, JWT, CORS
│   │   ├── controller/         REST endpoints
│   │   ├── service/            Business logic (billing engine, alerts, email, PDF)
│   │   ├── entity/             JPA entities
│   │   ├── repository/         Spring Data repositories
│   │   ├── dto/                Request/response payloads
│   │   ├── scheduler/          Scheduled alert job
│   │   └── exception/          Centralized error handling
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/       Flyway SQL migrations (MySQL)
├── aquatrack-frontend/         React app
│   └── src/
│       ├── pages/              LandingPage, LoginPage, RegisterPage, ResidentDashboard, AdminPanel
│       ├── components/         Navbar
│       ├── context/            AuthContext (JWT session)
│       ├── api/                Axios client
│       └── routes/             ProtectedRoute (role-based)
└── docker-compose.yml          MySQL for local development
```

## 2. Features implemented

- **Landing page** — product overview, distinct water-themed visual identity.
- **Role-based auth** — register/login as **Admin** or **Resident**, JWT-secured API, protected React routes per role.
- **Household & apartment management** — admins register apartments and flats (size, occupancy, meter serial).
- **Usage logging** — residents log daily meter readings manually; admins bulk-upload via CSV. Consumption is derived from the delta against the previous reading. Duplicate readings for the same household/date are detected and rejected (DB unique constraint + application check).
- **Tiered tariff billing engine** — configurable base rate / base tier limit / excess rate per apartment; `BillingService.tieredCharge()` computes the correct tier-boundary charge.
- **Shared-cost apportionment** — bulk water purchases are split across households proportional to metered consumption, with an automatic flat-area fallback for households whose meter is inactive.
- **Billing cycle lifecycle** — OPEN → FINALIZED → ARCHIVED, with one invoice generated per household on finalize.
- **PDF invoices** — generated server-side with Apache PDFBox, downloadable from the resident dashboard.
- **Email alerts** — `EmailService` sends: overuse warnings, 2-sigma statistical leak/anomaly alerts, and "your bill is ready" notifications on billing finalization. `AlertScheduler` runs the checks daily via a Spring `@Scheduled` cron job (configurable), and admins can also trigger a check on demand.
- **Dashboards** — resident: consumption trend chart, peer comparison (apartment average + similar-sized flats), invoice history, water-saving tips. Admin: household consumption comparison chart, active alerts feed, tariff/billing/meter-upload consoles.

## 3. Running locally

### 3.1 Database

```bash
docker compose up -d mysql
```

This starts MySQL 8 on `localhost:3306` with database `aquatrack` (user `root` / password `root`). Flyway will create all tables automatically on first backend startup — no manual schema setup needed.

### 3.2 Backend

```bash
cd aquatrack-backend
cp .env.example .env      # edit DB and mail credentials
mvn spring-boot:run
```

Set the same variables as real environment variables (or via your IDE run configuration) — Spring Boot does not read `.env` files natively; use `export $(cat .env | xargs)` on Linux/macOS, or configure them in `application.yml` directly for local dev.

The API starts on `http://localhost:8080`. Swagger UI: `http://localhost:8080/swagger-ui.html`.

**Email:** for Gmail, generate an [App Password](https://myaccount.google.com/apppasswords) (regular password will not work with 2FA). Any other SMTP provider (SendGrid, Mailgun, etc.) works too — just change `MAIL_HOST`/`MAIL_PORT`.

### 3.3 Frontend

```bash
cd aquatrack-frontend
npm install
cp .env.example .env
npm start
```

Runs on `http://localhost:3000` and talks to the backend at `REACT_APP_API_BASE_URL` (default `http://localhost:8080/api`).

## 4. Typical workflow

1. **Register an Admin** on the landing page → creates the account. Log in.
2. In the Admin Console: **create an Apartment**, then register **Households** (flats) under it.
3. Configure a **Tariff Plan** (base rate, base tier limit, excess rate) — this becomes the apartment's active plan.
4. Residents **register** by selecting the apartment + their flat number (the flat must already exist).
5. Residents log daily meter readings from their dashboard, or the admin bulk-uploads a CSV (`flat_number,reading_date,reading_value`).
6. Admin **opens a billing cycle**, **records bulk water purchases** (volume + unit cost) during that period.
7. Admin **finalizes the cycle** — the engine computes tiered charges + proportional shared allocation per household, generates invoices, and emails each resident.
8. Residents download their **PDF invoice** and see it in their dashboard.
9. The alert scheduler (or a manual "Run Check Now" from the Admin Alerts tab) flags overuse and statistical (2σ) leak anomalies and emails affected residents automatically.

## 5. Notes on scope

This is a complete, runnable scaffold covering the full flow end to end with real business logic (not stubs) for the tariff engine, cost apportionment, anomaly detection, PDF generation, and email delivery. Things you'd likely want to add before production: refresh tokens, password reset flow, pagination on large tables, audit logging, and a proper migration strategy for tariff plan changes mid-cycle.
