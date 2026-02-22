import pytest
from app.utils.validators import is_valid_phone, is_valid_email, is_valid_address

def test_is_valid_phone():
    assert is_valid_phone("+33612345678") is True
    assert is_valid_phone("0612345678") is True
    assert is_valid_phone("06 12 34 56 78") is True
    assert is_valid_phone("+1-800-555-0199") is True
    assert is_valid_phone("123") is False
    assert is_valid_phone(None) is False
    assert is_valid_phone("") is False
    assert is_valid_phone("not a phone number") is False

def test_is_valid_email():
    assert is_valid_email("test@example.com") is True
    assert is_valid_email("first.last+tag@domain.co.uk") is True
    assert is_valid_email("invalid-email") is False
    assert is_valid_email("test@.com") is False
    assert is_valid_email("test@com") is False
    assert is_valid_email(None) is False

def test_is_valid_address():
    assert is_valid_address("123 Main St, Springfield") is True
    assert is_valid_address("10 Rue de la Paix, 75002 Paris") is True
    assert is_valid_address("123") is False # too short
    assert is_valid_address("") is False
    assert is_valid_address(None) is False
