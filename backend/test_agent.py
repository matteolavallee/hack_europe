import sys
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

from app.services.agent_service import process_user_message

def test_agent():
    print("Testing agent_service...")
    response = process_user_message("test_session_1", "Hello, who am I and where am I? What is the weather like?")
    print("\n--- FINAL RESPONSE ---")
    print(response)

if __name__ == "__main__":
    test_agent()
