"""
This module defines the entry point for Telegram Bot webhooks.

Responsibilities:
- Receive and parse notifications or messages from Telegram via webhook.
- Trigger backend services in response to caregiver replies directly from Telegram.
"""
from fastapi import APIRouter, Request

router = APIRouter(prefix="/telegram", tags=["telegram"])

@router.post("/webhook")
async def telegram_webhook(request: Request):
    """
    Route destinée à être appelée par l'API Telegram lorsqu'un aidant envoie un message au bot.
    Reçoit le payload JSON de Telegram.
    """
    payload = await request.json()
    # Mock processing logic
    print("Received Telegram webhook payload:", payload)
    return {"status": "ok", "message": "Webhook received successfully"}
