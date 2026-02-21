"""
This module handles configuration management for the application.

Responsibilities:
- Load environment variables from .env.
- Provide typed configuration settings (e.g., API keys, debug toggles).
- Centralize app-wide settings definition.
"""
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the .env file if it exists at the root of the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
