"""
Tool definition to query family history to reassure the patient.

Responsibilities:
- Provide the LLM with safe access to the pre-filled life history of the patient.
"""
from typing import Dict, Any
from app.tools import register_tool

# Mock database - en production on utiliserait json_store_service avec family_history.json
FAMILY_MEMORY_DB = {
    "animaux": "Quand j'étais petit, j'avais un chien merveilleux qui s'appelait Médor.",
    "enfants": "Ma fille s'appelle Sarah, elle vient souvent le week-end, et mon fils s'appelle Paul.",
    "mariage": "Je me suis marié en 1970 avec Marie, on a fait une très belle fête de village.",
    "métier": "J'ai été instituteur toute ma vie, j'adorais enseigner les mathématiques.",
    "maison": "J'habite cette maison depuis 20 ans, j'aime beaucoup m'occuper des rosiers dans le jardin."
}

@register_tool
def search_family_history(keyword: str) -> Dict[str, Any]:
    """
    Recherche un souvenir ou une information sur le passé du patient (ex. mots clés: animaux, enfants, mariage, métier, maison).
    Utile pour rassurer le patient s'il a un trou de mémoire ou s'il se sent angoissé par son passé.
    """
    keyword = keyword.lower()
    for key, memory_text in FAMILY_MEMORY_DB.items():
        if key in keyword or keyword in key:
            return {"status": "success", "memory": memory_text}
            
    return {
        "status": "not_found", 
        "message": "Je n'ai pas trouvé d'information précise à ce sujet dans mon dossier mémoire, mais voulez-vous m'en parler ?"
    }
