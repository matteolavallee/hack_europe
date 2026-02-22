"""
This module contains the logic to interact with the external LLM provider.

Responsibilities:
- Communicate directly with the Gemini API.
- Format prompts and parse API responses.
"""
from google import genai
from google.genai import types

from app.core.config import GEMINI_API_KEY, BASE_DIR
from app.tools.schedule_reminder import schedule_reminder
from app.tools.write_log import write_health_log
from app.tools.contact_caregiver import contact_primary_caregiver
from app.tools.get_temporal_context import get_temporal_context
from app.tools.search_family_history import search_family_history
from app.tools.play_audio import play_audio_content

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

AVAILABLE_TOOLS = [
    schedule_reminder,
    write_health_log,
    contact_primary_caregiver,
    get_temporal_context,
    search_family_history,
    play_audio_content
]

TOOL_MAP = {func.__name__: func for func in AVAILABLE_TOOLS}

def create_chat(system_instruction: str):
    """
    Creates a new stateful Gemini chat session with tools and system instructions.
    """
    if not client:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
    return client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=AVAILABLE_TOOLS,
        ),
    )

from app.tools.update_context_tool import update_patient_context

def create_onboarding_chat():
    """
    Creates a new Gemini chat session specifically for the patient onboarding loop.
    """
    if not client:
        raise RuntimeError("GEMINI_API_KEY is not configured.")
        
    prompt_path = BASE_DIR / "app" / "prompts" / "onboarding_prompt.txt"
    if prompt_path.exists():
        with open(prompt_path, "r", encoding="utf-8") as f:
            system_instruction = f.read()
    else:
        system_instruction = "Tu es un médecin spécialiste menant un entretien de premier contact."

    return client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[update_patient_context],
        ),
    )
