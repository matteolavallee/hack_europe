"""
Tool to send a WhatsApp message to a caregiver.

Responsibilities:
- Resolve recipient name (spoken aloud) to phone number via caregivers.json.
- Send message via whatsapp_service.
- Return a confirmation or error message for Gemini to speak.
"""
from typing import Dict, Any, Optional
from app.services import json_store_service
from app.services.whatsapp_service import send_whatsapp_message as _send_whatsapp
from app.tools import register_tool


def _fuzzy_match_recipient(recipient_name: str, caregivers: list) -> Optional[Dict[str, Any]]:
    """Match recipient_name (spoken) to a caregiver. Case-insensitive, first name suffices."""
    if not recipient_name or not caregivers:
        return None
    r = recipient_name.strip().lower()
    for c in caregivers:
        name = (c.get("name") or "").strip()
        if not name:
            continue
        name_lower = name.lower()
        # Exact or contained (e.g. "Marie" matches "Marie Dupont")
        if r == name_lower or r in name_lower:
            return c
        # First name match (e.g. "Marie" matches "Marie Dupont")
        first = name_lower.split()[0] if name_lower else ""
        if first and (r == first or r in first or first in r):
            return c
    return None


@register_tool
def send_whatsapp_message(recipient_name: str, message_content: str) -> Dict[str, Any]:
    """
    Send a WhatsApp message to the specified contact.

    Use this function when the patient wants to send a message to a loved one
    (caregiver, family, friend) and you have identified the recipient and message content.
    Available contacts are in caregivers.json.

    Args:
        recipient_name: Name of the recipient as spoken aloud (e.g., "Marie", "Sarah", "John").
        message_content: Message content dictated by the patient.
    """
    caregivers = json_store_service.get_caregivers()
    if not caregivers:
        return {"status": "error", "message": "No contacts available."}

    contact = _fuzzy_match_recipient(recipient_name, caregivers)
    if not contact:
        return {
            "status": "error",
            "message": f"I couldn't find a contact matching '{recipient_name}'. Available contacts are: {', '.join(c.get('name', '?') for c in caregivers)}.",
        }

    phone = contact.get("phone") or ""
    if not phone:
        return {"status": "error", "message": f"{contact.get('name', 'This contact')} has no phone number on file."}

    ok = _send_whatsapp(phone, message_content.strip())
    if not ok:
        return {"status": "error", "message": "Failed to send the message. Please try again later."}

    return {
        "status": "success",
        "message": f"Your message has been sent to {contact.get('name', recipient_name)}.",
    }
