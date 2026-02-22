"""
Tool definition for performing web searches using duckduckgo.

Responsibilities:
- Allow the LLM to search for positive news or context about patient's interests.
"""
import logging
from duckduckgo_search import DDGS

def search_web(query: str, max_results: int = 3) -> str:
    """
    Recherche des informations sur internet pour trouver des actualités positives,
    des résultats sportifs, ou retrouver du contexte sur un sujet de discussion
    (histoire, géographie, passions du patient) afin d'enrichir la conversation.
    
    Args:
        query: La requête de recherche (ex: "actualités positives football", "histoire de la tour eiffel").
        max_results: Le nombre maximum de résultats à récupérer.
    """
    try:
        results = list(DDGS().text(query, max_results=max_results))
        
        if not results:
            return "Aucun résultat trouvé pour cette recherche."
            
        summary = "Résultats de la recherche :\n"
        for i, r in enumerate(results, 1):
            title = r.get('title', 'Sans titre')
            body = r.get('body', 'Pas de description')
            summary += f"{i}. {title}\n   {body}\n\n"
            
        return summary.strip()
    except Exception as e:
        error_msg = f"Erreur lors de la recherche web: {str(e)}"
        logging.error(error_msg)
        return f"La recherche a échoué. Tu peux informer l'utilisateur qu'il y a eu un problème technique de réseau. ({error_msg})"
