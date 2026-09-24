# FraudX AI

## AI-Based Cooperative Financial Fraud Intelligence

FraudX AI is an AI-powered platform for cooperative financial fraud intelligence. It analyzes transaction behavior, detects unusual patterns, produces explainable risk signals, and supports human-led fraud investigation. FraudX AI is designed to provide risk intelligence to analysts and compliance officers — it does not make a final fraud accusation and does not replace human investigators.

---

## Problem Statement

Detecting subtle fraud patterns in cooperative financial systems is difficult. Fraudulent activity often spans multiple transactions, members, accounts, devices, locations, and connected relationships over time. Traditional rule-based systems miss complex behavioral anomalies, while isolated transaction checks cannot surface coordinated or layered activity. Cooperative societies face particular challenges due to the personal, long-standing relationships between members and the limited tooling available for behavioral monitoring at scale.

---

## Proposed Solution

FraudX AI provides an end-to-end cooperative fraud intelligence workflow:

1. **Transaction and member data** — synthetic AMLSim-based cooperative transaction data is ingested and enriched with member, channel, purpose, device, and location context.
2. **Behavioral analysis** — per-member and per-transaction features are extracted to capture behavioral patterns.
3. **AI anomaly detection** — a pure NumPy Isolation Forest engine detects statistically unusual transactions without requiring labeled training data.
4. **Risk scoring** — each transaction receives a calibrated risk score (0–100) and a risk level (Low / Medium / High / Critical).
5. **Explainable fraud alerts** — the system generates evidence-based explanations for why a transaction was flagged, presented as human-readable anomaly factors.
6. **Transaction/network relationship analysis** — NetworkX is used to model the directed transaction graph, revealing relationships, clusters, and flow patterns between members.
7. **Human investigation** — analysts open and manage fraud investigations with structured case notes and status tracking.
8. **Risk treatment** — persistent risk treatment actions (e.g., freeze, monitor, escalate, clear) are recorded against alerts and members.
9. **Audit trail** — all analyst and organisation actions are logged for accountability and compliance review.

> **Important:** FraudX AI provides risk intelligence. All flagged transactions and risk indicators must be reviewed by a human investigator before any action is taken. The system does not make a final fraud determination.

---

## Key Features

- **Transaction monitoring** — browse, filter, and inspect all cooperative transactions with enriched context.
- **Behavioral anomaly detection** — unsupervised Isolation Forest detects statistically unusual transaction patterns.
- **Risk scoring and risk levels** — calibrated 0–100 risk scores with four levels: Low, Medium, High, Critical.
- **Explainable fraud alerts** — each alert includes evidence-based anomaly factors explaining the risk signals.
- **Member risk profiling** — per-member risk overview with transaction history and behavioral indicators.
- **Transaction network analysis** — directed transaction graph built with NetworkX to visualize member-to-member relationships and detect connected activity.
- **Fraud investigation workflow** — analysts can open, assign, and close investigations with case notes and status tracking.
- **Persistent risk treatment actions** — freeze, monitor, escalate, or clear actions are saved and auditable.
- **Role-based access control** — three roles: `customer`, `analyst`, and `organisation`, each with different permissions and views.
- **Customer data isolation** — each customer sees only their own transactions and member data.
- **Email OTP / MFA authentication** — analyst and organisation logins require a 6-digit verification code sent to email before a JWT session is issued.
- **FraudX Intelligence Agent** — an interactive AI agent for natural-language queries over transaction and risk data, scoped by role.
- **PDF, CSV, and JSON reports** — downloadable reports for investigations and transaction data.
- **Transaction location visualization** — interactive map (Leaflet/React-Leaflet) showing transaction geographic distribution.
- **Audit logging** — all significant analyst and organisation actions are recorded with timestamps.

---

## Authentication & Security

### Login Flow (Analyst and Organisation roles)

```
Email + Password submitted
    → Backend validates credentials
    → OTP generated and sent to the email entered during login
    → Frontend prompts user to enter the 6-digit code
    → User submits OTP
    → Backend verifies OTP against server-side challenge
    → On success: JWT access token is issued
    → On failure: attempt count incremented; challenge invalidated after 5 failed attempts
```

