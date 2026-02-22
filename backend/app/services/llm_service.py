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


def generate_reminder_phrase(
    title: str,
    reminder_type: str,
    message_text: str | None,
    resident_name: str = "Simone",
    is_audio_invite: bool = False,
) -> str:
    """
    Génère une phrase chaleureuse pour un rappel vocal via le LLM.
    Si is_audio_invite=True, génère une invitation "voulez-vous écouter…?" (pour les routines audio).
    Fallback simple si le LLM échoue (quota, réseau).
    """
    msg = (message_text or "").strip()
    if msg and msg.startswith("["):
        import re
        msg = re.sub(r"^\[[\w_]+\]\s*", "", msg).strip()

    if not client:
        if is_audio_invite:
            is_book = "audiobook" in msg.lower() or "book" in msg.lower()
            content_type = "an audiobook" if is_book else "some music"
            return f"Good {_time_of_day()}, {resident_name}! It's {title} time. Would you like to listen to {content_type}?"
        return msg if msg else f"Hi {resident_name}, {title}."

    if is_audio_invite:
        is_book = "audiobook" in msg.lower() or "book" in msg.lower()
        content_type = "an audiobook" if is_book else "some music"
        prompt = f"""Generate exactly ONE warm, friendly invitation sentence in English for {resident_name}.
Context: It's {title} time. You want to suggest they listen to {content_type}.
Example: "Good morning {resident_name}! It's coffee time — would you like some music to brighten your day?"
Be warm, personal, one sentence only. End with a question. Output ONLY the sentence, no quotes."""
    else:
        prompt = f"""Generate exactly ONE short, warm reminder sentence in English for {resident_name}.
- Reminder type: {reminder_type}
- Title: {title}
- Extra details: {msg or 'none'}

Examples for medication: "Don't forget to take your morning pills, Simone."
Examples for appointment: "You have a doctor's appointment today, Simone."
Be warm, concise, one sentence only. Output ONLY the sentence, no quotes."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if response and response.text:
            text = response.text.strip().strip('"').strip("'")
            if text:
                return text
    except Exception as e:
        print(f"[LLM] generate_reminder_phrase failed: {e}")

    if is_audio_invite:
        is_book = "audiobook" in msg.lower() or "book" in msg.lower()
        content_type = "an audiobook" if is_book else "some music"
        return f"Good {_time_of_day()}, {resident_name}! It's {title} time. Would you like to listen to {content_type}?"
    return msg if msg else f"Hi {resident_name}, don't forget: {title}."


def _time_of_day() -> str:
    from datetime import datetime
    h = datetime.now().hour
    if h < 12: return "morning"
    if h < 18: return "afternoon"
    return "evening"


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
