"""
Tool definition to get spatial and temporal context for the patient.

Responsibilities:
- Provide the LLM with the exact current date, time, and day of the week.
- Prevent temporal disorientation by grounding the Agent in the present.
"""
from typing import Dict, Any
from datetime import datetime
import locale

def get_temporal_context() -> Dict[str, Any]:
    """
    Retourne la date, l'heure et le jour de la semaine actuels.
    À utiliser dès que le patient pose une question sur le temps ou semble désorienté temporellement.
    """
    try:
        # Essayer de mettre la locale en français si possible
        locale.setlocale(locale.LC_TIME, 'fr_FR.UTF-8')
    except:
        pass # Fallback silencieux
        
    now = datetime.now()
    return {
        "status": "success",
        "current_time": now.strftime("%H:%M"),
        "current_date": now.strftime("%d/%m/%Y"),
        "day_of_week": now.strftime("%A")
    }
