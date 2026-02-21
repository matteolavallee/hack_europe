"""
This module defines the API endpoints for caregivers.

Responsibilities:
- Manage endpoints related to caregiver profiles and settings.
- Delegate data handling to the JSON store service.
"""
from fastapi import APIRouter
from typing import List

from app.models.schemas import Caregiver
from app.services import json_store_service

router = APIRouter(prefix="/caregivers", tags=["caregivers"])

@router.get("", response_model=List[Caregiver])
async def get_caregivers_list():
    """
    Récupère les informations des aidants (nom, ID Telegram, numéro de téléphone).
    """
    caregivers_data = json_store_service.get_caregivers()
    return [Caregiver(**c) for c in caregivers_data]
