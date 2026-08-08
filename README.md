# 🌊 AquaTrack — Smart Water Consumption, Billing & Anomaly Platform

> **AquaTrack** is an enterprise-grade, full-stack water metering, automated multi-tiered billing, anomaly leak detection, and apartment community management system. Designed with modern web aesthetics, real-time analytics, and automated email/PDF workflows.

---

## 📸 Overview & Key Features

AquaTrack provides an end-to-end ecosystem for apartment societies, property managers, and residents to monitor water usage, automate complex billing, detect leaks early, and enforce community regulations.

```
       +-----------------------------------------------------------------+
       |                     AquaTrack Architecture                      |
       +-----------------------------------------------------------------+
       |                                                                 |
       |   +-----------------------+         +-----------------------+   |
       |   |   React.js Frontend   | <-----> | Spring Boot 3 Backend |   |
       |   | (Vite, i18n, Recharts)|  JWT    |  (Java 17, Security)  |   |
       |   +-----------------------+         +-----------------------+   |
       |                                                 |               |
       |              +----------------------------------+               |
       |              |                  |               |               |
       |              v                  v               v               v
       |      +---------------+  +---------------+  +--------+  +--------+
       |      |  MySQL 8 DB   |  | Apache PDFBox |  | Spring |  | Google |
       |      | (Flyway Migr) |  | (PDF Invoices)|  |  Mail  |  | OAuth2 |
       |      +---------------+  +---------------+  +--------+  +--------+
       |                                                                 |
       +-----------------------------------------------------------------+
```

---

## 🚀 Exhaustive Feature Inventory

### 🔑 1. Authentication, Security & Access Control
- **Multi-Role Security Architecture**: Role-based authorization (`ADMIN`, `RESIDENT`, `SUPER_ADMIN`) powered by Spring Security and JWT tokens.
- **Dual Sign-In Options**:
  - Standard Email & Password Authentication.
  - **Google OAuth 2.0 Integration**: One-click Google Identity Services sign-in with server-side token validation against Google public keys.
- **Resident Approval Workflow**:
  - Every new resident registration (via Password or Google) starts in `PENDING` status.
  - Access is restricted until an **Admin approves** the account from the Admin Console.
  - Rejecting or Approving an account automatically sends a formatted HTML email notification to the resident.
  - Rejection prevents login with an explanatory status.
- **Auto-Approved Admin Accounts**: Admin registration bypasses the approval pipeline for instant platform setup.
- **Protected React Routes**: Dynamic route guarding (`ProtectedRoute.jsx`) ensuring residents cannot access admin tools and vice versa.

---

### 🏢 2. Multi-Tenant Apartment & Household Management
- **Apartment Complex Management**: Full CRUD capabilities for registering, updating, and managing multiple apartment complexes/societies.
- **Household / Flat Configuration**:
  - Detailed flat records: Flat Number, Block/Tower, Occupant Count, Flat Area in Sq Ft (`flat_size_sqft`), Meter Serial Number.
  - **Custom Daily Usage Limit**: Individual daily water cap (`daily_limit_kl`) per household for threshold alerts.
- **Households & Residents Directory**:
  - Comprehensive view linking residents to their respective flats.
  - Status tracking (`PENDING`, `APPROVED`, `REJECTED`) and auth provider identification (`PASSWORD` vs `GOOGLE`).
  - **Direct Fine Imposition**: Admins can issue fines directly to a household from the directory view.
- **Cascading Data Protection**: Clean database cascade management for apartment/household updates and removals.

---

### 📊 3. Water Metering & Usage Logging
- **Dual Meter Data Ingestion**:
  - **Manual Entry**: Single reading logging with meter serial verification, reading dates, and previous/current value inputs.
  - **Bulk CSV Upload**: High-volume meter data ingestion (`/api/usage/bulk-upload`) for updating multiple flats simultaneously.
- **Differential Consumption Calculation**: Automatic calculation of delta consumption in Kiloliters (kL) based on sequential meter readings.
- **Duplicate Reading & Anomaly Prevention**: Validation checks prevent duplicate readings or out-of-order reading dates.
- **Usage Provenance Tracking**: Tracks data sources (`MANUAL`, `BULK_CSV`, `SMART_METER`).

---

### 💰 4. Multi-Tier Dynamic Tariff Billing Engine
- **N-Tier Slab Rate Engine**:
  - Supports unlimited rate tiers per apartment complex (walkthrough algorithm via `BillingService.tieredCharge()`).
  - *Example Slab Setup*:
    - **Tier 1**: 0 – 10 kL @ ₹20 / kL
    - **Tier 2**: 10 – 25 kL @ ₹35 / kL
    - **Tier 3**: 25+ kL @ ₹50 / kL
- **Customizable Slab Parameters**: Configure Minimum Volume, Maximum Volume, Rate per kL, and optional Tier Flat Fees.
- **Dynamic Tariff Selection**: Easily switch or assign active tariff plans per apartment.

---

