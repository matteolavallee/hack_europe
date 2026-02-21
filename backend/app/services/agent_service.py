"""
This module encapsulates the core reasoning agent.

Responsibilities:
- Act as the central brain orchestrating the LLM and the tools.
- Maintain dialogue state and decide when to use specific functions.
"""
import json
from pathlib import Path

from app.core.constants import BASE_DIR
from app.services.llm_service import get_gemini_model, TOOL_MAP
from app.services.json_store_service import get_patient_context, get_conversations, save_conversations

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

    # Dynamically inject patient context into the prompt
    context = get_patient_context()
    dynamic_part = f"\n\n--- INSTRUCTIONS CONTEXTUELLES DU PATIENT ---\nVoici les informations du patient :\n{json.dumps(context, indent=2, ensure_ascii=False)}"
    return base_prompt + dynamic_part

def _get_or_create_chat(session_id: str):
    """Get the active chat session (includes conversational history) or start a new one."""
    if session_id not in _active_chats:
        system_instruction = load_system_prompt()
        model = get_gemini_model(system_instruction)
        _active_chats[session_id] = model.start_chat()
    return _active_chats[session_id]

def process_user_message(session_id: str, message: str) -> str:
    """
    Sends a message to the agent, handles any necessary tool calls iteratively, 
    and returns the final textual response.
    """
    chat = _get_or_create_chat(session_id)
    
    # Send user message
    try:
        response = chat.send_message(message)
    except Exception as e:
        return f"Erreur de l'agent LLM: {str(e)}"
    
    # Iteratively resolve tool calls
    while any(part.function_call for part in response.parts):
        function_responses = []
        for part in response.parts:
            if part.function_call:
                name = part.function_call.name
                # Extract args safely
                args = {k: v for k, v in part.function_call.args.items()}
                print(f"[AGENT TOOL EXECUTION] Tool: {name}, Args: {args}")
                
                # Execute Python function locally
                if name in TOOL_MAP:
                    try:
                        result = TOOL_MAP[name](**args)
                    except Exception as e:
                        result = {"error": str(e)}
                else:
                    result = {"error": f"Tool {name} not found"}
                
                print(f"[AGENT TOOL RESULT] Result: {result}")
                
                # Pass back result to Gemini
                function_responses.append({
                    "function_response": {
                        "name": name,
                        "response": result
                    }
                })
        
        # Send function outputs back to the model 
        response = chat.send_message(function_responses)
        
    return response.text

def get_session_history(session_id: str) -> list[HistoryItem]:
    """Retrieve history from the active chat state."""
    if session_id not in _active_chats:
        return []
    
    chat = _active_chats[session_id]
    history = []
    for m in chat.history:
        # Ignore system messages / tool execution overhead in simple output
        role = "assistant" if m.role == "model" else "user"
        
        # We try to find the plain text part
        content = ""
        for p in m.parts:
            if hasattr(p, 'text') and p.text:
                content += p.text
        
        if content:
            history.append(HistoryItem(role=role, content=content))
    
    return history
