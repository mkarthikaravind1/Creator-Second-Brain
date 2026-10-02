"""Thin Gemini wrapper: JSON-mode chat with rate-limit backoff and JSON retry, plus shared error mapping."""

import json
import re
import threading
import time

import httpx
from google import genai
from google.genai import errors, types
from langsmith import traceable
from langsmith.run_helpers import get_current_run_tree

from config import settings


class LLMConfigError(Exception):
    pass


class LLMError(Exception):
    pass


class LLMDailyLimit(LLMError):
    """Gemini's requests-per-day quota is used up — retrying within minutes can't help."""


_client: genai.Client | None = None
_lock = threading.Lock()


def _get_client() -> genai.Client:
    global _client
    if not settings.gemini_api_key:
        raise LLMConfigError("GEMINI_API_KEY is not set in .env")
    with _lock:
        if _client is None:
            _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def thinking(model: str) -> dict:
    """Keep hidden reasoning short: it is billed as output tokens and slows every call."""
    if model.startswith("gemini-2.5"):
        return {"thinking_budget": 1024}
    if model.startswith("gemini-3"):
        return {"thinking_level": "low"}
    return {}


# ---------- error classification (shared with agents/llm.py) ----------


def google_error(err: BaseException) -> errors.APIError | None:
    """The Gemini SDK error behind `err` — LangChain wraps it in its own exception types."""
    seen = 0
    while err is not None and seen < 5:
        if isinstance(err, errors.APIError):
            return err
        err = err.__cause__ or err.__context__
        seen += 1
    return None


def is_daily_limit(err: BaseException) -> bool:
    g = google_error(err)
    return g is not None and g.code == 429 and "PerDay" in str(g)


def is_transient(err: BaseException) -> bool:
    if is_daily_limit(err):
        return False
    if isinstance(err, (httpx.TransportError, ConnectionError)):
        return True
    g = google_error(err)
    return g is not None and (g.code == 429 or g.code >= 500)


def as_app_error(err: Exception) -> Exception:
    """Map Gemini errors onto the errors the API layer already turns into HTTP responses."""
    if isinstance(err, (LLMConfigError, LLMError)):
        return err
    if isinstance(err, (httpx.TransportError, ConnectionError)):
        return LLMError("Could not reach Gemini — check your internet connection.")
    g = google_error(err)
    if g is None:
        return err
    text = str(g)
    if g.code in (401, 403) or "API key not valid" in text or "API_KEY_INVALID" in text:
        return LLMConfigError("GEMINI_API_KEY is invalid")
    if g.code == 404:
        return LLMConfigError(
            "Gemini model not available — set LLM_MODEL / LLM_FAST_MODEL in .env "
            "to a model listed at ai.google.dev/gemini-api/docs/models"
        )
    if is_daily_limit(err):
        return LLMDailyLimit(
            "Gemini's daily request quota for this model is used up — it resets at midnight Pacific time. "
            "Try again then, switch LLM_MODEL in .env to another model, or enable billing on the Gemini key."
        )
    if g.code == 429:
        return LLMError("Gemini rate limit: gave up after repeated retries. Wait a minute and try again.")
    return LLMError(f"Gemini error ({g.code}): {text}")


def _retry_after(err: errors.APIError, attempt: int) -> float:
    """Gemini puts the wait in the message ("Please retry in 21.5s")."""
    wait = re.search(r"retry in ([0-9.]+)s", str(err))
    if wait:
        return min(float(wait.group(1)) + 1, 90)
    return min(5 * 2**attempt, 90)


def _as_messages(inputs: dict) -> dict:
    """Show the call as a system + user chat in LangSmith, like a LangChain chat model run."""
    return {
        "messages": [
            {"role": "system", "content": inputs.get("system", "")},
            {"role": "user", "content": inputs.get("user", "")},
        ]
    }


def _trace_model(model: str, temperature: float, max_tokens: int) -> None:
    """Model badge and settings on the LangSmith run (the same keys LangChain chat models report)."""
    if run := get_current_run_tree():
        run.metadata.update(
            ls_provider="google_genai",
            ls_model_name=model,
            ls_model_type="chat",
            ls_temperature=temperature,
            ls_max_tokens=max_tokens,
        )


def _trace_usage(resp) -> None:
    """Token counts on the LangSmith run; thinking tokens are billed as output."""
    usage, run = resp.usage_metadata, get_current_run_tree()
    if usage and run:
        prompt = usage.prompt_token_count or 0
        output = (usage.candidates_token_count or 0) + (usage.thoughts_token_count or 0)
        run.set(usage_metadata={"input_tokens": prompt, "output_tokens": output, "total_tokens": prompt + output})


@traceable(name="Gemini", run_type="llm", process_inputs=_as_messages)
def chat_json(
    system: str,
    user: str,
    model: str | None = None,
    max_tokens: int = 2048,
    temperature: float = 0.2,
    attempts: int = 8,
) -> dict:
    """Call Gemini in JSON mode and return the parsed object."""
    client = _get_client()
    model = model or settings.llm_model
    think = thinking(model)
    if think:
        # thinking tokens count against the output budget
        max_tokens += 2000
    config = types.GenerateContentConfig(
        system_instruction=system,
        response_mime_type="application/json",
        temperature=temperature,
        max_output_tokens=max_tokens,
        thinking_config=types.ThinkingConfig(**think) if think else None,
    )
    _trace_model(model, temperature, max_tokens)
    bad_json = 0
    for attempt in range(attempts):
        try:
            resp = client.models.generate_content(model=model, contents=user, config=config)
        except errors.APIError as e:
            if is_transient(e):
                time.sleep(_retry_after(e, attempt) if e.code == 429 else 3 * (attempt + 1))
                continue
            raise as_app_error(e) from e
        except httpx.TransportError:
            time.sleep(3 * (attempt + 1))
            continue

        _trace_usage(resp)
        try:
            return json.loads(resp.text or "")
        except json.JSONDecodeError:
            bad_json += 1
            if bad_json > 2:
                raise LLMError("Model returned invalid JSON three times")
    raise LLMError("Gemini rate limit: gave up after repeated retries")
