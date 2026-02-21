"""
Tool definition to schedule or update reminders.

Responsibilities:
- Define schema required for the LLM to book a reminder (medication, hydration, appointment).
- Pass parameters into reminder_service to alter reminders.json.
"""
import uuid
from typing import Dict, Any
from app.services import json_store_service
from app.models.schemas import ReminderCreate

def schedule_reminder(title: str, time: str, repeat: str = "daily") -> Dict[str, Any]:
    """
    Ajoute un nouveau rappel dans la base de données json à partir de paramètres textuels.
    """
    reminders = json_store_service.get_reminders()
    
    new_reminder = {
        "id": uuid.uuid4().hex[:8],
        "title": title,
        "time": time,
        "repeat": repeat,
        "is_active": True
    }
    
    reminders.append(new_reminder)
    json_store_service.save_reminders(reminders)
    
    return {"status": "success", "reminder": new_reminder}
