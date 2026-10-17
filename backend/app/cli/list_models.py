"""
List the Gemini models this GEMINI_API_KEY can call for text generation.

    docker exec unbound_backend python -m app.cli.list_models

Availability differs per key and project (older models are retired for new users,
previews may have no free quota), so check here before setting GEMINI_MODEL.
"""
import os
import sys

from google import genai

SKIP = ("tts", "image", "banana", "robotics", "computer-use", "transcribe", "omni")


def main() -> None:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY is not set")
    current = os.getenv("GEMINI_MODEL", "")
    client = genai.Client(api_key=key)  # keep a reference: the SDK closes unreferenced clients
    for m in client.models.list():
        name = m.name.removeprefix("models/")
        if "generateContent" in (m.supported_actions or []) and name.startswith("gemini") and not any(s in name for s in SKIP):
            print(f"{'*' if name == current else ' '} {name:32} {m.display_name}")


if __name__ == "__main__":
    main()
