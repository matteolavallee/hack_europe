from fastapi import APIRouter
from app.services.scheduler_service import morning_routine, cognitive_game_routine
import asyncio

router = APIRouter(prefix="/routines", tags=["routines"])

@router.post("/trigger-morning")
async def trigger_morning_routine():
    """
    Force l'exécution immédiate de la routine du matin (météo + bonnes nouvelles).
    Utile pour la démonstration du Hackathon.
    """
    # Lancement en tâche de fond pour ne pas bloquer l'API
    asyncio.create_task(morning_routine())
    return {"status": "Routine matinale déclenchée en arrière-plan."}

@router.post("/trigger-game")
async def trigger_game_routine():
    """
    Force l'exécution immédiate de la routine de jeu cognitif.
    Utile pour la démonstration du Hackathon.
    """
    await cognitive_game_routine()
    return {"status": "Invitation au jeu insérée dans l'historique."}
