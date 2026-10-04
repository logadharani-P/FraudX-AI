# FraudX AI

## AI-Based Cooperative Financial Fraud Intelligence

FraudX AI is an AI-powered platform for cooperative financial fraud intelligence and anomaly detection. It analyzes transaction behavior, surfaces statistical anomalies, produces explainable risk signals, and streamlines human-led fraud investigations. FraudX AI is designed to augment analysts and compliance officers with actionable intelligence — all flagged indicators represent risk intelligence and do not constitute definitive fraud accusations.

---

## Problem Statement

Detecting subtle fraud patterns in cooperative financial societies is challenging. Fraudulent schemes often span multiple transactions, accounts, members, locations, and connected relationships over time. Traditional rule-based threshold systems struggle to detect distributed, low-and-slow anomalies, while isolated checks cannot surface coordinated or layered activity. Cooperative institutions face particular challenges due to interconnected community networks and the need for explainable, human-governed fraud intelligence.

---

## Overview & Architecture

FraudX AI provides an end-to-end cooperative fraud intelligence workflow:

1. **Ingestion & Cooperative Context** — Ingests AMLSim-derived transaction datasets and applies cooperative enrichment (member profiles, account types, purposes, devices, and geographic coordinates).
2. **Behavioral Feature Engineering** — Computes velocity, amount dispersion, channel distributions, and time-based metrics per account and transaction.
3. **Unsupervised Anomaly Detection** — An ensemble of Isolation Trees built directly in pure NumPy detects statistical outliers without requiring ground-truth fraud labels.
4. **Calibrated Risk Scoring** — Maps anomaly indicators to an explainable 0–100 risk score and four distinct operational risk tiers: Low, Medium, High, and Critical.
5. **Explainable Risk Indicators** — Deconstructs anomaly scores into human-readable factor summaries for each flagged transaction.
6. **Network & Graph Analysis** — Leverages NetworkX to construct directed transaction relationship graphs, revealing money flow clusters, rapid fan-in/fan-out patterns, and shared entity rings.
7. **Analyst Investigation & Case Management** — Supports case creation, priority assignment, evidence aggregation, and resolution tracking.
8. **Persistent Risk Treatment** — Allows authorized analysts to record auditable mitigation actions (Blocked, Froze, Escalated, Monitored, Whitelisted, NoteAdded).
9. **Role-Aware AI Intelligence Agent** — Provides interactive contextual analysis and evidence summarization scoped strictly by user role.
10. **Audit & Traceability** — Records auditable logs for compliance review and generates structured PDF, CSV, and JSON exports.

---

## Key Capabilities

- **Behavioral Transaction Analysis** — Multi-dimensional monitoring of transaction velocity, amount deviation, purpose alignment, and device profiles.
- **Unsupervised Anomaly Detection** — Pure NumPy Isolation Forest identifying out-of-distribution transactions.
- **Calibrated Risk Scoring** — 0–100 risk scoring with transparent categorization (Low <35, Medium 35–59, High 60–79, Critical ≥80).
- **Explainable Risk Indicators** — Evidence-based factors explaining specific reasons why a transaction was flagged.
- **Fraud Alert Center** — Real-time triage queue for elevated risk transactions with status tracking.
- **Investigation Case Management** — Full lifecycle case management for financial crime analysts.
- **Network / Relationship Graph** — Interactive directed graph visualization of member-to-member transaction relationships using NetworkX.
- **Persistent Risk Treatment** — Auditable treatment actions recorded against alerts and member accounts (Blocked, Froze, Escalated, Monitored, Whitelisted).
- **Role-Aware AI Agent** — Natural-language financial crime query assistant with strict data-scoping per role.
- **Comprehensive Reporting** — Downloadable structured reports in PDF, CSV, and JSON formats.
- **Audit Logging** — Auditable logging of all security, investigation, and configuration events.
- **Geographic Transaction Visualization** — Interactive spatial map (Leaflet / React-Leaflet) of transactions across cooperative operating regions.

---

## Authentication & Role-Based Access Control (RBAC)

FraudX AI implements a multi-role authentication system with cryptographically secure email OTP verification:

### Supported Roles

