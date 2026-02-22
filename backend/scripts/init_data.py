"""
Interactive Onboarding script for the datastore.

Responsibilities:
- Provide an interactive CLI for the onboarding process.
- Gather patient information dynamically via the LLM and the update_context_tool.
"""
import sys
import os
from pathlib import Path

# Add the project root to PYTHONPATH so we can run this directly
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))

from app.services.llm_service import create_onboarding_chat
from app.tools.update_context_tool import update_patient_context
from google.genai import types

def run_onboarding():
    print("=" * 60)
    print("      INTERACTIVE INITIALIZATION - PATIENT FILE      ")
    print("=" * 60)
    print("The digital assistant will now start the conversation.")
    print("Type 'quit' to exit at any time.\n")

    try:
        chat = create_onboarding_chat()
    except Exception as e:
        print(f"AI initialization error: {e}")
        return

    # Trigger initial greeting
    message = "Hello Doctor, I am ready for our first contact interview."
    
    while True:
        try:
            response = chat.send_message(message)
            
            # Resolve tool calls
            while response.function_calls:
                function_responses = []
                for fc in response.function_calls:
                    name = fc.name
                    args = dict(fc.args)
                    print(f"\n[!] BACKGROUND ACTION: Saving data... ({args})")
                    
                    if name == "update_patient_context":
                        try:
                            result = update_patient_context(**args)
                        except Exception as e:
                            result = {"error": str(e)}
                    else:
                        result = {"error": "Tool not found"}
                        
                    function_responses.append(
                        types.Part.from_function_response(name=name, response=result)
                    )
                
                # Resubmit the tool outcome to let the model reply
                response = chat.send_message(function_responses)
            
            # Print the AI's response
            print(f"\nDr. AI: {response.text}")

        except Exception as e:
            print(f"An error occurred during the conversation: {e}")
            break

        # Get user input
        message = input("\nYou: ")
        if message.lower().strip() in ["quit", "exit", "quitter"]:
            print("Interview finished.")
            break

if __name__ == "__main__":
    run_onboarding()
