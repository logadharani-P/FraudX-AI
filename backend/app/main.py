"""
FraudX AI — FastAPI Main Application Entrypoint
Integrates AMLSim ingestion, Cooperative context, ML Risk Engine,
Alerts, Investigations, Audit Logging, and the FraudX Intelligence Agent.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_all_tables, SessionLocal
from app.models.transaction import Transaction
from app.routers import (
    auth, dashboard, transactions, alerts, investigations,
    members, risk, reports, agent, audit
)

settings = get_settings()


# Ensure tables and migrations exist immediately
create_all_tables()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    create_all_tables()
    # Check if database needs initial seeding
    db = SessionLocal()
    try:
        count = db.query(Transaction).count()
        if count == 0:
            print("🌱 Initializing fresh database with AMLSim + Cooperative enrichment pipeline...")
            from scripts.seed_database import seed_database
            seed_database()
    except Exception as e:
        print(f"Startup check note: {e}")
    finally:
        db.close()
    yield
    # Shutdown



app = FastAPI(
    title="FraudX AI — Cooperative AML & Fraud Intelligence Engine",
    description="Real-time AML simulation, behavioral anomaly detection, explainable risk scoring, and intelligence agent.",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(alerts.router)
app.include_router(investigations.router)
app.include_router(members.router)
app.include_router(risk.router)
app.include_router(reports.router)
app.include_router(agent.router)
app.include_router(audit.router)


@app.get("/")
def root():
    return {
        "name": "FraudX AI API",
        "version": settings.app_version,
        "status": "online",
        "docs_url": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
