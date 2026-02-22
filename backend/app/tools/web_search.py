"""
Tool definition for performing web searches using duckduckgo.

Responsibilities:
- Allow the LLM to search for positive news or context about patient's interests.
"""
import logging
from duckduckgo_search import DDGS
from app.tools import register_tool

@register_tool
def search_web(query: str, max_results: int = 3) -> str:
    """
    Search the internet for positive news, sports results, or context on a discussion topic
    (history, geography, patient hobbies) to enrich the conversation.

    Args:
        query: The search query (e.g., "positive football news", "history of the eiffel tower").
        max_results: The maximum number of results to retrieve.
    """
    try:
        results = list(DDGS().text(query, max_results=max_results))

        if not results:
            return "No results found for this search."

        summary = "Search results:\n"
        for i, r in enumerate(results, 1):
            title = r.get('title', 'No title')
            body = r.get('body', 'No description')
            summary += f"{i}. {title}\n   {body}\n\n"

        return summary.strip()
    except Exception as e:
        error_msg = f"Web search error: {str(e)}"
        logging.error(error_msg)
        return f"The search failed. You can tell the user there was a network technical issue. ({error_msg})"
