import asyncio
import re
import uuid
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone
from app.services.agent_service import process_user_message
from app.services.json_store_service import (
    get_conversations,
    save_conversations,
    get_calendar_items,
    save_calendar_items,
    get_device_actions,
    save_device_actions,
    get_events,
    save_events,
    lock,
)
from app.core.constants import BASE_DIR
from app.services.llm_service import generate_reminder_phrase
from app.services.json_store_service import get_patient_context

scheduler = AsyncIOScheduler()

async def morning_routine():
    """
    Simule la préparation d'un rapport matinal par l'agent.
    Appelle le web_search_tool via l'agent LLM pour obtenir la météo et de bonnes nouvelles.
    """
    print("[SCHEDULER] Démarrage de la routine matinale...")
    session_id = "agent_background_routine"
    
    # On demande explicitement à l'agent d'utiliser son outil de recherche
    prompt = "C'est le matin ! Peux-tu utiliser ton outil de recherche web pour chercher la météo générale en France et 2 vraies actualités très positives et récentes dans le monde ? Rédige un petit briefing matinal pour le patient."
    
    try:
        # Comme process_user_message est synchrone (et bloque), on l'exécute dans un thread séparé
        response = await asyncio.to_thread(process_user_message, session_id, prompt)
        
        # Sauvegarde du briefing
        briefing_path = BASE_DIR / "app" / "data" / "daily_briefing.txt"
        with open(briefing_path, "w", encoding="utf-8") as f:
            f.write(f"Briefing du {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n{response}")
            
        print("[SCHEDULER] Routine matinale terminée et sauvegardée.")
    except Exception as e:
        print(f"[SCHEDULER] Erreur lors de la routine matinale : {e}")

async def cognitive_game_routine():
    """
    Déclenche proactivement une invitation à jouer un jeu cognitif.
    Injecte un message 'assistant' dans le log de conversation pour que le frontend le capte.
    """
    print("[SCHEDULER] Démarrage de la routine de jeu cognitif...")
    session_id = "default_patient_session"
    
    with lock:
        conversations = get_conversations()
        session_conv = next((c for c in conversations if c.get("session_id") == session_id), None)
        
        if not session_conv:
            session_conv = {
                "session_id": session_id,
                "timestamp": datetime.now().isoformat() + "Z",
                "messages": []
            }
            conversations.append(session_conv)
            
        # On insère une notification "Push" dans la conversation
        session_conv["messages"].append({
            "role": "assistant",
            "content": "Coucou ! C'est l'heure de notre petit jeu quotidien ! Est-ce que tu es prêt ?"
        })
        
        save_conversations(conversations)
        
    print("[SCHEDULER] Invitation au jeu envoyée dans l'historique.")

def _parse_reminder_type(msg: str) -> str:
    """Extrait le type depuis [medication], [appointment], etc."""
    if not msg:
        return "reminder"
    m = re.match(r"^\[([\w_]+)\]\s*", msg)
    return m.group(1).lower() if m else "reminder"


def _get_audio_for_item(item: dict):
    """Retourne l'audio_content associé à un calendar item, ou auto-sélectionne le premier disponible."""
    from app.services.json_store_service import get_audio_contents
    audio_content_id = item.get("audio_content_id")
    contents = get_audio_contents()
    care_id = item.get("care_receiver_id")

    if audio_content_id:
        return next((c for c in contents if c.get("id") == audio_content_id), None)

    # Auto-sélection selon le type (music vs audiobook)
    msg = (item.get("message_text") or "").lower()
    is_book = "audiobook" in msg or "livre" in msg or "book" in msg
    target_kind = "audiobook" if is_book else "music"

    # 1. Chercher le bon type pour ce patient
    for c in contents:
        if c.get("care_receiver_id") == care_id and c.get("kind") == target_kind:
            return c
    # 2. Chercher sans filtre de patient (partage global)
    for c in contents:
        if c.get("kind") == target_kind:
            return c
    # 3. Fallback : n'importe quel audio pour ce patient
    for c in contents:
        if c.get("care_receiver_id") == care_id:
            return c
    # 4. Dernier recours : premier audio disponible
    return contents[0] if contents else None


