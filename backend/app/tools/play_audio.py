"""
Tool definition to trigger audio playback on the frontend device.

Responsibilities:
- Allow the LLM to send a command to the physical box to play uplifting music or family messages.
"""
import uuid
from typing import Dict, Any
from app.services import json_store_service

def play_audio_content(audio_type: str) -> Dict[str, Any]:
    """
    Déclenche la lecture d'un contenu audio sur la box du patient (exemples valides pour audio_type : "musique", "message_famille").
    Utile pour apaiser le patient, le stimuler (Snoezelen), ou lui faire entendre la voix de ses proches s'il se sent seul.
    """
    with json_store_service.lock:
        actions = json_store_service.get_device_actions()
        
        # Mock de liens MP3 pour l'exemple
        url = ""
        title = ""
        if audio_type == "musique":
            title = "Votre musique préférée"
            url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        else:
            title = "Message de votre petite-fille Sarah"
            url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
            
        actions.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "kind": "propose_audio",
            "text_to_speak": f"J'ai préparé ceci pour vous : {title}. Écoutons ça ensemble.",
            "audio_url": url,
            "audio_content_id": f"content_{uuid.uuid4().hex[:4]}"
        })
        json_store_service.save_device_actions(actions)
        
    return {"status": "success", "message": f"Le contenu audio '{title}' a été envoyé et est en train d'être joué par la box."}
