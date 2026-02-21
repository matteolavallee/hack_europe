"""
This module serves as the primary entry point for the FastAPI application.

Responsibilities:
- Initialize the FastAPI app instance.
- Include all necessary API routers (chat, reminders, caregivers, health, telegram_webhook).
- Set up initial application state and configurations.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

# Load .env before any os.getenv() calls (including those in imported modules)
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.voice import router as voice_router

app = FastAPI(title="CareLoop API", version="1.0.0")

# ─── CORS ─────────────────────────────────────────────────────────────────────
# Comma-separated list of allowed origins; defaults to local Next.js dev server.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(voice_router)
