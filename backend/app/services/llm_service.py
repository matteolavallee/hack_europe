"""
This module contains the logic to interact with the external LLM provider.

Responsibilities:
- Communicate directly with the Gemini API.
- Format prompts and parse API responses.
"""
import google.generativeai as genai

from app.core.config import GEMINI_API_KEY
from app.tools.read_context import read_patient_context
from app.tools.schedule_reminder import schedule_reminder
from app.tools.write_log import write_health_log
from app.tools.contact_caregiver import contact_primary_caregiver

# Set up API key
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Register our python functions as tools for Gemini
AVAILABLE_TOOLS = [
    read_patient_context,
    schedule_reminder,
    write_health_log,
    contact_primary_caregiver
]

TOOL_MAP = {func.__name__: func for func in AVAILABLE_TOOLS}

def get_gemini_model(system_instruction: str):
    """
    Returns an initialized Gemini GenerativeModel with instructions and tools.
    """
    return genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        tools=AVAILABLE_TOOLS,
        system_instruction=system_instruction
    )
