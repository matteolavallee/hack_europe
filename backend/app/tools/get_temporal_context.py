"""
Tool definition to get spatial and temporal context for the patient.

Responsibilities:
- Provide the LLM with the exact current date, time, and day of the week.
- Prevent temporal disorientation by grounding the Agent in the present.
"""
from typing import Dict, Any
from datetime import datetime
import locale
from app.tools import register_tool

@register_tool
def get_temporal_context() -> Dict[str, Any]:
    """
    Returns the current date, time, and day of the week.
    Use this whenever the patient asks about the time or seems temporally disoriented.
    """
    try:
        # Try to set locale to English
        locale.setlocale(locale.LC_TIME, 'en_US.UTF-8')
    except:
        pass # Silent fallback

    now = datetime.now()
    return {
        "status": "success",
        "current_time": now.strftime("%H:%M"),
        "current_date": now.strftime("%d/%m/%Y"),
        "day_of_week": now.strftime("%A")
    }
