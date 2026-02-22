"""
This module encapsulates the core reasoning agent.

Responsibilities:
- Act as the central brain orchestrating the LLM and the tools.
- Maintain dialogue state and decide when to use specific functions.
"""
import json
from pathlib import Path

from google.genai import types

from app.core.constants import BASE_DIR
from app.services.llm_service import create_chat, TOOL_MAP
from app.services.json_store_service import (
    get_patient_context, get_conversations, save_conversations, append_to_conversation,
    get_reminders, get_calendar_items, get_device_actions
)

from app.models.schemas import HistoryItem

# Simple in-memory cache for chat SDK objects
_active_chats = {}

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
    dynamic_part = f"\n\n--- INSTRUCTIONS CONTEXTUELLES DU PATIENT ---\nVoici les informations du patient :\n{json.dumps(context, indent=2, ensure_ascii=False)}"
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
        return f"Erreur de configuration: {str(e)}"
    # --- INJECTION DU CONTEXTE ENVIRONNEMENTAL (Inisible pour l'utilisateur) ---
    from datetime import datetime
    current_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Récupération des données temps-réel
    reminders = get_reminders()
    calendar = get_calendar_items()
    devices = get_device_actions()
    
    env_context = f"\n[CONTEXTE ENVIRONNEMENTAL TEMPS RÉEL]\nHeure locale précise : {current_time_str}\n"
    
    if reminders:
        env_context += "- Rappels récurrents configurés :\n"
        for r in reminders:
            env_context += f"  * {r.get('title')} ({r.get('scheduled_time')} - {r.get('repeat_rule')})\n"
            
    if calendar:
        env_context += "- Événements / Audio prévus dans le calendrier :\n"
        for c in calendar:
            env_context += f"  * {c.get('title')} prévu à {c.get('scheduled_at')} (Status: {c.get('status')})\n"
            
    if devices:
        env_context += "- Notifications/Actions en attente sur l'appareil du patient :\n"
        for d in devices:
            env_context += f"  * Action en attente ({d.get('kind')}): {d.get('text_to_speak')}\n"
            
    env_context += "[FIN DU CONTEXTE ENVIRONNEMENTAL]\n\n"
    
    augmented_message = env_context + message
    # ---------------------------------------------------------------------------
    
    # Historisation du prompt de l'utilisateur dans le JSON métier (sans le blabla d'environnement)
    append_to_conversation(session_id, "user", message)

    try:
        response = chat.send_message(augmented_message)
    except Exception as e:
        return f"Erreur de l'agent LLM: {str(e)}"

    # Iteratively resolve tool calls
    while response.function_calls:
        function_responses = []
        for fc in response.function_calls:
            name = fc.name
            args = dict(fc.args)
            print(f"[AGENT TOOL EXECUTION] Tool: {name}, Args: {args}")

            if name in TOOL_MAP:
                try:
                    result = TOOL_MAP[name](**args)
                except Exception as e:
                    result = {"error": str(e)}
            else:
                result = {"error": f"Tool {name} not found"}

            print(f"[AGENT TOOL RESULT] Result: {result}")

            function_responses.append(
                types.Part.from_function_response(name=name, response=result)
            )

        response = chat.send_message(function_responses)

    final_text = response.text
    # Historisation de la réponse finale de l'assistant dans le JSON métier
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

        content = ""
        for p in m.parts:
            if hasattr(p, "text") and p.text:
                content += p.text

        if content:
            history.append(HistoryItem(role=role, content=content))

    return history
