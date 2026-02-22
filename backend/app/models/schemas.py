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

# --- CAREGIVERS & CARE RECEIVERS ---
class Caregiver(BaseModel):
    id: str
    name: str
    relation: RelationType
    phone: str
    telegram_id: str
    telegram_chat_id: Optional[str] = None
    email: str
    is_primary: bool
    address: Optional[str] = None
    context: Optional[str] = None
    created_at: Optional[str] = None

class CareReceiver(BaseModel):
    id: str
    caregiver_id: str
    name: str
    language: str
    tone: str
    created_at: str

class CareReceiverCreate(BaseModel):
    caregiver_id: str
    name: str
    language: str
    tone: str

class CareReceiverUpdate(BaseModel):
    caregiver_id: Optional[str] = None
    name: Optional[str] = None
    language: Optional[str] = None
    tone: Optional[str] = None

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

# --- CALENDAR (REMINDERS / AUDIO PUSH) ---
class CalendarItemBase(BaseModel):
    type: str # reminder or audio_push
    title: str
    message_text: Optional[str] = None
    scheduled_at: str
    repeat_rule: Optional[str] = None
    audio_content_id: Optional[str] = None

class CalendarItem(CalendarItemBase):
    id: str
    care_receiver_id: str
    status: str # scheduled, sent, completed, cancelled
    created_at: str

class CreateCalendarItemPayload(CalendarItemBase):
    care_receiver_id: str

class UpdateCalendarItemPayload(BaseModel):
    title: Optional[str] = None
    message_text: Optional[str] = None
    scheduled_at: Optional[str] = None
    repeat_rule: Optional[str] = None
    status: Optional[str] = None

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
    category: str = "GENERAL"

class HealthLogCreate(BaseModel):
    date: str
    mood: str
    medication_taken: bool
    notes: Optional[str] = ""
    category: str = "GENERAL"

# --- CHAT ENDPOINTS ---
class ChatMessage(BaseModel):
    message: str
    audio_context: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    audio_url: Optional[str] = None
    pipeline: Optional[list[dict]] = None  # For dev debugging

class HistoryItem(BaseModel):
    role: str
    content: str
    
# --- AUDIO CONTENT ---
class AudioContent(BaseModel):
    id: str
    care_receiver_id: str
    title: str
    url: str
    kind: str # family_message, audiobook, other
    recommendable: bool
    created_at: str

class CreateAudioContentPayload(BaseModel):
    care_receiver_id: str
    title: str
    url: str
    kind: str
    recommendable: Optional[bool] = False
    
# --- EVENTS (TIMELINE) ---
class CareLoopEvent(BaseModel):
    id: str
    care_receiver_id: str
    type: str # reminder_created, exercise_completed, etc.
    payload: dict
    created_at: str

# --- DEVICE INTERACTION ---
class DeviceAction(BaseModel):
    id: str
    kind: str # speak_reminder, propose_audio, propose_exercise
    text_to_speak: str
    audio_url: Optional[str] = None
    calendar_item_id: Optional[str] = None
    audio_content_id: Optional[str] = None

class DeviceResponsePayload(BaseModel):
    action_id: str
    response: str # yes, no, later

class HelpRequestPayload(BaseModel):
    type: str # notify_caregiver
    message: Optional[str] = None
