"""
This module defines the API endpoints for chat interactions.

Responsibilities:
- Provide routes to handle voice or text chat from the patient interface.
- Delegate chat processing to the agent service and return appropriate responses.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

from app.models.schemas import (
    ChatMessage, ChatResponse, HistoryItem,
    AudioContent, CreateAudioContentPayload,
    DeviceAction, DeviceResponsePayload, HelpRequestPayload
)
from app.services import json_store_service

router = APIRouter(prefix="/chat", tags=["chat"])

from app.services import agent_service
from app.services.tts_service import generate_tts_audio
from app.core.config import BASE_DIR

@router.post("/message", response_model=ChatResponse)
async def send_chat_message(payload: ChatMessage):
    """
    Reçoit un message (texte ou audio) du patient.
    Process the message through the Agent service (LLM loop) and return.
    """
    SESSION_ID = "default_patient_session"
    
    # L'agent calcule la réponse (avec outillage dynamique si nécessaire)
    final_response = agent_service.process_user_message(SESSION_ID, payload.message)
    
    audio_url = None
    try:
        # Generer l'audio via ElevenLabs
        audio_bytes = await generate_tts_audio(final_response)
        
        # Sauvegarder localement
        filename = f"resp_{uuid.uuid4().hex[:8]}.mp3"
        filepath = BASE_DIR / "app" / "static" / "audio" / filename
        
        with open(filepath, "wb") as f:
            f.write(audio_bytes)
            
        audio_url = f"/audio/{filename}"
    except Exception as e:
        print(f"Erreur lors de la generation TTS interne : {e}")

    return ChatResponse(
        response=final_response,
        audio_url=audio_url
    )

@router.get("/history", response_model=List[HistoryItem])
def get_chat_history():
    """
    Retourne l'historique de la conversation actuelle pour le debug depuis le cache de l'agent.
    """
    # En contexte multi-users, l'ID serait récupéré depuis l'auth
    SESSION_ID = "default_patient_session"
    
    history = agent_service.get_session_history(SESSION_ID)
    
    return history

# --- AUDIO CONTENT ENDPOINTS ---

@router.get("/audio", response_model=List[AudioContent])
def get_audio_contents(care_receiver_id: Optional[str] = Query(None)):
    contents = json_store_service.get_audio_contents()
    if care_receiver_id:
        contents = [c for c in contents if c.get("care_receiver_id") == care_receiver_id]
    return [AudioContent(**c) for c in contents]

@router.post("/audio", response_model=AudioContent)
def create_audio_content(payload: CreateAudioContentPayload):
    new_item = AudioContent(
        id=f"ac-{uuid.uuid4().hex[:8]}",
        care_receiver_id=payload.care_receiver_id,
        title=payload.title,
        url=payload.url,
        kind=payload.kind,
        recommendable=payload.recommendable,
        created_at=datetime.utcnow().isoformat() + "Z"
    )
    with json_store_service.lock:
        contents = json_store_service.get_audio_contents()
        contents.append(new_item.model_dump())
        json_store_service.save_audio_contents(contents)
    return new_item

@router.post("/audio/{item_id}/send-now")
def send_audio_now(item_id: str):
    with json_store_service.lock:
        contents = json_store_service.get_audio_contents()
        item = next((c for c in contents if c.get("id") == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Audio content not found")

        actions = json_store_service.get_device_actions()
        actions.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "kind": "propose_audio",
            "text_to_speak": f"I have an audio message for you: {item['title']}. Do you want to listen to it?",
            "audio_url": item["url"],
            "audio_content_id": item["id"]
        })
        json_store_service.save_device_actions(actions)
    return {"status": "sent"}

class ScheduleAudioPayload(BaseModel):
    scheduled_at: str

@router.post("/audio/{item_id}/schedule")
def schedule_audio(item_id: str, payload: ScheduleAudioPayload):
    with json_store_service.lock:
        contents = json_store_service.get_audio_contents()
        item = next((c for c in contents if c.get("id") == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Audio content not found")

        items = json_store_service.get_calendar_items()
        items.append({
            "id": f"ci-{uuid.uuid4().hex[:8]}",
            "care_receiver_id": item["care_receiver_id"],
            "type": "audio_push",
            "title": f"Listen to {item['title']}",
            "scheduled_at": payload.scheduled_at,
            "status": "scheduled",
            "audio_content_id": item["id"],
            "created_at": datetime.utcnow().isoformat() + "Z"
        })
        json_store_service.save_calendar_items(items)
    return {"status": "scheduled"}

class ToggleRecommendablePayload(BaseModel):
    recommendable: bool

@router.patch("/audio/{item_id}", response_model=AudioContent)
def toggle_recommendable(item_id: str, payload: ToggleRecommendablePayload):
    with json_store_service.lock:
        contents = json_store_service.get_audio_contents()
        for i, c in enumerate(contents):
            if c.get("id") == item_id:
                c["recommendable"] = payload.recommendable
                json_store_service.save_audio_contents(contents)
                return AudioContent(**c)
    raise HTTPException(status_code=404, detail="Audio content not found")

@router.delete("/audio/{item_id}")
def delete_audio_content(item_id: str):
    with json_store_service.lock:
        contents = json_store_service.get_audio_contents()
        initial_len = len(contents)
        contents = [c for c in contents if c.get("id") != item_id]
        if len(contents) == initial_len:
            raise HTTPException(status_code=404, detail="Audio content not found")
        json_store_service.save_audio_contents(contents)
    return {"message": "Deleted"}

# --- DEVICE & DEMO ENDPOINTS ---

class DemoSuggestionPayload(BaseModel):
    care_receiver_id: str
    kind: str

@router.post("/demo/trigger-suggestion")
def trigger_suggestion(payload: DemoSuggestionPayload):
    with json_store_service.lock:
        actions = json_store_service.get_device_actions()
        if payload.kind == "exercise":
            actions.append({
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "kind": "propose_exercise",
                "text_to_speak": "I have a quick brain exercise for you. Would you like to try it now?"
            })
        elif payload.kind == "message":
            actions.append({
                "id": f"act-{uuid.uuid4().hex[:8]}",
                "kind": "propose_audio",
                "text_to_speak": "I found a nice family message for you to listen to. Shall I play it?"
            })
        json_store_service.save_device_actions(actions)
    return {"status": "triggered"}

@router.get("/device/next-actions", response_model=List[DeviceAction])
def get_next_actions(care_receiver_id: Optional[str] = Query(None)):
    actions = json_store_service.get_device_actions()
    # speak_reminder en tête de file pour qu'ils soient traités immédiatement
    actions = sorted(actions, key=lambda a: 0 if a.get("kind") == "speak_reminder" else 1)
    return [DeviceAction(**a) for a in actions]

@router.post("/device/response")
def submit_device_response(payload: DeviceResponsePayload):
    with json_store_service.lock:
        actions = json_store_service.get_device_actions()
        actions = [a for a in actions if a.get("id") != payload.action_id]
        json_store_service.save_device_actions(actions)

        events = json_store_service.get_events()
        events.append({
            "id": f"ev-{uuid.uuid4().hex[:8]}",
            "care_receiver_id": "default", # Should fetch proper ID
            "type": "reminder_confirmed" if payload.response == "yes" else "reminder_postponed",
            "payload": {"response": payload.response, "action_id": payload.action_id},
            "created_at": datetime.utcnow().isoformat() + "Z"
        })
        json_store_service.save_events(events)

    return {"status": "recorded"}

@router.post("/device/help-request")
def submit_help_request(payload: HelpRequestPayload):
    with json_store_service.lock:
        events = json_store_service.get_events()
        events.append({
            "id": f"ev-{uuid.uuid4().hex[:8]}",
            "care_receiver_id": "default", # Should fetch proper ID
            "type": "help_requested",
            "payload": {"type": payload.type, "message": payload.message},
            "created_at": datetime.utcnow().isoformat() + "Z"
        })
        json_store_service.save_events(events)
    return {"status": "help_requested"}
