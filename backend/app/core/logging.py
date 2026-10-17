import logging
import os


def setup_logging() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO").upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # Request bodies and keys never belong in logs; keep HTTP client chatter down.
    for noisy in ("httpx", "httpcore", "google_genai", "anthropic"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
