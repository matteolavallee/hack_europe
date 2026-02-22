"""
This module acts as the pseudo-database layer by handling file I/O operations directly on JSON files.

Responsibilities:
- Ensure safe file readings and writings (concurrency handling).
- Provide abstract CRUD operations for all JSON files (reminders, logs, contexts, etc).
"""
import json
import threading
from pathlib import Path
from typing import Any, List, Dict

from app.core import constants

# Global lock for all JSON read-modify-write operations
lock = threading.Lock()

def _read_json(file_path: Path, default_is_dict: bool = False) -> Any:
    if not file_path.exists():
        # Auto-create file and directory
        default_data = {} if default_is_dict else []
        _write_json(file_path, default_data)
        return default_data
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        default_data = {} if default_is_dict else []
        _write_json(file_path, default_data)
        return default_data

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
    data = _read_json(constants.PATIENT_CONTEXT_FILE, default_is_dict=True)
    return data if isinstance(data, dict) else {}

def save_patient_context(context: Dict[str, Any]):
    _write_json(constants.PATIENT_CONTEXT_FILE, context)

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

def append_to_conversation(session_id: str, role: str, content: str):
    """
    Ajoute de manière sûre un message à l'historique d'une conversation précise dans le JSON.
    """
    from datetime import datetime
    with lock:
        conversations = get_conversations()
        
        session_conv = next((c for c in conversations if c.get("session_id") == session_id), None)
        if not session_conv:
            session_conv = {
                "session_id": session_id,
                "timestamp": datetime.now().isoformat() + "Z",
                "messages": []
            }
            conversations.append(session_conv)
            
        session_conv["messages"].append({
            "role": role,
            "content": content
        })
        
        save_conversations(conversations)
