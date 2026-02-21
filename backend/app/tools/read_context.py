"""
Tool definition to read the patient context.

Responsibilities:
- Define the function signature and schema expected by the Gemini API tool caller.
- Retrieve contextual information (e.g. name, preferences) via json_store_service.
"""
from typing import Dict, Any
from app.services import json_store_service

def read_patient_context() -> Dict[str, Any]:
    """
    Récupère les informations contextuelles du patient pour adapter la conversation.
    """
    return json_store_service.get_patient_context()
