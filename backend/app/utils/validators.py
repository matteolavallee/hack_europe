"""
Utility module for data validation.

Responsibilities:
- Verify and format phone numbers, emails, and physical addresses.
"""
import re

def is_valid_phone(phone: str) -> bool:
    """
    Very basic check for a phone number (e.g., +33 6 12 34 56 78 or 0612345678).
    Checks that it mostly contains digits, spaces, hyphens, or a leading plus.
    """
    if not phone:
        return False
    # Remove spaces, dashes, periods
    cleaned = re.sub(r"[\s\-\.]", "", phone)
    # Check if the rest is just an optional '+' followed by digits (at least 9 digits)
    return bool(re.match(r"^\+?\d{9,15}$", cleaned))

def is_valid_email(email: str) -> bool:
    """
    Simple check for email format.
    """
    if not email:
        return False
    # Standard email regex pattern
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email))

def is_valid_address(address: str) -> bool:
    """
    Basic check for a physical address. Ensure it's not too short.
    """
    if not address:
        return False
    # An address should usually have at least a number and a street name
    return len(address.strip()) > 5
