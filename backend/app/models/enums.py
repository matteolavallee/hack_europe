"""
This module defines Python Enums used to restrict value domains.

Responsibilities:
- Provide strict typings for concepts like relation type, log severity, and reminder recurrence.
"""
from enum import Enum

class RelationType(str, Enum):
    FAMILY = "famille"
    CAREGIVER = "aidant"
    FRIEND = "ami"
    ACQUAINTANCE = "connaissance"

class LogSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    CRITICAL = "critical"
