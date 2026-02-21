"""
This module defines Pydantic schemas for data validation.

Responsibilities:
- Enforce types for incoming HTTP requests.
- Shape outgoing JSON responses consistently across all endpoints.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
from app.models.enums import RelationType

# --- CAREGIVERS ---
class Caregiver(BaseModel):
    id: str
    name: str
    relation: RelationType
    phone: str
    telegram_id: str
    email: str
    is_primary: bool
    address: Optional[str] = None
    context: Optional[str] = None

# --- PATIENT CONTEXT ---
class PatientContext(BaseModel):
    patient_id: str
    name: str
    age: int
    condition_stage: str
    preferred_name: str
    known_allergies: List[str]
    home_address: str
    interests: List[str]

# --- REMINDERS ---
class ReminderBase(BaseModel):
    title: str
    time: str
    repeat: str = "daily"
    is_active: bool = True

class Reminder(ReminderBase):
    id: str

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    time: Optional[str] = None
    repeat: Optional[str] = None
    is_active: Optional[bool] = None

# --- CONVERSATIONS ---
class Message(BaseModel):
    role: str
    content: str

class ConversationLog(BaseModel):
    session_id: str
    timestamp: str
    messages: List[Message]

# --- HEALTH LOGS ---
class HealthLog(BaseModel):
    log_id: str
    date: str
    mood: str
    medication_taken: bool
    notes: str

class HealthLogCreate(BaseModel):
    date: str
    mood: str
    medication_taken: bool
    notes: Optional[str] = ""

# --- CHAT ENDPOINTS ---
class ChatMessage(BaseModel):
    message: str
    audio_context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    audio_url: Optional[str] = None

class HistoryItem(BaseModel):
    role: str
    content: str