def _calendar_item_to_device_action(item: dict) -> dict:
    """Convertit un calendar_item en DeviceAction pour l'appareil vocal.
    Utilise le LLM pour générer une phrase chaleureuse (ex: pills -> "Don't forget to take your pills").
    Pour audio_push, génère une invitation oui/non et inclut l'audio_url."""
    title = item.get("title", "Reminder")
    msg = item.get("message_text", "")
    is_audio = item.get("type") == "audio_push"
    reminder_type = _parse_reminder_type(msg)
    ctx = get_patient_context()
    resident_name = ctx.get("preferred_name") or ctx.get("name") or "Simone"
    text_to_speak = generate_reminder_phrase(title, reminder_type, msg, resident_name,
                                             is_audio_invite=is_audio)

    action = {
        "id": f"act-{uuid.uuid4().hex[:8]}",
        "kind": "speak_reminder" if not is_audio else "propose_audio",
        "text_to_speak": text_to_speak,
        "calendar_item_id": item.get("id"),
    }

    if is_audio:
        audio = _get_audio_for_item(item)
        if audio:
            action["audio_content_id"] = audio.get("id")
            action["audio_url"] = audio.get("url")
            action["audio_title"] = audio.get("title")

    return action


def _next_occurrence(scheduled: datetime, repeat_rule: str | None) -> datetime | None:
    """Calcule la prochaine occurrence pour repeat_rule daily/weekly. Retourne None si one-shot."""
    if not repeat_rule or repeat_rule == "none":
        return None
    rule = (repeat_rule or "").lower()
    if rule == "daily":
        from datetime import timedelta
        return scheduled + timedelta(days=1)
    if rule.startswith("weekly:"):
        from datetime import timedelta
        return scheduled + timedelta(days=7)
    return None


def check_due_calendar_items():
    """
    Vérifie les événements du calendrier dont l'heure est dépassée
    et les envoie à l'appareil du patient (device_actions).
    Marque l'item comme 'sent'. Pour repeat_rule daily, crée la prochaine occurrence.
    """
    now = datetime.now(timezone.utc)
    with lock:
        items = get_calendar_items()
        actions = get_device_actions()
        events = get_events()
        updated = False

        for item in list(items):  # copy to allow appending
            if item.get("status") != "scheduled":
                continue
            try:
                scheduled = datetime.fromisoformat(
                    item["scheduled_at"].replace("Z", "+00:00")
                )
            except (ValueError, TypeError):
                continue

            if scheduled <= now:
                action = _calendar_item_to_device_action(item)
                actions.append(action)

                repeat_rule = item.get("repeat_rule")
                next_at = _next_occurrence(scheduled, repeat_rule)

                if next_at:
                    # Récurrent : créer la prochaine occurrence
                    new_item = dict(item)
                    new_item["id"] = f"ci-{uuid.uuid4().hex[:8]}"
                    new_item["scheduled_at"] = next_at.isoformat().replace("+00:00", "Z")
                    new_item["status"] = "scheduled"
                    new_item["created_at"] = datetime.utcnow().isoformat() + "Z"
                    items.append(new_item)
                    item["status"] = "sent"
                else:
                    item["status"] = "sent"

                events.append({
                    "id": f"ev-{uuid.uuid4().hex[:8]}",
                    "care_receiver_id": item.get("care_receiver_id", "default"),
                    "type": "reminder_delivered",
                    "payload": {
                        "calendar_item_id": item.get("id"),
                        "title": item.get("title"),
                    },
                    "created_at": datetime.utcnow().isoformat() + "Z",
                })
                updated = True
                print(f"[SCHEDULER] Calendar item {item.get('id')} sent to device: {item.get('title')}")

        if updated:
            save_calendar_items(items)
            save_device_actions(actions)
            save_events(events)


def init_scheduler():
    # Calendrier → Appareil: vérifie toutes les minutes les rappels dus
    scheduler.add_job(check_due_calendar_items, IntervalTrigger(minutes=1))

    # Planification théorique (pour la prod)
    # scheduler.add_job(morning_routine, CronTrigger(hour=8, minute=0))
    # scheduler.add_job(cognitive_game_routine, CronTrigger(hour=15, minute=0))
