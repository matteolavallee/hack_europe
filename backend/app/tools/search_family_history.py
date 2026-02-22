"""
Tool definition to query family history to reassure the patient.

Responsibilities:
- Provide the LLM with safe access to the pre-filled life history of the patient.
"""
from typing import Dict, Any
from app.tools import register_tool

# Mock database - en production on utiliserait json_store_service avec family_history.json
FAMILY_MEMORY_DB = {
    "animals": "When I was young, I had a wonderful dog named Buddy. He followed me everywhere.",
    "children": "My daughter is called Sarah, she comes to visit most weekends. My son is called Paul, he lives nearby.",
    "marriage": "I got married in 1970. It was a beautiful village celebration, one of the happiest days of my life.",
    "job": "I was a primary school teacher my whole career. I loved teaching mathematics to the children.",
    "home": "I have lived in this house for over 20 years. I especially love tending to the rose bushes in the garden."
}

@register_tool
def search_family_history(keyword: str) -> Dict[str, Any]:
    """
    Search for a memory or personal detail about the patient's past (e.g. keywords: animals, children, marriage, job, home).
    Use this to reassure the patient if they have a memory gap or feel anxious about their past.
    """
    keyword = keyword.lower()
    for key, memory_text in FAMILY_MEMORY_DB.items():
        if key in keyword or keyword in key:
            return {"status": "success", "memory": memory_text}
            
    return {
        "status": "not_found", 
        "message": "Je n'ai pas trouvé d'information précise à ce sujet dans mon dossier mémoire, mais voulez-vous m'en parler ?"
    }
