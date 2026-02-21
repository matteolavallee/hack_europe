"""
This module defines the API endpoints for chat interactions.

Responsibilities:
- Provide routes to handle voice or text chat from the patient interface.
- Delegate chat processing to the agent service and return appropriate responses.
"""
from fastapi import APIRouter
from typing import List

from app.models.schemas import ChatMessage, ChatResponse, HistoryItem

router = APIRouter(prefix="/chat", tags=["chat"])

from app.services import agent_service

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(payload: ChatMessage):
    """
    Reçoit un message (texte ou audio) du patient.
    Process the message through the Agent service (LLM loop) and return.
    """
    # Dans une vraie app, on utiliserait un ID de session lié à l'utilisateur courant
    SESSION_ID = "default_patient_session"
    
    # L'agent calcule la réponse (avec outillage dynamique si nécessaire)
    final_response = agent_service.process_user_message(SESSION_ID, payload.message)
    
    return ChatResponse(
        response=final_response,
        audio_url=None  # A intégrer avec elevenlabs plus tard
    )

@router.get("/history", response_model=List[HistoryItem])
async def get_chat_history():
    """
    Retourne l'historique de la conversation actuelle pour le debug depuis le cache de l'agent.
    """
    # En contexte multi-users, l'ID serait récupéré depuis l'auth
    SESSION_ID = "default_patient_session"
    
    history = agent_service.get_session_history(SESSION_ID)
    
    return history
