"""
Model provider for every agent: Google Gemini or Anthropic Claude.

LLM_PROVIDER picks one ("gemini" or "anthropic"); without it, Gemini is used when
GEMINI_API_KEY is set, otherwise Claude. Everything above this layer (tools, rules,
guideline gate, SSE events) is provider-independent.
"""
from __future__ import annotations

import asyncio
import os
from typing import Literal, Optional

from anthropic import AsyncAnthropic

Provider = Literal["gemini", "anthropic"]

# Claude
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-5-5")
# Refusal fallback: if a safety classifier declines, the API re-runs the request on
# Anthropic's recommended fallback model instead of returning a refusal.
FALLBACK = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}

# Gemini. Flash fits the free tier's rate limits; an agent turn makes several calls.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
# One-shot calls (document reading, pipeline extraction) move to the next model when one is
# out of quota. Chat doesn't: a conversation's thinking signatures belong to one model.
GEMINI_FALLBACK_MODELS = [m.strip() for m in os.getenv("GEMINI_FALLBACK_MODELS", "gemini-3-flash-preview,gemini-flash-latest").split(",") if m.strip()]

_anthropic: Optional[AsyncAnthropic] = None
_gemini = None


class NotConfigured(RuntimeError):
    pass


def provider() -> Provider:
    chosen = os.getenv("LLM_PROVIDER", "").strip().lower()
    if chosen in ("gemini", "anthropic"):
        return chosen  # type: ignore[return-value]
    return "gemini" if os.getenv("GEMINI_API_KEY") else "anthropic"


def model_name() -> str:
    return GEMINI_MODEL if provider() == "gemini" else MODEL


def client() -> AsyncAnthropic:
    global _anthropic
    if not os.getenv("ANTHROPIC_API_KEY"):
        raise NotConfigured("The AI assistant isn’t configured on the server (ANTHROPIC_API_KEY).")
    if _anthropic is None:
        _anthropic = AsyncAnthropic()
    return _anthropic


def gemini():
    """google.genai client; use its .aio namespace for async calls."""
    global _gemini
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise NotConfigured("The AI assistant isn’t configured on the server (GEMINI_API_KEY).")
    if _gemini is None:
        from google import genai

        _gemini = genai.Client(api_key=key)
    return _gemini


def _quota_exhausted(e: Exception) -> bool:
    from google.genai import errors as gerrors

    return isinstance(e, gerrors.APIError) and (e.code == 429 or (e.status or "").upper() == "RESOURCE_EXHAUSTED")


OVERLOAD_RETRY_S = 8


def _overloaded(e: Exception) -> bool:
    from google.genai import errors as gerrors

    return isinstance(e, gerrors.APIError) and (e.code in (500, 503) or (e.status or "").upper() in ("UNAVAILABLE", "INTERNAL"))


async def gemini_generate(contents, config, model: Optional[str] = None):
    """generate_content with quota fallback across GEMINI_FALLBACK_MODELS. Returns (response, model used)."""
    models = [model or GEMINI_MODEL] + [m for m in GEMINI_FALLBACK_MODELS if m != (model or GEMINI_MODEL)]
    last: Optional[Exception] = None
    for m in models:
        for attempt in range(2):
            try:
                return await gemini().aio.models.generate_content(model=m, contents=contents, config=config), m
            except Exception as e:
                last = e
                if _overloaded(e) and attempt == 0:
                    await asyncio.sleep(OVERLOAD_RETRY_S)  # usually a short demand spike: retry once
                    continue
                if _quota_exhausted(e) or _overloaded(e):
                    break  # next model
                raise
    raise last  # every model is out of quota or overloaded


def describe_error(e: Exception) -> str:
    """A message the user can act on, for errors from either provider."""
    import anthropic
    from google.genai import errors as gerrors

    if isinstance(e, gerrors.APIError):
        status = (e.status or "").upper()
        if e.code in (401, 403) or status in ("UNAUTHENTICATED", "PERMISSION_DENIED"):
            return "The AI service rejected the server’s API key. Check GEMINI_API_KEY."
        if e.code == 429 or status == "RESOURCE_EXHAUSTED":
            return "The AI service quota is used up for now (free-tier limits). Wait a minute and try again."
        if e.code == 404:
            return f"The AI model “{GEMINI_MODEL}” isn’t available for this key. Set GEMINI_MODEL to one it can use."
        if isinstance(e, gerrors.ServerError):
            return "The AI service had an error. Try again in a moment."
        return "The assistant had a problem answering. Try again."

    msg = getattr(e, "message", "") or str(e)
    if isinstance(e, anthropic.AuthenticationError):
        return "The AI service rejected the server’s API key. Check ANTHROPIC_API_KEY."
    if isinstance(e, anthropic.PermissionDeniedError):
        return "The server’s API key isn’t allowed to use this model."
    if isinstance(e, anthropic.BadRequestError) and "credit balance" in msg.lower():
        return "The AI service account is out of credits. Add credits in the Claude Console (Plans & Billing), then try again."
    if isinstance(e, anthropic.RateLimitError):
        return "The assistant is busy right now. Try again in a minute."
    if isinstance(e, anthropic.APIConnectionError):
        return "Couldn’t reach the AI service. Try again in a moment."
    if isinstance(e, anthropic.InternalServerError):
        return "The AI service had an error. Try again in a moment."
    return "The assistant had a problem answering. Try again."