1. **Customer**
   - Self-registration with automatic cooperative member profile generation and baseline account initialization.
   - Secure credential login with direct access to private account activity.
   - **Customer Data Isolation**: Customers are strictly restricted to their own transactions, accounts, and member details. Access to analyst or organisation endpoints is denied with HTTP 403.
2. **Analyst**
   - Analyst Sign In with credential verification.
   - **Analyst Enrol / Request Clearance**: Allows analysts to submit clearance requests with badge identifier (`ANL-200001` format).
   - Operational access to dashboard analytics, transaction triage, alert management, case investigations, graph relationships, and intelligence reports.
3. **Organisation (Admin)**
   - Organisation Sign In and Organisation Administrator registration.
   - Executive dashboard access, society-wide risk profiling, policy configurations, comprehensive audit logs, and compliance oversight.

### Email Verification Code / OTP Specifications

| Security Parameter | Specification |
|---|---|
| **OTP Format** | 6-digit random numeric code |
| **Generation Algorithm** | `secrets.randbelow(900000) + 100000` (Cryptographically secure, range `100000`–`999999`) |
| **Static / Hardcoded Codes** | **None** — Every challenge generates a fresh, non-deterministic random code |
| **Expiration Time** | 5 minutes (300 seconds) |
| **Maximum Attempt Limit** | 5 failed attempts allowed before challenge invalidation |
| **Usage Policy** | Single-use — challenge is immediately consumed and invalidated upon successful verification |
| **Resend Cooldown** | 30-second throttle between resend requests |
| **Resend Invalidation** | Requesting a new code immediately invalidates any previously issued OTP |
| **Secret Masking** | Plaintext OTP is never returned in API responses, never logged to persistent files, and never exposed to the frontend |
| **Token Format** | Signed JWT (HS256 Bearer Token) issued only upon completed verification |
| **Email Delivery (Local)** | Standard Gmail SMTP with STARTTLS on port `587` |
| **Email Delivery (Cloud)** | Multi-provider architecture supporting SMTP, Resend, SendGrid, and Brevo |

---

## Synthetic Data & Enrichment

The application ingests an **AMLSim-derived synthetic transaction dataset** and enriches it for cooperative society banking scenarios:

- **Source Data**: Synthetic transaction records derived from AMLSim benchmark distributions.
- **Cooperative Enrichment**: Application-level enrichment assigns member identifiers (`MBR-400xxx`), cooperative account numbers (`ACC-900xxx`), transaction types (UPI, IMPS, NEFT, RTGS, Cash), cooperative purposes (Agricultural Seeds & Fertilizer, Dairy Equipment, Share Capital, Crop Loan, Utility), device signatures, and coordinates.
- **Label Clarification**: Synthetic labels (`is_fraud_label`) are used strictly for benchmark validation. Flagged anomalies in the live application represent statistical outliers and risk signals for human review, not absolute legal determinations of fraud.

---

## Machine Learning & Analytics

### Pure NumPy Isolation Forest

The core anomaly detection engine is implemented in pure NumPy without relying on scikit-learn for tree construction:
- **Ensemble Architecture**: 100 Isolation Trees trained on recursive random subsamples.
- **Path Length Normalization**: Anomaly scoring based on average depth `s(x, n) = 2^(-E(h(x)) / c(ψ))`.
- **Score Calibration**: Normalizes raw anomaly scores to a 0–100 scale.
- **Threshold Tiers**:
  - **Low Risk**: `Score < 35.0` (Normal baseline behavior)
  - **Medium Risk**: `35.0 ≤ Score < 60.0` (Moderate deviation, watch list)
  - **High Risk**: `60.0 ≤ Score < 80.0` (Significant anomaly, automated alert generated)
  - **Critical Risk**: `Score ≥ 80.0` (Extreme anomaly requiring priority human investigation)

### Network Relationship Analysis

`network_analysis.py` models directed money flows using **NetworkX**:
- Member connectivity degrees (in-degree / out-degree).
- Detection of fan-out structuring and pass-through hubs.
- Visual subgraph extraction for flagged entities.

---

## Role-Aware AI Intelligence Agent

The **FraudX Intelligence Agent** assists human investigators with contextual explanations:
- **Role-Scoped Context**: Customers can only ask questions regarding their own account history; analysts and organisation admins can query society-wide risk trends and transaction patterns.
- **Non-Accusatory Governance**: Formulates responses using objective evidence factors, confidence indicators, and recommended investigation steps.

