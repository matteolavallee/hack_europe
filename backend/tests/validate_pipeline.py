import sys
sys.path.insert(0, ".")
import json
from pydantic import TypeAdapter
from app.models.schemas import Caregiver, PatientContext, CalendarItem, HealthLog, ConversationLog
from app.core import constants

def check_file(file_path, schema, is_list=True):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if is_list:
            TypeAdapter(list[schema]).validate_python(data)
        else:
            schema.model_validate(data)
        print(f"OK: {file_path.name}")
    except FileNotFoundError:
        print(f"WARNING: {file_path.name} not found.")
    except Exception as e:
        print(f"ERROR in {file_path.name}: {e}")

print("--- Validating Data JSONs against Pydantic Schemas ---")
check_file(constants.CAREGIVERS_FILE, Caregiver)
check_file(constants.PATIENT_CONTEXT_FILE, PatientContext, is_list=False)
check_file(constants.CALENDAR_ITEMS_FILE, CalendarItem)
check_file(constants.HEALTH_LOGS_FILE, HealthLog)
check_file(constants.CONVERSATIONS_FILE, ConversationLog)
