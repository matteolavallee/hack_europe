"""
This module defines application-wide constants.

Responsibilities:
- Store hardcoded, immutable values (e.g., file paths to JSON datastores, default API timeouts).
- Act as a single source of truth for literal values used across the backend.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "app" / "data"

PATIENT_CONTEXT_FILE = DATA_DIR / "patient_context.json"
CAREGIVERS_FILE = DATA_DIR / "caregivers.json"
REMINDERS_FILE = DATA_DIR / "reminders.json"
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"
HEALTH_LOGS_FILE = DATA_DIR / "health_logs.json"
