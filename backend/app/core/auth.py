import os
from datetime import timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.models import User, utcnow

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=7)

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Add it to the backend environment.")

bearer = HTTPBearer(auto_error=False)
_google_request = google_requests.Request()


def create_access_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id, "exp": utcnow() + TOKEN_TTL}, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def verify_google_credential(credential: str) -> dict:
    """Checks the Google ID token's signature, expiry and audience (our client ID)."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google sign-in isn’t configured on the server (GOOGLE_CLIENT_ID).")
    try:
        info = await run_in_threadpool(id_token.verify_oauth2_token, credential, _google_request, GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google sign-in failed. Try again.")
    if not info.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Verify your Google email address first.")
    return info


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Log in to continue.")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session expired. Log in again.")
    user = await session.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your account no longer exists. Log in again.")
    return user
