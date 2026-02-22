"""
Tool definition to update the patient's medical and personal context safely.

Responsibilities:
- Allow the onboarding LLM to persist parsed information (Name, Age, History, Lifestyle) into patient_context.json.
"""
from typing import Dict, Any, Optional
from app.services import json_store_service

def update_patient_context(
    name: Optional[str] = None,
    age: Optional[int] = None,
    medical_history: Optional[str] = None,
    lifestyle: Optional[str] = None,
    emergency_contact_name: Optional[str] = None,
    emergency_contact_phone: Optional[str] = None,
    emergency_contact_relation: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sauvegarde ou met à jour les informations de base du patient dans le dossier médical (patient_context.json).
    Appelle cet outil dès que tu as obtenu une nouvelle information qualifiée de la part du patient.
    """
    with json_store_service.lock:
        context = json_store_service.get_patient_context()
        
        if name is not None:
            context["name"] = name
        if age is not None:
            context["age"] = age
        if medical_history is not None:
            context["medical_history"] = medical_history
        if lifestyle is not None:
            context["lifestyle"] = lifestyle
            
        if emergency_contact_name or emergency_contact_phone or emergency_contact_relation:
            if "emergency_contact" not in context:
                context["emergency_contact"] = {}
                
            if emergency_contact_phone is not None:
                from app.utils.validators import is_valid_phone
                if not is_valid_phone(emergency_contact_phone):
                    return {"error": f"Le numéro '{emergency_contact_phone}' est invalide. Demande au patient de le répéter."}
                context["emergency_contact"]["phone"] = emergency_contact_phone
                
            if emergency_contact_name is not None:
                context["emergency_contact"]["name"] = emergency_contact_name
            if emergency_contact_relation is not None:
                context["emergency_contact"]["relation"] = emergency_contact_relation
                
        json_store_service.save_patient_context(context)

    return {"status": "success", "updated_fields": list(context.keys())}