Customer logins use email and password only (no MFA step).

### Verified Security Parameters

| Parameter | Value |
|---|---|
| OTP format | 6-digit random numeric code |
| OTP generation | `secrets.randbelow()` — cryptographically secure |
| OTP expiry | 5 minutes (300 seconds) |
| Maximum incorrect attempts | 5 — challenge is invalidated on breach |
| OTP reuse | Single-use; consumed on successful verification |
| OTP in API responses | Never returned in login or challenge API responses |
| OTP on frontend | Never displayed |
| OTP delivery | Sent to the exact email entered during login |
| Token type | JWT (Bearer) |
| Role enforcement | Backend enforces RBAC on every protected endpoint |
| Customer data isolation | Customers can only access their own records |
| Secrets management | Credentials and secrets are stored in `.env`, excluded from source control |

### Face Verification

The application includes a secondary face verification demonstration step as part of the authentication flow for analyst and organisation users. This is a demonstration/liveness flow — it is not a production-grade biometric recognition system.

---

## AI / Machine Learning

### Anomaly Detection

FraudX AI implements a **pure NumPy Isolation Forest** (Liu et al., 2008) from scratch — no scikit-learn dependency is required for the core model. The algorithm:

- Builds an ensemble of 100 isolation trees, each trained on a random subsample of 256 transactions.
- Computes anomaly scores in [0, 1] using average path length normalization (`s(x, n) = 2^(-E(h(x)) / c(ψ))`).
- Calibrates raw scores to a 0–100 risk scale using min-max normalization.
- Assigns risk levels based on thresholds: Critical (≥80), High (≥60), Medium (≥35), Low (<35).

### Explainability

The `risk_explainer` module generates evidence-based, human-readable anomaly factors for each flagged transaction by examining the transaction's features against behavioral norms.

### Network Analysis

`network_analysis.py` uses **NetworkX** to build a directed transaction graph. This allows the system to compute relationship metrics, identify high-connectivity members, detect transaction clusters, and surface connected activity between accounts.

### Data Processing

**NumPy** and **Pandas** are used throughout for feature engineering, statistical computation, and data transformation.

### Evaluation Results (Synthetic Benchmark)

The ML engine was evaluated against 1,430 seeded synthetic transactions from the AMLSim dataset, using the embedded `is_fraud_label` ground truth:

| Metric | Result |
|---|---|
| Precision | 48.98% |
| Recall | 60.00% |
| F1 Score | 53.93% |
| False Positive Rate | 3.70% |

> These results are from the project's synthetic evaluation dataset and are **not** indicators of real-world financial fraud detection performance.

---

## Dataset

The backend uses an **AMLSim-based synthetic transaction environment** enriched with cooperative financial context. The dataset is not real banking data.

Synthetic enrichment applied includes:

- Member information (member ID, account ID, account type, balances)
- Transaction channels (e.g., mobile app, branch, ATM, online)
- Transaction purposes (e.g., loan repayment, savings deposit, transfer)
- Device information
- Geographic location (latitude/longitude)
- Risk and anomaly indicators (`is_fraud_label`, `is_suspicious`, anomaly flags)

---

## Technology Stack

### Frontend
- React 19 (Vite)
- React Router DOM
- Recharts (charts and dashboards)
- Leaflet / React-Leaflet (transaction location maps)
- Framer Motion (animations)
- PapaParse (CSV parsing)

### Backend
- Python 3
- FastAPI
- Uvicorn
- SQLAlchemy (ORM)
- PyJWT (JWT)
- bcrypt / passlib (password hashing)
- python-dotenv

### Database
- SQLite (local development / default)
- PostgreSQL (supported via `psycopg2-binary`; configured via `DATABASE_URL` environment variable)

### AI / ML / Data
- NumPy (pure NumPy Isolation Forest implementation)
- Pandas
- scikit-learn (feature engineering utilities)
- joblib