### 🚚 5. Bulk Water Purchases & Shared-Cost Apportionment
- **Itemized Bulk Water Purchase Tracking**:
  - Log secondary water supply purchases (Tankers, Municipal supplementary supply, borewell, etc.).
  - Records Purchase Type (`TANKER`, `MUNICIPAL`, `OTHER`), Volume (kL), Total Cost, Supplier Info, and Purchase Date.
- **Weighted-Average Unit Cost Engine**: Dynamically recalculates the weighted unit cost across all purchases in a cycle.
- **Proportional Shared-Cost Distribution**: Automatically allocates common bulk water costs across households based on their metered usage percentage.
- **Faulty / Inactive Meter Fallback**: Automatic fallback to flat area-based (`sqft`) apportionment for households without active meter logs during the cycle.

---

### 🧾 6. Billing Cycle Lifecycle & Invoicing Engine
- **Lifecycle Management**: 3-stage state machine: `OPEN` ➔ `FINALIZED` ➔ `ARCHIVED`.
- **Automated Batch Invoicing**: Finalizing a cycle automatically generates itemized invoices (`Invoice`) for all households.
- **Post-Finalization Adjustments**: Admins can issue reason-tracked credit/debit adjustments (`InvoiceAdjustment`) to finalized invoices with admin audit logging.
- **Invoice Status Tracking**: Status workflow covering `UNPAID`, `PAID`, `OVERDUE`, `CANCELLED`.

---

### 📄 7. PDF Invoice Generation & Automated Emailing
- **Server-Side PDF Generation**: Built with Apache PDFBox (`InvoicePdfService`) for crisp, professional invoice documents.
- **Itemized PDF Breakdown**: Includes billing cycle period, meter readings, slab-by-slab consumption costs, shared water charges, fines, adjustments, and total due amount.
- **Automated Email Attachment**: Finalizing a billing cycle automatically emails every resident their invoice **with the PDF invoice file attached directly**.
- **On-Demand PDF Download**: Residents can view and download past PDF invoices anytime from their dashboard.

---

### 🚨 8. Automated Alert & Anomaly Engine (3 Detection Strategies)
The alert engine monitors water consumption continuously using 3 complementary detection strategies:
1. **Absolute Daily-Limit Breach**: Triggers when a household's usage on a single day exceeds its configured daily cap.
2. **Relative Overuse Threshold**: Triggers when consumption exceeds a configurable percentage above the flat's recent baseline.
3. **2-Sigma (\(\mu + 2\sigma\)) Statistical Anomaly (Leak Detection)**: Triggers when usage exceeds 2 standard deviations above the household's historical mean, identifying silent leaks or pipe bursts.

- **Alert Spam Prevention**: Deduplication logic ensures an alert type will not re-trigger or re-email while an existing alert of that type remains unresolved.
- **Instant Notification**: Triggers instant in-app notification banners and sends an immediate email alert to the household.
- **Dual Execution**: Automated daily execution via Spring `@Scheduled` background job + Manual **"Run Check Now"** button in Admin Console.
- **Resolution Tracking**: Admins can review, acknowledge, and mark alerts as resolved.

---

### ⚖️ 9. Fines & Penalties System
- **Direct Fine Imposition**: Admins can levy fines on households for water wastage, unauthorized meter tampering, or policy violations.
- **Reason & Severity Tracking**: Detailed reason text, timestamp, and customizable fine amounts.
- **Fine Lifecycle**: Status workflow tracking `UNPAID`, `PAID`, and `WAIVED`.
- **Billing Integration**: Unpaid fines are integrated into resident bill statements and invoice summaries.
- **Instant Email Alerts**: Imposing a fine automatically emails the resident immediately.

---

### 🌐 10. Internationalization (i18n) & Multilingual Support
- **Full 6-Language UI**:
  - 🇬🇧 English (`en`)
  - 🇮🇳 Hindi — हिन्दी (`hi`)
  - 🇮🇳 Kannada — ಕನ್ನಡ (`ka`)
  - 🇮🇳 Tamil — தமிழ் (`ta`)
  - 🇮🇳 Telugu — తెలుగు (`te`)
  - 🇵🇰 Urdu — اردو (`ur`)
- **Dynamic Language Switcher**: Real-time language toggling powered by `react-i18next` without page reloads.

---

### 📈 11. Dashboards & Peer Analytics
- **Resident Dashboard**:
  - **Consumption Trends**: Interactive daily and monthly consumption charts (via Recharts).
  - **Peer Comparison Analytics**: Benchmark consumption against the **Apartment Average** and **Similar-Sized Flats** (\(\pm 15\%\) sqft).
  - **Invoice Center**: View bill history, status, and download PDF invoices.
  - **Alerts Feed**: Live feed of active usage alerts and leak warnings.
  - **Fines Tracking**: Overview of issued fines and payment status.
  - **Eco Tips**: Dynamic water-saving recommendations and efficiency score.

