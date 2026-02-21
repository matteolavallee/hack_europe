"""
This module defines the API endpoints for health logs.

Responsibilities:
- Fetch daily mood and task completion (like medication) logs.
- Provide endpoints for the UI to monitor the patient's basic health metrics over time.
"""
from fastapi import APIRouter, Query
from typing import List, Optional
import uuid
from datetime import datetime

from app.models.schemas import HealthLog, HealthLogCreate, CareLoopEvent
from app.services import json_store_service

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/status")
async def health_check():
    """
    Une simple route de vérification du système.
    """
    return {"status": "ok", "message": "Jarvis backend is running"}

@router.get("/logs", response_model=List[HealthLog])
async def get_health_logs():
    """
    Récupère l'historique de santé du patient.
    """
    logs_data = json_store_service.get_health_logs()
    return [HealthLog(**l) for l in logs_data]

@router.post("/logs", response_model=HealthLog)
async def add_health_log(log_in: HealthLogCreate):
    """
    Ajoute une nouvelle entrée de santé.
    """
    logs = json_store_service.get_health_logs()
    
    new_log = HealthLog(
        log_id=uuid.uuid4().hex[:8],
        date=log_in.date,
        mood=log_in.mood,
        medication_taken=log_in.medication_taken,
        notes=log_in.notes
    )
    
    logs.append(new_log.model_dump())
    json_store_service.save_health_logs(logs)
    
    return new_log

@router.get("/events", response_model=List[CareLoopEvent])
async def get_care_events(
    care_receiver_id: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """
    Récupère les événements de la timeline pour le dashboard.
    """
    events_data = json_store_service.get_events()
    
    if care_receiver_id:
        events_data = [e for e in events_data if e.get("care_receiver_id") == care_receiver_id]
        
    # Sort events by created_at descending
    events_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return [CareLoopEvent(**e) for e in events_data[:limit]]
