"""
This module contains the logic to interact with the external LLM provider.

Responsibilities:
- Communicate directly with the Gemini API.
- Format prompts and parse API responses.
"""
from google import genai
from google.genai import types

from app.core.config import GEMINI_API_KEY
from app.tools.read_context import read_patient_context
from app.tools.schedule_reminder import schedule_reminder
from app.tools.write_log import write_health_log
from app.tools.contact_caregiver import contact_primary_caregiver

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Register our python functions as tools for Gemini
AVAILABLE_TOOLS = [
    read_patient_context,
    schedule_reminder,
    write_health_log,
    contact_primary_caregiver,
]

TOOL_MAP = {func.__name__: func for func in AVAILABLE_TOOLS}

def create_chat(system_instruction: str):
    """
    Creates a new stateful Gemini chat session with tools and system instructions.
    """
    if not client:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return client.chats.create(
        model="gemini-1.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=AVAILABLE_TOOLS,
        ),
    )
