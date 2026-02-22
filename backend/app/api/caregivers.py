"""
This module defines the API endpoints for caregivers.

Responsibilities:
- Manage endpoints related to caregiver profiles and settings.
- Delegate data handling to the JSON store service.
"""
from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from datetime import datetime

from app.models.schemas import Caregiver, CareReceiver, CareReceiverCreate, CareReceiverUpdate
from app.services import json_store_service

router = APIRouter(prefix="/caregivers", tags=["caregivers"])

@router.get("", response_model=List[Caregiver])
def get_caregivers_list():
    """
    Retrieves caregivers information (name, Telegram ID, phone number).
    """
    caregivers_data = json_store_service.get_caregivers()
    return [Caregiver(**c) for c in caregivers_data]

@router.get("/receivers", response_model=List[CareReceiver])
def get_care_receivers_list():
    receivers_data = json_store_service.get_care_receivers()
    return [CareReceiver(**r) for r in receivers_data]

@router.get("/receivers/{receiver_id}", response_model=CareReceiver)
def get_care_receiver(receiver_id: str):
    receivers_data = json_store_service.get_care_receivers()
    for r in receivers_data:
        if r.get("id") == receiver_id:
            return CareReceiver(**r)
    raise HTTPException(status_code=404, detail="Care receiver not found")

@router.post("/receivers", response_model=CareReceiver)
def create_care_receiver(payload: CareReceiverCreate):
    new_id = f"cr-{str(uuid.uuid4().hex)[:8]}"
    new_receiver = CareReceiver(
        id=new_id,
        caregiver_id=payload.caregiver_id,
        name=payload.name,
        language=payload.language,
        tone=payload.tone,
        created_at=datetime.utcnow().isoformat() + "Z"
    )

    with json_store_service.lock:
        receivers_data = json_store_service.get_care_receivers()
        receivers_data.append(new_receiver.model_dump())
        json_store_service.save_care_receivers(receivers_data)
    return new_receiver

@router.patch("/receivers/{receiver_id}", response_model=CareReceiver)
def update_care_receiver(receiver_id: str, payload: CareReceiverUpdate):
    with json_store_service.lock:
        receivers_data = json_store_service.get_care_receivers()
        for i, r in enumerate(receivers_data):
            if r.get("id") == receiver_id:
                update_data = payload.model_dump(exclude_unset=True)
                updated_r = {**r, **update_data}
                receivers_data[i] = updated_r
                json_store_service.save_care_receivers(receivers_data)
                return CareReceiver(**updated_r)
    raise HTTPException(status_code=404, detail="Care receiver not found")
