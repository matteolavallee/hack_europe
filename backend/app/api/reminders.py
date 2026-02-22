"""
This module defines the API endpoints for reminders.

Responsibilities:
- Provide routes to create, read, update, and delete reminders.
- Interface with the reminder service to manage the JSON data store.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

import re
from app.models.schemas import CalendarItem, CreateCalendarItemPayload, UpdateCalendarItemPayload
from app.services import json_store_service
from app.services.llm_service import generate_reminder_phrase
from app.services.json_store_service import get_patient_context

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("", response_model=List[CalendarItem])
def get_reminders_list(care_receiver_id: Optional[str] = Query(None)):
    """
    Retourne la liste des rappels planifiés pour le patient.
    """
    items_data = json_store_service.get_calendar_items()
    if care_receiver_id:
        items_data = [item for item in items_data if item.get("care_receiver_id") == care_receiver_id]
    return [CalendarItem(**r) for r in items_data]

@router.post("", response_model=CalendarItem)
def add_new_reminder(payload: CreateCalendarItemPayload):
    """
    Permet d'ajouter un nouveau rappel.
    """
    new_item = CalendarItem(
        id=f"ci-{uuid.uuid4().hex[:8]}",
        care_receiver_id=payload.care_receiver_id,
        type=payload.type,
        title=payload.title,
        message_text=payload.message_text,
        scheduled_at=payload.scheduled_at,
        repeat_rule=payload.repeat_rule,
        audio_content_id=payload.audio_content_id,
        status="scheduled",
        created_at=datetime.utcnow().isoformat() + "Z"
    )

    with json_store_service.lock:
        items = json_store_service.get_calendar_items()
        items.append(new_item.model_dump())
        json_store_service.save_calendar_items(items)

    return new_item

@router.patch("/{item_id}", response_model=CalendarItem)
def update_reminder(item_id: str, payload: UpdateCalendarItemPayload):
    """
    Modifie un rappel existant ou marque son statut comme complété/annulé.
    """
    with json_store_service.lock:
        items = json_store_service.get_calendar_items()
        for i, item in enumerate(items):
            if item.get("id") == item_id:
                update_data = payload.model_dump(exclude_unset=True)
                updated_item = {**item, **update_data}
                items[i] = updated_item
                json_store_service.save_calendar_items(items)
                return CalendarItem(**updated_item)

    raise HTTPException(status_code=404, detail="Item not found")

@router.delete("/{item_id}")
def delete_reminder(item_id: str):
    """
    Supprime définitivement un rappel du calendrier.
    """
    with json_store_service.lock:
        items = json_store_service.get_calendar_items()
        initial_len = len(items)
        items = [item for item in items if item.get("id") != item_id]

        if len(items) == initial_len:
            raise HTTPException(status_code=404, detail="Item not found")

        json_store_service.save_calendar_items(items)
    return {"message": "Item deleted"}

class DemoTriggerPayload(BaseModel):
    care_receiver_id: str
    calendar_item_id: Optional[str] = None


class VoiceMessageNowPayload(BaseModel):
    care_receiver_id: str
    sender_name: str
    message: str


def _parse_reminder_type(msg: str) -> str:
    if not msg:
        return "reminder"
    m = re.match(r"^\[([\w_]+)\]\s*", msg)
    return m.group(1).lower() if m else "reminder"


@router.post("/demo/trigger-reminder-now")
def trigger_reminder_now(payload: DemoTriggerPayload):
    """
    [DEMO] Déclenche immédiatement un rappel sur l'interface Kiosk.
    Le LLM génère une phrase chaleureuse (ex: pills -> "Don't forget to take your pills").
    """
    text_to_speak = "Simone, it's time for your medication."
    calendar_item_id = None

    if payload.calendar_item_id:
        items = json_store_service.get_calendar_items()
        item = next((i for i in items if i.get("id") == payload.calendar_item_id), None)
        if item:
            title = item.get("title", "reminder")
            msg = item.get("message_text", "")
            reminder_type = _parse_reminder_type(msg)
            ctx = get_patient_context()
            resident_name = ctx.get("preferred_name") or ctx.get("name") or "Simone"
            text_to_speak = generate_reminder_phrase(title, reminder_type, msg, resident_name)
            calendar_item_id = item.get("id")

    new_action = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "kind": "speak_reminder",
        "text_to_speak": text_to_speak,
    }
    if calendar_item_id:
        new_action["calendar_item_id"] = calendar_item_id

    with json_store_service.lock:
        actions = json_store_service.get_device_actions()
        actions.append(new_action)
        json_store_service.save_device_actions(actions)

    return {"status": "triggered", "action_id": new_action["id"]}


@router.post("/voice-message-now")
def send_voice_message_now(payload: VoiceMessageNowPayload):
    """
    Envoie immédiatement un message vocal sur l'appareil du patient.
    Le message sera lu par TTS avec annonce de l'expéditeur.
    """
    intro = f"Message from {payload.sender_name}."
    full_text = f"{intro} {payload.message}"

    new_action = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "kind": "speak_reminder",
        "text_to_speak": full_text,
    }

    with json_store_service.lock:
        actions = json_store_service.get_device_actions()
        actions.append(new_action)
        json_store_service.save_device_actions(actions)

        events = json_store_service.get_events()
        events.append({
            "id": f"ev-{uuid.uuid4().hex[:8]}",
            "care_receiver_id": payload.care_receiver_id,
            "type": "reminder_delivered",
            "payload": {"sender": payload.sender_name, "message": payload.message[:50]},
            "created_at": datetime.utcnow().isoformat() + "Z",
        })
        json_store_service.save_events(events)

    return {"status": "sent", "action_id": new_action["id"]}


@router.post("/{item_id}/trigger-now")
def trigger_calendar_item_now(item_id: str, care_receiver_id: Optional[str] = Query(None)):
    """
    Déclenche immédiatement un événement du calendrier sur l'appareil du patient.
    Crée une DeviceAction à partir de l'élément calendar_item.
    """
    with json_store_service.lock:
        items = json_store_service.get_calendar_items()
        item = next((i for i in items if i.get("id") == item_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Calendar item not found")

        if care_receiver_id and item.get("care_receiver_id") != care_receiver_id:
            raise HTTPException(status_code=403, detail="Item does not belong to this care receiver")

        title = item.get("title", "Reminder")
        msg = item.get("message_text", "")
        is_audio = item.get("type") == "audio_push"
        reminder_type = _parse_reminder_type(msg)
        ctx = get_patient_context()
        resident_name = ctx.get("preferred_name") or ctx.get("name") or "Simone"
        text_to_speak = generate_reminder_phrase(title, reminder_type, msg, resident_name,
                                                 is_audio_invite=is_audio)

        new_action = {
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "kind": "speak_reminder" if not is_audio else "propose_audio",
            "text_to_speak": text_to_speak,
            "calendar_item_id": item_id,
        }

        if is_audio:
            # Chercher l'audio lié ou auto-sélectionner le premier disponible
            audio_contents = json_store_service.get_audio_contents()
            care_id = item.get("care_receiver_id")
            audio_content_id = item.get("audio_content_id")
            is_book = "audiobook" in (msg or "").lower() or "book" in (msg or "").lower()
            target_kind = "audiobook" if is_book else "music"
            ac = None
            # 1. ID explicite
            if audio_content_id:
                ac = next((c for c in audio_contents if c.get("id") == audio_content_id), None)
            # 2. Bon type pour ce patient
            if not ac:
                ac = next((c for c in audio_contents
                           if c.get("care_receiver_id") == care_id and c.get("kind") == target_kind), None)
            # 3. Bon type sans filtre patient
            if not ac:
                ac = next((c for c in audio_contents if c.get("kind") == target_kind), None)
            # 4. N'importe quel audio pour ce patient
            if not ac:
                ac = next((c for c in audio_contents if c.get("care_receiver_id") == care_id), None)
            # 5. Premier audio disponible
            if not ac and audio_contents:
                ac = audio_contents[0]
            if ac:
                new_action["audio_content_id"] = ac.get("id")
                new_action["audio_url"] = ac.get("url")
                new_action["audio_title"] = ac.get("title")

        actions = json_store_service.get_device_actions()
        # Garder uniquement les speak_reminder déjà présents + ajouter le nouveau en tête
        actions = [a for a in actions if a.get("kind") == "speak_reminder"]
        actions.insert(0, new_action)
        json_store_service.save_device_actions(actions)

    return {"status": "triggered", "action_id": new_action["id"]}