### Visualization / Graph
- NetworkX (transaction relationship graph)
- Leaflet / React-Leaflet (geographic visualization)
- Recharts

### Reporting
- ReportLab / fpdf2 (PDF report generation)

---

## Project Structure

```
FraudX-AI/
├── backend/
│   ├── app/
│   │   ├── ml/                  # Isolation Forest, network analysis, feature engineering, risk explainer
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── routers/             # API route handlers (auth, dashboard, transactions, alerts, ...)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Auth service, email service, report generator
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── data/                    # Seed data files
│   ├── scripts/                 # Database seeding scripts
│   ├── tests/
│   │   └── test_api.py
│   ├── .env.example
│   └── requirements.txt
├── fraudx-app/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/               # Dashboard, Transactions, Alerts, Members, Reports, AIAgent, ...
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## How to Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- A configured `.env` file in `backend/` (see `backend/.env.example`)

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will automatically seed the database on first run if no transactions are present.

**Health check endpoint:**
```
GET http://localhost:8000/health
```

**API documentation (auto-generated):**
```
http://localhost:8000/docs
```

### Frontend

```bash
cd fraudx-app
npm install
npm run dev
```

The frontend dev server will start at `http://localhost:5173` by default.

---

## Testing

The backend test suite covers 9 test functions across all major system areas:

| Test | Description |
|---|---|
| `test_root_and_health` | Root and health endpoints return expected status |
| `test_auth_login_and_profile_data` | Primary authentication and profile data completeness |
| `test_mfa_and_face_verification` | Server-side MFA validation and face verification demonstration |
| `test_customer_registration_persistence_and_isolation` | Customer registration, persistent member creation, isolated transactions |
| `test_customer_rbac_denials` | Customer role is denied access to analyst/org-only endpoints |
| `test_analyst_and_organisation_access` | Analyst and organisation operational access to investigations, alerts, reports |
| `test_transaction_explanations_location_and_ai_agent` | Transaction explanations, location data, and AI agent responses |
| `test_alert_details_and_persistent_risk_treatment` | Alert detail retrieval and persistent risk treatment actions |
| `test_reports_traceability_and_readable_formats` | Report generation in PDF, CSV, and JSON formats |

**Backend result: 9 passed, 0 failed.**

**Frontend:** Vite production build completed successfully with 0 errors.

> The automated project verification passed. These results reflect test coverage of the implemented system against a synthetic dataset and do not represent real-world fraud detection accuracy.

---

## Security / Responsible AI

- **Role-based access control** — backend enforces role permissions on every protected API endpoint.
- **Customer data isolation** — customers can only access their own member records and transactions.
- **MFA** — analyst and organisation users must complete email OTP verification before a session token is issued.
- **Audit logging** — analyst and organisation actions are recorded for accountability and traceability.
- **Human review** — all risk alerts and anomaly flags are surfaced for human investigation; the system does not take autonomous action.
- **Synthetic dataset** — the AI model was trained and evaluated on synthetic data. Its outputs reflect patterns in synthetic cooperative transactions, not real-world financial behavior.
- **Risk indicators are not fraud accusations** — flagged transactions indicate elevated statistical anomaly, not confirmed fraud. Human review is required before any action is taken.

---

## Limitations

- The AI model is trained on a synthetic AMLSim-based dataset. Performance on real-world cooperative transaction data may differ significantly.
- The backend uses SQLite by default. Production deployment requires a persistent database (e.g., PostgreSQL) and appropriate infrastructure.
- AI risk scores support investigation and do not replace human judgment or legal due diligence.
- The face verification step is a demonstration flow, not a production-grade biometric recognition system.
- The in-memory MFA challenge store does not persist across server restarts.

---

## Future Enhancements

- Real-time transaction streaming and alerting
- Training on larger, real-world (anonymized) cooperative datasets
- Advanced graph-based fraud detection using graph neural networks
- Production-grade notification and alert delivery infrastructure
- Model monitoring, drift detection, and scheduled retraining pipelines

---

## License

This project is currently provided for educational, research, and hackathon purposes. No open-source license has been specified at this time.
