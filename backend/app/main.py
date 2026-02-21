"""
This module serves as the primary entry point for the FastAPI application.

Responsibilities:
- Initialize the FastAPI app instance.
- Include all necessary API routers (chat, reminders, caregivers, health, telegram_webhook).
- Set up initial application state and configurations.
"""
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api import chat, telegram_webhook, reminders, health, caregivers

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Jarvis Alzheimer Assistant backend is ready and listening...")
    yield

app = FastAPI(title="HackEurope - Jarvis Alzheimer", lifespan=lifespan)

# Inclusion des routes
app.include_router(chat.router, prefix="/api")
app.include_router(telegram_webhook.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(caregivers.router, prefix="/api")

