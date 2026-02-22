"""
Tool definition to trigger audio playback on the frontend device.

Responsibilities:
- Allow the LLM to send a command to the physical box to play uplifting music or family messages.
"""
import uuid
from typing import Dict, Any
from app.services import json_store_service
from app.tools import register_tool

@register_tool
def play_audio_content(audio_type: str) -> Dict[str, Any]:
    """
    Trigger audio playback on the patient's device (valid audio_type examples: "music", "family_message").
    Useful to soothe the patient, provide stimulation (Snoezelen), or let them hear a loved one's voice if they feel lonely.
    """
    with json_store_service.lock:
        actions = json_store_service.get_device_actions()

        # Mock MP3 links for example
        url = ""
        title = ""
        if audio_type == "music":
            title = "Your favorite music"
            url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        else:
            title = "Message from your granddaughter Sarah"
            url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"

        actions.append({
            "id": f"act-{uuid.uuid4().hex[:8]}",
            "kind": "propose_audio",
            "text_to_speak": f"I've prepared this for you: {title}. Let's listen together.",
            "audio_url": url,
            "audio_content_id": f"content_{uuid.uuid4().hex[:4]}"
        })
        json_store_service.save_device_actions(actions)

    return {"status": "success", "message": f"The audio content '{title}' has been sent and is now playing on your device."}
