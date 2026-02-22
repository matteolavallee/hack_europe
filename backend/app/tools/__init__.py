"""
Tool registry for the CareLoop agent.

To add a new tool to the main agent:
  1. Create a .py file in this directory
  2. Decorate the tool function with @register_tool

Tools NOT decorated are excluded from the main agent (e.g. onboarding-only tools).
"""
from typing import Callable, List

_REGISTRY: List[Callable] = []


def register_tool(fn: Callable) -> Callable:
    """Decorator — registers a function as an agent tool."""
    _REGISTRY.append(fn)
    return fn


def get_registered_tools() -> List[Callable]:
    """Return all tools registered for the main agent."""
    return list(_REGISTRY)
