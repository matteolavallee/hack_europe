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

from app.models.schemas import CalendarItem, CreateCalendarItemPayload, UpdateCalendarItemPayload
from app.services import json_store_service

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("", response_model=List[CalendarItem])
async def get_reminders_list(care_receiver_id: Optional[str] = Query(None)):
    """
    Retourne la liste des rappels planifiés pour le patient.
    """
    items_data = json_store_service.get_calendar_items()
    if care_receiver_id:
        items_data = [item for item in items_data if item.get("care_receiver_id") == care_receiver_id]
    return [CalendarItem(**r) for r in items_data]

@router.post("", response_model=CalendarItem)
async def add_new_reminder(payload: CreateCalendarItemPayload):
    """
    Permet d'ajouter un nouveau rappel.
    """
    items = json_store_service.get_calendar_items()
    
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
    
    items.append(new_item.model_dump())
    json_store_service.save_calendar_items(items)
    
    return new_item

@router.patch("/{item_id}", response_model=CalendarItem)
async def update_reminder(item_id: str, payload: UpdateCalendarItemPayload):
    """
    Modifie un rappel existant ou marque son statut comme complété/annulé.
    """
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
async def delete_reminder(item_id: str):
    """
    Supprime définitivement un rappel du calendrier.
    """
    items = json_store_service.get_calendar_items()
    initial_len = len(items)
    items = [item for item in items if item.get("id") != item_id]
    
    if len(items) == initial_len:
        raise HTTPException(status_code=404, detail="Item not found")
        
    json_store_service.save_calendar_items(items)
    return {"message": "Item deleted"}

class DemoTriggerPayload(BaseModel):
    care_receiver_id: str

@router.post("/demo/trigger-reminder-now")
async def trigger_reminder_now(payload: DemoTriggerPayload):
    """
    [DEMO] Déclenche immédiatement un rappel sur l'interface Kiosk en simulant un événement DeviceAction.
    """
    # This acts as a demo trigger to put an action in the device_actions simulated queue
    actions = json_store_service.get_device_actions()
    
    new_action = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "kind": "speak_reminder",
        "text_to_speak": "Simone, it's time for your medication.",
    }
    actions.append(new_action)
    json_store_service.save_device_actions(actions)
    
    return {"status": "triggered"}
