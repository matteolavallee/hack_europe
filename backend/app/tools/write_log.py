"""
Tool definition to write an interaction log or a health log.

Responsibilities:
- Define the function signature and schema for the LLM.
- Persist new conversation parts or mood analyses to JSON storage locally.
"""
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from app.services import json_store_service
from app.tools import register_tool

@register_tool
def write_health_log(mood: str, medication_taken: bool, notes: Optional[str] = "") -> Dict[str, Any]:
    """
    Sauvegarde l'humeur et l'état médical perçu du patient dans son fichier de suivi quotidien.
    """
    today = datetime.now().strftime("%Y-%m-%d")

    new_log = {
        "log_id": uuid.uuid4().hex[:8],
        "date": today,
        "mood": mood,
        "medication_taken": medication_taken,
        "notes": notes
    }

    with json_store_service.lock:
        logs = json_store_service.get_health_logs()
        logs.append(new_log)
        json_store_service.save_health_logs(logs)

    return {"status": "success", "log": new_log}
