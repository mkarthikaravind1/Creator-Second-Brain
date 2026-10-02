"""ChatGoogleGenerativeAI factory for the agents, plus the middleware every agent shares."""

from functools import lru_cache

from langchain.agents.middleware import (
    ClearToolUsesEdit,
    ContextEditingMiddleware,
    ModelCallLimitMiddleware,
    ModelRetryMiddleware,
    ToolCallLimitMiddleware,
)
from langchain_google_genai import ChatGoogleGenerativeAI

from ai.llm import LLMConfigError, as_app_error, is_transient, thinking
from config import settings

__all__ = ["as_app_error", "chat_model", "guardrails"]


@lru_cache(maxsize=8)
def chat_model(fast: bool = False, temperature: float = 0.2, streaming: bool = False) -> ChatGoogleGenerativeAI:
    """Main model (reasoning, answers) or fast model (bulk verification). Only the Brain's reply streams;
    specialists make plain calls so their output never mixes into the chat stream."""
    if not settings.gemini_api_key:
        raise LLMConfigError("GEMINI_API_KEY is not set in .env")
    model = settings.llm_fast_model if fast else settings.llm_model
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
        max_output_tokens=settings.agent_max_output_tokens,
        # the SDK retries short 429s / 5xx itself; ModelRetryMiddleware covers longer throttling
        max_retries=4,
        disable_streaming=not streaming,
        **thinking(model),
    )


def guardrails(model_calls: int, tool_calls: int) -> list:
    """Stop runaway loops (every loop costs rate limit), keep each request inside the token budget,
    and retry transient API failures."""
    return [
        # every step resends the whole conversation; once it grows past the budget, replace all but the
        # two latest tool results with a placeholder (the task prompt and the agent's own reasoning stay)
        ContextEditingMiddleware(edits=[ClearToolUsesEdit(trigger=settings.agent_context_tokens, keep=2)]),
        ModelRetryMiddleware(
            max_retries=3,
            retry_on=is_transient,
            on_failure="error",
            initial_delay=5.0,
            max_delay=60.0,
        ),
        ModelCallLimitMiddleware(run_limit=model_calls, exit_behavior="end"),
        ToolCallLimitMiddleware(run_limit=tool_calls, exit_behavior="continue"),
    ]
