"""
This module encapsulates the core reasoning agent.

Responsibilities:
- Act as the central brain orchestrating the LLM and the tools.
- Maintain dialogue state and decide when to use specific function calls.
"""
import json
import re
from pathlib import Path

from google.genai import types

from app.core.constants import BASE_DIR
from app.services.llm_service import create_chat, TOOL_MAP
from app.services.json_store_service import (
    get_patient_context, get_conversations, save_conversations, append_to_conversation,
    get_reminders, get_calendar_items, get_device_actions, get_caregivers
)

from app.models.schemas import HistoryItem

# Simple in-memory cache for chat SDK objects
_active_chats = {}


def _strip_markdown(text: str) -> str:
    """Remove markdown formatting so TTS reads clean natural speech."""
    # Bold and italic: **text**, *text*, __text__, _text_
    text = re.sub(r'\*{1,3}(.+?)\*{1,3}', r'\1', text)
    text = re.sub(r'_{1,3}(.+?)_{1,3}', r'\1', text)
    # Trailing ** (e.g., "things:**") without opening - remove trailing **
    text = re.sub(r'(\S)\*{2,}\s*', r'\1', text)
    # Headers: ## Title → Title
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Bullet points: * item, - item, • item → item (keep the text, drop the symbol)
    text = re.sub(r'^\s*[\*\-•]\s+', '', text, flags=re.MULTILINE)
    # Numbered lists: 1. item → item
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    # Inline code and code blocks
    text = re.sub(r'`{1,3}.*?`{1,3}', '', text, flags=re.DOTALL)
    # Collapse multiple blank lines into one
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def load_system_prompt() -> str:
    """Read the base prompt and dynamically append patient context."""
    prompt_path = BASE_DIR / "app" / "prompts" / "system_prompt.txt"
    if prompt_path.exists():
        with open(prompt_path, "r", encoding="utf-8") as f:
            base_prompt = f.read()
    else:
        base_prompt = "You are a helpful assistant for an Alzheimer patient."

    tools_prompt_path = BASE_DIR / "app" / "prompts" / "tool_instructions.txt"
    if tools_prompt_path.exists():
        with open(tools_prompt_path, "r", encoding="utf-8") as f:
            base_prompt += "\n\n" + f.read()

    # Dynamically inject patient context into the prompt
    context = get_patient_context()
    dynamic_part = f"\n\n--- PATIENT CONTEXT ---\nHere is the patient's information:\n{json.dumps(context, indent=2, ensure_ascii=False)}"
    return base_prompt + dynamic_part

def _get_or_create_chat(session_id: str):
    """Get the active chat session (includes conversational history) or start a new one."""
    if session_id not in _active_chats:
        system_instruction = load_system_prompt()
        _active_chats[session_id] = create_chat(system_instruction)
    return _active_chats[session_id]

def process_user_message(session_id: str, message: str) -> str:
    """
    Sends a message to the agent, handles any necessary tool calls iteratively,
    and returns the final textual response.
    """
    try:
        chat = _get_or_create_chat(session_id)
    except RuntimeError as e:
        return f"Configuration error: {str(e)}"
    # --- ENVIRONMENTAL CONTEXT INJECTION (Invisible to the user) ---
    from datetime import datetime
    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Fetch real-time data
    reminders = get_reminders()
    calendar = get_calendar_items()
    devices = get_device_actions()
    caregivers = get_caregivers()
    patient_context = get_patient_context()
    
    # Mock weather data
    location = patient_context.get("home_address", "Unknown Location")
    mock_weather = f"Sunny, 22°C in {location}"

    env_context = f"\n[REAL-TIME ENVIRONMENTAL CONTEXT]\nCurrent local time: {current_time_str}\n"
    env_context += f"Current weather/location: {mock_weather}\n"

    if caregivers:
        env_context += "- Registered Caregivers / Contacts:\n"
        for cg in caregivers:
            env_context += f"  * {cg.get('name')} ({cg.get('relation')}) - {cg.get('context', '')}\n"

    if reminders:
        env_context += "- Configured recurring reminders:\n"
        for r in reminders:
            env_context += f"  * {r.get('title')} ({r.get('scheduled_time')} - {r.get('repeat_rule')})\n"

    if calendar:
        env_context += "- Upcoming calendar events/audio:\n"
        for c in calendar:
            env_context += f"  * {c.get('title')} scheduled at {c.get('scheduled_at')} (Status: {c.get('status')})\n"

    if devices:
        env_context += "- Pending notifications/actions on patient's device:\n"
        for d in devices:
            env_context += f"  * Pending action ({d.get('kind')}): {d.get('text_to_speak')}\n"

    env_context += "[END OF ENVIRONMENTAL CONTEXT]\n\n"
    
    augmented_message = env_context + message
    # ---------------------------------------------------------------------------
    
    # Log the user's prompt in the business JSON (excluding environment context)
    append_to_conversation(session_id, "user", message)

    try:
        response = chat.send_message(augmented_message)
    except Exception as e:
        return f"LLM Agent error: {str(e)}"

    # Iteratively resolve tool calls
    while response.function_calls:
        function_responses = []
        for fc in response.function_calls:
            name = fc.name
            args = dict(fc.args)
            
            print(f"\n\033[95m🤖 [AGENT REASONING]\033[0m Agent decided to use a tool:")
            print(f"\033[94m🛠️  [TOOL EXECUTION]\033[0m Name: {name}")
            print(f"    Arguments: {args}")

            if name in TOOL_MAP:
                try:
                    result = TOOL_MAP[name](**args)
                except Exception as e:
                    result = {"error": str(e)}
            else:
                result = {"error": f"Tool {name} not found"}

            print(f"\033[92m✅ [TOOL RESULT]\033[0m {result}")

            function_responses.append(
                types.Part.from_function_response(name=name, response=result)
            )

        print("\n\033[93m⏳ [AGENT THINKING]\033[0m Sending tool result to Gemini for further reasoning...")
        response = chat.send_message(function_responses)

    final_text = response.text
    if not final_text:
        final_text = ""
        
    print(f"\n\033[96m🗣️  [FINAL RESPONSE]\033[0m {final_text}\n")
    # Strip markdown so TTS reads clean natural speech
    final_text = _strip_markdown(final_text)
    # Log the final response of the assistant in the business JSON
    append_to_conversation(session_id, "assistant", final_text)

    return final_text

def get_session_history(session_id: str) -> list[HistoryItem]:
    """Retrieve history from the active chat state."""
    if session_id not in _active_chats:
        return []

    chat = _active_chats[session_id]
    history = []
    for m in chat.get_history():
        # Ignore system messages / tool execution overhead in simple output
        role = "assistant" if m.role == "model" else "user"

        content: str = ""
        for p in m.parts:
            if hasattr(p, "text") and p.text:
                content += str(p.text)

        if content:
            history.append(HistoryItem(role=role, content=content))

    return history
