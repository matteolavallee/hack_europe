import pytest
from unittest.mock import patch, MagicMock
from app.services.agent_service import process_user_message

@patch("app.tools.schedule_reminder.json_store_service")
@patch("app.tools.write_log.json_store_service")
def test_agent_understands_complex_query(mock_log_store, mock_reminder_store):
    # Setup mocks to return empty lists initially
    mock_log_store.get_health_logs.return_value = []
    mock_log_store.lock = MagicMock()
    
    mock_reminder_store.get_calendar_items.return_value = []
    mock_reminder_store.lock = MagicMock()

    # User complex message
    message = "J'ai mal à la tête depuis ce matin et je dois prendre mon doliprane à 18h."
    session_id = "test_session_tools_1"

    # Agent processing
    # The agent should use `write_health_log` to note the headache
    # and `schedule_reminder` for the doliprane at 18:00
    response = process_user_message(session_id, message)

    print("Agent Response:", response)
    
    # Assert tools were used
    assert mock_log_store.save_health_logs.called, "write_health_log should have been called."
    assert mock_reminder_store.save_calendar_items.called, "schedule_reminder should have been called."

    # Inspect data passed to save_health_logs
    saved_logs = mock_log_store.save_health_logs.call_args[0][0]
    assert len(saved_logs) == 1
    # We expect something mentioning "headache" or "mal à la tête" somewhere in the log
    log = saved_logs[0]
    assert log["mood"] or log["notes"] # checking they didn't leave it completely blank

    # Inspect data passed to save_calendar_items
    saved_reminders = mock_reminder_store.save_calendar_items.call_args[0][0]
    assert len(saved_reminders) == 1
    reminder = saved_reminders[0]
    assert reminder["title"] is not None
    assert "18" in reminder["scheduled_at"] or "18h" in reminder["scheduled_at"] or "18:00" in reminder["scheduled_at"]

if __name__ == "__main__":
    test_agent_understands_complex_query()
    print("Test passed manually!")
