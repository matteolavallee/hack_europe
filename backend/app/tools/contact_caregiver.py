"""
Tool definition to contact a caregiver in an emergency or informational event.

Responsibilities:
- Outline LLM parameters necessary to start notification flows.
- Communicate with the notification_service to push Telegram alerts to the active caregiver.
"""
from typing import Dict, Any
from app.services import json_store_service

def contact_primary_caregiver(message: str, urgency: str = "normal") -> Dict[str, Any]:
    """
    Contacts the primary caregiver (e.g., daughter Sarah) via Telegram.
    Use if the patient is in distress, significantly confused, or to remind about medication.
    """
    caregivers = json_store_service.get_caregivers()
    primary = next((c for c in caregivers if c.get("is_primary")), None)
    
    if not primary:
        return {"status": "error", "message": "No primary caregiver found in the database."}
    
    # Placeholder pour un appel réel API Telegram.
    print(f"TELEGRAM SENT TO {primary['name']} ({primary['telegram_id']}) [Urgency: {urgency}] -> {message}")
    
    return {"status": "success", "message": "Alert successfully sent to the primary caregiver."}
