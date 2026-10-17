FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# DejaVu: a Unicode font for writing names with accents or Cyrillic onto PDF forms.
RUN apt-get update && apt-get install -y --no-install-recommends curl fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements.txt
# Dev images also get the test tools (docker-compose.yml sets DEV=1).
ARG DEV=0
RUN if [ "$DEV" = "1" ]; then pip install -r requirements-dev.txt; fi

COPY . .
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/api/health || exit 1

# One process: SSE chat streams and the per-conversation lock live in memory.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
