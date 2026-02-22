"""
Wrapper around Whapi.Cloud WhatsApp API.

Responsibilities:
- Send text messages via Whapi.Cloud HTTP API.
- Normalize phone numbers to international format (digits only).
"""
import httpx
from app.core.config import WAPICLOUD_URL, WAPICLOUD_TOKEN


def _normalize_phone(phone: str) -> str:
    """Remove + and non-digit chars. Expects E.164 or similar."""
    return "".join(c for c in phone if c.isdigit())


def send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Send a text message via Whapi.Cloud API.

    Args:
        phone: Recipient number (E.164, e.g. +33612345678)
        message: Message body (plain text)

    Returns:
        True if sent successfully, False otherwise.
    """
    if not WAPICLOUD_URL or not WAPICLOUD_TOKEN:
        print("[WHATSAPP] WAPICLOUD_URL or WAPICLOUD_TOKEN not configured")
        return False

    to = _normalize_phone(phone)
    if not to:
        return False

    url = f"{WAPICLOUD_URL.rstrip('/')}/messages/text"
    headers = {
        "Authorization": f"Bearer {WAPICLOUD_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    payload = {"to": to, "body": message}

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return True
            print(f"[WHATSAPP] API error {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        print(f"[WHATSAPP] Request failed: {e}")
        return False