---

## Technology Stack

### Frontend
- **Framework**: React 19 with Vite
- **Routing**: React Router DOM
- **Charts & Visualizations**: Recharts
- **Geospatial Maps**: Leaflet & React-Leaflet
- **Styling**: Vanilla CSS Design System with theme variables (Default: Pearl / Light theme with persisted user preferences)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn (ASGI)
- **Database ORM**: SQLAlchemy
- **Authentication**: PyJWT & direct bcrypt password hashing
- **Email Delivery**: Python `smtplib` (STARTTLS / SSL) with httpx multi-provider fallback (Resend, SendGrid, Brevo)
- **Reporting**: ReportLab (PDF) & Python standard CSV

### Database
- **Local Development**: SQLite (`backend/fraudx.db`)
- **Production**: PostgreSQL compatible via SQLAlchemy connection string (`DATABASE_URL`)

---

## Local Development Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- Git

### 1. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Create local environment configuration
# Copy .env.example to .env
cp .env.example .env
```

Configure the following variables in `backend/.env`:

```env
DATABASE_URL=sqlite:///./fraudx.db
JWT_SECRET_KEY=your-secure-random-32-byte-hex-secret
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=FraudX AI Security
```

Start the backend server:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Health Check**: `GET http://localhost:8000/health`
- **Interactive API Docs**: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd fraudx-app

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## Production Deployment

- **Frontend Deployment (Vercel)**:
  - Framework Preset: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Environment Variable: `VITE_API_URL=https://<your-render-backend-url>`
- **Backend Deployment (Render)**:
  - Runtime: Python 3
  - Root Directory: `backend`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Environment Variables configured in Render dashboard: `DATABASE_URL`, `JWT_SECRET_KEY`, `EMAIL_PROVIDER`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `CORS_ORIGINS`.

---

## Verification & Testing

### Test Suite Execution

Run the complete backend automated test suite:

```bash
cd backend
python -m pytest -q
```

**Latest Verified Test Run:**
- **Status**: **11 tests passed, 0 failed**
- **Test Modules**:
  1. `test_root_and_health` — Root and health endpoint availability
  2. `test_auth_login_and_profile_data` — Customer, Analyst, and Organisation authentication & complete profile retrieval
  3. `test_mfa_and_face_verification` — Server-side MFA challenge validation, attempt exhaustion, and face demonstration
  4. `test_customer_registration_persistence_and_isolation` — Customer registration, member creation, and transaction seeding
  5. `test_customer_rbac_denials` — Strict HTTP 403 enforcement preventing customer access to analyst/org endpoints
  6. `test_analyst_and_organisation_access` — Full operational access to cases, alerts, and management views
  7. `test_transaction_explanations_location_and_ai_agent` — Risk explanations, location mapping, and scoped AI agent queries
  8. `test_alert_details_and_persistent_risk_treatment` — Alert detail retrieval and persistent mitigation treatment actions
  9. `test_reports_traceability_and_readable_formats` — PDF binary validation, CSV structure, and JSON report exports
  10. `test_all_roles_registration_email_delivery_and_otp_randomness` — End-to-end registration email dispatch for all 3 roles, verification of dynamic 6-digit OTP randomness, and safe HTTP 503 error handling on delivery failure
  11. `test_smtp_email_service_unit` — Unit validation of SMTP host/port connection, STARTTLS initialization, credentials validation, and exception safety

### Frontend Production Build

```bash
cd fraudx-app
npm run build
```

**Latest Verified Build:**
- **Status**: **Success (0 errors)** in 618ms.

---

## Known Limitations

1. **Synthetic Dataset**: The anomaly detection engine is calibrated on AMLSim synthetic cooperative transactions. Performance benchmarks reflect synthetic patterns and should be re-calibrated for production cooperative data.
2. **Face Verification Step**: The facial verification step in the analyst login flow is a frontend demonstration of secondary biometric liveness validation and is not connected to a government ID biometric registry.
3. **MFA Challenge Memory Store**: Active OTP challenge sessions are stored in-memory with automatic 5-minute TTL cleanup. In high-availability multi-instance deployments, a shared Redis cache would be utilized.
