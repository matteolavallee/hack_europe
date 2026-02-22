from app.services.agent_service import process_user_message
from app.services.json_store_service import save_reminders, save_device_actions
import time

if __name__ == "__main__":
    session_id = "test_env_context"
    
    # Mocking some environmental data
    save_reminders([
        {
            "id": "r1",
            "care_receiver_id": "c1",
            "title": "Prendre le médicament pour la tension",
            "scheduled_time": "14:00",
            "repeat_rule": "daily",
            "created_at": "now"
        }
    ])
    
    save_device_actions([
        {
            "id": "da1",
            "kind": "propose_exercise",
            "text_to_speak": "Veux-tu faire un exercice de respiration ?"
        }
    ])
    
    print("--- TESTING ENVIRONMENTAL CONTEXT INJECTION ---")
    res1 = process_user_message(session_id, "Fais un point sur mon environnement actuel. Est-ce que j'ai des trucs prévus ou en attente ?")
    print(f"\nAGENT RESPONSE:\n{res1}")
    
    # Cleanup mocks
    save_reminders([])
    save_device_actions([])
