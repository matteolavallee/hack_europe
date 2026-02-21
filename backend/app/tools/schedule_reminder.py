"""
Tool definition to schedule or update reminders.

Responsibilities:
- Define schema required for the LLM to book a reminder (medication, hydration, appointment).
- Pass parameters into reminder_service to alter reminders.json.
"""
import uuid
from typing import Dict, Any
from datetime import datetime
from app.services import json_store_service

def schedule_reminder(title: str, time: str, repeat: str = "daily") -> Dict[str, Any]:
    """
    Ajoute un nouveau rappel dans la base de données json à partir de paramètres textuels.
    """
    new_item = {
        "id": f"ci-{uuid.uuid4().hex[:8]}",
        "care_receiver_id": "default", # Will rely on context
        "type": "reminder",
        "title": title,
        "scheduled_at": time,
        "repeat_rule": repeat,
        "status": "scheduled",
        "created_at": datetime.utcnow().isoformat() + "Z"
    }

    with json_store_service.lock:
        items = json_store_service.get_calendar_items()
        items.append(new_item)
        json_store_service.save_calendar_items(items)

    return {"status": "success", "reminder": new_item}
