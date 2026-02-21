"""
This module defines the API endpoints for reminders.

Responsibilities:
- Provide routes to create, read, update, and delete reminders.
- Interface with the reminder service to manage the JSON data store.
"""
from fastapi import APIRouter
from typing import List
import uuid

from app.models.schemas import Reminder, ReminderCreate
from app.services import json_store_service

router = APIRouter(prefix="/reminders", tags=["reminders"])

@router.get("", response_model=List[Reminder])
async def get_reminders_list():
    """
    Retourne la liste des rappels planifiés pour le patient.
    """
    reminders_data = json_store_service.get_reminders()
    return [Reminder(**r) for r in reminders_data]

@router.post("", response_model=Reminder)
async def add_new_reminder(reminder_in: ReminderCreate):
    """
    Permet d'ajouter un nouveau rappel (ex: "Prendre les médicaments à 12h00").
    """
    reminders = json_store_service.get_reminders()
    
    new_reminder = Reminder(
        id=uuid.uuid4().hex[:8],
        title=reminder_in.title,
        time=reminder_in.time,
        repeat=reminder_in.repeat,
        is_active=reminder_in.is_active
    )
    
    reminders.append(new_reminder.model_dump())
    json_store_service.save_reminders(reminders)
    
    return new_reminder
