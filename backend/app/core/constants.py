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
CARE_RECEIVERS_FILE = DATA_DIR / "care_receivers.json"
REMINDERS_FILE = DATA_DIR / "reminders.json"
CALENDAR_ITEMS_FILE = DATA_DIR / "calendar_items.json"
AUDIO_CONTENTS_FILE = DATA_DIR / "audio_contents.json"
EVENTS_FILE = DATA_DIR / "events.json"
DEVICE_ACTIONS_FILE = DATA_DIR / "device_actions.json"
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"
HEALTH_LOGS_FILE = DATA_DIR / "health_logs.json"
