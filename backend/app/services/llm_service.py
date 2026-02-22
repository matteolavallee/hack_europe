"""
This module contains the logic to interact with the external LLM provider.

Responsibilities:
- Communicate directly with the Gemini API.
- Format prompts and parse API responses.
"""
from google import genai
from google.genai import types

from app.core.config import GEMINI_API_KEY, BASE_DIR

# Import all tool modules so their @register_tool decorators fire.
# To add a new tool to the agent: create a file in app/tools/ and decorate with @register_tool.
import app.tools.schedule_reminder      # noqa: F401
import app.tools.write_log              # noqa: F401
import app.tools.get_temporal_context   # noqa: F401
import app.tools.search_family_history  # noqa: F401
import app.tools.play_audio             # noqa: F401
import app.tools.send_whatsapp_message  # noqa: F401
import app.tools.web_search             # noqa: F401
# NOTE: contact_caregiver and update_context_tool are intentionally excluded:
#   - contact_caregiver: Telegram placeholder, superseded by send_whatsapp_message
#   - update_context_tool: onboarding-only, registered separately in create_onboarding_chat()

from app.tools import get_registered_tools

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

AVAILABLE_TOOLS = get_registered_tools()
TOOL_MAP = {fn.__name__: fn for fn in AVAILABLE_TOOLS}


def create_chat(system_instruction: str):
    """
    Creates a new stateful Gemini chat session with all registered tools.
    Adding a new tool: create a file in app/tools/, decorate with @register_tool.
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
    Creates a Gemini chat session for the patient onboarding loop.
    Uses only update_patient_context — no main agent tools.
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
