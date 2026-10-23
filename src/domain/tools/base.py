"""Base interfaces and registry for screening agent tools."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, TypeVar

from src.domain.models import ActionInput

T = TypeVar("T", bound="BaseTool")


class BaseTool(ABC):
    """Abstract interface for autonomous agent tools."""

    name: str
    action_type: str

    @abstractmethod
    async def run(self, action_input: ActionInput, context: dict[str, Any] | None = None) -> Any:
        """Executes the tool with a strongly-typed ActionInput and optional execution context."""
        ...


class ToolRegistry:
    """Registry managing available tools indexed by action_type and tool name."""

    def __init__(self) -> None:
        self._tools_by_action_type: dict[str, BaseTool] = {}
        self._tools_by_name: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        self._tools_by_action_type[tool.action_type] = tool
        self._tools_by_name[tool.name] = tool

    def get(self, key: str) -> BaseTool | None:
        """Retrieves a tool by action_type or tool name."""
        return self._tools_by_action_type.get(key) or self._tools_by_name.get(key)

    async def execute(self, action_input: ActionInput, context: dict[str, Any] | None = None) -> Any:
        """Dispatches an ActionInput to its registered tool."""
        action_type = getattr(action_input, "action_type", None)
        if not action_type or action_type not in self._tools_by_action_type:
            raise KeyError(f"No tool registered for action_type: {action_type}")
        tool = self._tools_by_action_type[action_type]
        return await tool.run(action_input, context=context)

    def list_tools(self) -> list[str]:
        return list(self._tools_by_name.keys())


default_registry = ToolRegistry()


def agent_tool(action_type: str | None = None) -> Callable[[type[T]], type[T]]:
    """Decorator to register a tool class into the default registry."""

    def decorator(cls: type[T]) -> type[T]:
        instance = cls()
        if action_type:
            instance.action_type = action_type
        default_registry.register(instance)
        return cls

    return decorator
