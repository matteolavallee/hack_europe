import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from app.services.agent_service import process_user_message
from app.services.json_store_service import get_conversations, save_conversations, lock
from app.core.constants import BASE_DIR

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

def init_scheduler():
    # Planification théorique (pour la prod)
    # scheduler.add_job(morning_routine, CronTrigger(hour=8, minute=0))
    # scheduler.add_job(cognitive_game_routine, CronTrigger(hour=15, minute=0))
    pass
