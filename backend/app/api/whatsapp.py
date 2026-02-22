"""
API endpoints for WhatsApp message sending.

Responsibilities:
- Expose manual test endpoint for sending WhatsApp messages.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.whatsapp_service import send_whatsapp_message

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class SendPayload(BaseModel):
    phone: str
    message: str


@router.post("/send")
def send_message(payload: SendPayload):
    """
    Envoie un message WhatsApp au numéro indiqué. Utilisé pour tester l'intégration.
    """
    ok = send_whatsapp_message(payload.phone, payload.message)
    if not ok:
        raise HTTPException(status_code=500, detail="Échec de l'envoi du message WhatsApp.")
    return {"status": "ok", "message": "Message envoyé avec succès."}
