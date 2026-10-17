import os
from collections.abc import AsyncGenerator
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:postgres@localhost:5432/unbound"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_size=10,
    max_overflow=20
)

async_session_maker = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

# create_all only creates missing tables; columns added to existing tables go here.
# Each statement must be idempotent.
MIGRATIONS = [
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS plan_id VARCHAR",
    "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR NOT NULL DEFAULT 'user'",
    "CREATE INDEX IF NOT EXISTS ix_tasks_plan_id ON tasks (plan_id)",
    "ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS provider VARCHAR NOT NULL DEFAULT 'anthropic'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS nationality_code VARCHAR NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_code VARCHAR NOT NULL DEFAULT ''",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS travel_purpose VARCHAR NOT NULL DEFAULT 'tourism'",
    "ALTER TABLE country_guidelines ADD COLUMN IF NOT EXISTS entry_type VARCHAR",
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        for statement in MIGRATIONS:
            await conn.execute(text(statement))

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session