"""
This module serves as the primary entry point for the FastAPI application.

Responsibilities:
- Initialize the FastAPI app instance.
- Include all necessary API routers (chat, reminders, caregivers, health, telegram_webhook).
- Set up initial application state and configurations.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api import chat, reminders, health, caregivers, routines, whatsapp
from app.api.voice import router as voice_router
from app.services.scheduler_service import init_scheduler, scheduler
import google.generativeai as genai
from fastapi.applications import LifespanManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Healthcare Assistant backend is ready and listening...")
    init_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="HackEurope - Healthcare Assistant", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

app.include_router(chat.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(caregivers.router, prefix="/api")
app.include_router(routines.router, prefix="/api")
app.include_router(whatsapp.router, prefix="/api")

# Serve static audio files
app.mount("/audio", StaticFiles(directory="app/static/audio"), name="audio")
# voice_router already carries prefix="/api" internally — do NOT add prefix here
app.include_router(voice_router)

