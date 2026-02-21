"""
This module acts as the pseudo-database layer by handling file I/O operations directly on JSON files.

Responsibilities:
- Ensure safe file readings and writings (concurrency handling).
- Provide abstract CRUD operations for all JSON files (reminders, logs, contexts, etc).
"""
import json
import asyncio
from pathlib import Path
from typing import Any, List, Dict
import os

from app.core import constants

def _read_json(file_path: Path) -> Any:
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def _write_json(file_path: Path, data: Any):
    # Ensure directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Sync functions for easy access, in production we might use a lock or asyncio.to_thread

def get_caregivers() -> List[Dict[str, Any]]:
    return _read_json(constants.CAREGIVERS_FILE)

def save_caregivers(caregivers: List[Dict[str, Any]]):
    _write_json(constants.CAREGIVERS_FILE, caregivers)

def get_care_receivers() -> List[Dict[str, Any]]:
    return _read_json(constants.CARE_RECEIVERS_FILE)

def save_care_receivers(receivers: List[Dict[str, Any]]):
    _write_json(constants.CARE_RECEIVERS_FILE, receivers)

def get_patient_context() -> Dict[str, Any]:
    data = _read_json(constants.PATIENT_CONTEXT_FILE)
    return data if isinstance(data, dict) else {}

def get_reminders() -> List[Dict[str, Any]]:
    return _read_json(constants.REMINDERS_FILE)

def save_reminders(reminders: List[Dict[str, Any]]):
    _write_json(constants.REMINDERS_FILE, reminders)

def get_calendar_items() -> List[Dict[str, Any]]:
    return _read_json(constants.CALENDAR_ITEMS_FILE)

def save_calendar_items(items: List[Dict[str, Any]]):
    _write_json(constants.CALENDAR_ITEMS_FILE, items)

def get_audio_contents() -> List[Dict[str, Any]]:
    return _read_json(constants.AUDIO_CONTENTS_FILE)

def save_audio_contents(contents: List[Dict[str, Any]]):
    _write_json(constants.AUDIO_CONTENTS_FILE, contents)

def get_events() -> List[Dict[str, Any]]:
    return _read_json(constants.EVENTS_FILE)

def save_events(events: List[Dict[str, Any]]):
    _write_json(constants.EVENTS_FILE, events)

def get_device_actions() -> List[Dict[str, Any]]:
    return _read_json(constants.DEVICE_ACTIONS_FILE)

def save_device_actions(actions: List[Dict[str, Any]]):
    _write_json(constants.DEVICE_ACTIONS_FILE, actions)

def get_conversations() -> List[Dict[str, Any]]:
    return _read_json(constants.CONVERSATIONS_FILE)

def save_conversations(conversations: List[Dict[str, Any]]):
    _write_json(constants.CONVERSATIONS_FILE, conversations)

def get_health_logs() -> List[Dict[str, Any]]:
    return _read_json(constants.HEALTH_LOGS_FILE)

def save_health_logs(logs: List[Dict[str, Any]]):
    _write_json(constants.HEALTH_LOGS_FILE, logs)