- **Admin Console**:
  - **Dashboard Overview**: Cross-household consumption comparison bar charts.
  - **Pending Approvals Tab**: Live badge-counter showing pending resident signups with approve/reject controls.
  - **Apartments & Flats Console**: Multi-tenant apartment creation, flat registration, and limit editing.
  - **Tariff Builder**: Interactive rate slab creation and plan configuration.
  - **Meter Readings Tab**: Manual reading entry and bulk CSV file uploader.
  - **Billing & Purchases Console**: Cycle opener, bulk water purchase logger, cost apportioner, finalizer, and PDF exporter.
  - **Fines Console**: Issue, track, pay, or waive household penalties.
  - **Alert Center**: Monitor active community alerts and run instant anomaly scans.

---

### 🎨 12. UI Aesthetics & Frontend Design
- **Water-Themed Modern Aesthetics**: Premium dark/light themes featuring cyan, teal, and deep blue ripple motifs with smooth glassmorphism effects.
- **Custom Design System**: Reusable component UI framework (`ui.jsx` - Modals, Stat Cards, Data Tables, Status Badges, Tab Panels, Toast Notifications).
- **Interactive Landing Page**: Modern product landing page with ripple hero section, feature showcase grid, stats banner, testimonials, and **Contact / Raise-a-Query Form**.
- **Responsive Layout**: Fully optimized for mobile, tablet, and widescreen desktop displays.

---

### 🛠️ 13. System Architecture & Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React.js (Vite), React Router v6, Context API |
| **Frontend Styling** | Custom Modular CSS, Glassmorphism, Recharts Data Viz |
| **Internationalization** | `react-i18next` (EN, HI, KA, TA, TE, UR) |
| **Backend Framework** | Spring Boot 3.x (Java 17) |
| **Security & Auth** | Spring Security, JWT (JSON Web Tokens), Google Identity Services |
| **Database & ORM** | MySQL 8.0, Spring Data JPA / Hibernate |
| **DB Migrations** | Flyway (`V1__init_schema.sql`, `V2__add_super_admin_role.sql`) |
| **Document Generation** | Apache PDFBox (Server-side PDF invoice engine) |
| **Email Service** | Spring Boot Starter Mail (SMTP HTML emails with PDF attachments) |
| **API Documentation** | OpenAPI 3.0 / Swagger UI |
| **Containerization** | Docker, Docker Compose |

---

## ⚡ Quick Start & Setup Guide

### 1. Database Setup (Docker)
Start the MySQL 8 database container:
```bash
docker compose up -d mysql
```
*Flyway will automatically execute database migrations on backend startup.*

---

### 2. Backend Setup (Spring Boot)
1. Navigate to the backend directory:
   ```bash
   cd aquatrack-backend
   ```
2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Configure your credentials in `.env` (Database, SMTP Email, Google Client ID).
4. Run the application:
   ```bash
   mvn spring-boot:run
   ```
   - **API Endpoint**: `http://localhost:8080`
   - **Swagger UI Docs**: `http://localhost:8080/swagger-ui.html`

---

### 3. Frontend Setup (React + Vite)
1. Navigate to the frontend directory:
   ```bash
   cd aquatrack-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set environment variables:
   ```bash
   cp .env.example .env
   ```
4. Launch development server:
   ```bash
   npm run dev
   ```
   - **Web App**: `http://localhost:5000`

---

## 🔄 End-to-End Operational Workflow

1. **Admin Registration**: Register an Admin account on the landing page (admins bypass the approval workflow).
2. **Society Setup**: In the Admin Console, create an **Apartment Complex** and add **Households** (Flats), setting occupants, area (sqft), meter serials, and custom daily usage limits.
3. **Tariff Configuration**: Build a multi-tier Tariff Plan with rate slabs (e.g., 0-10 kL @ ₹20, 10-25 kL @ ₹35, >25 kL @ ₹50).
4. **Resident Signup**: Residents register selecting their apartment and flat number (via Password or Google). Accounts are marked `PENDING`.
5. **Admin Approval**: Admin reviews signups in **Pending Approvals** tab and approves/rejects them. Automated confirmation emails are sent.
6. **Usage Logging**: Admin logs meter readings manually or uploads a **Bulk CSV** file.
7. **Cycle & Purchases**: Admin opens a Billing Cycle, logs bulk water purchases (tankers/municipal water), and computes unit costs.
8. **Cycle Finalization & Emailing**: Admin finalizes the cycle. Tiered usage charges and shared water costs are computed, invoices are generated, and residents are emailed their bills **with PDF invoices attached**.
9. **Leak Scan & Alerts**: The automated alert engine (or manual trigger) detects daily limit breaches, relative overuse, or statistical 2-Sigma leak anomalies, alerting residents via app & email.
10. **Fine & Penalty Management**: Admin can issue fines directly to households, track payment status, or waive them.

---

## 📜 License & Acknowledgments

Built with ❤️ by the **AquaTrack Engineering Team**. Powered by Spring Boot, React, and Apache PDFBox.
