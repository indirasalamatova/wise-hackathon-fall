import os

import aioboto3
from botocore.exceptions import ClientError

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://storage:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY_ID", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "minioadmin")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "unbound-docs")

session = aioboto3.Session()


def _client():
    return session.client(
        "s3",
        endpoint_url=S3_ENDPOINT_URL,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
    )


class StorageService:
    @staticmethod
    async def ensure_bucket_exists() -> None:
        async with _client() as s3:
            try:
                await s3.head_bucket(Bucket=S3_BUCKET_NAME)
            except ClientError:
                await s3.create_bucket(Bucket=S3_BUCKET_NAME)

    @staticmethod
    async def put(key: str, data: bytes, content_type: str) -> None:
        async with _client() as s3:
            await s3.put_object(Bucket=S3_BUCKET_NAME, Key=key, Body=data, ContentType=content_type)

    @staticmethod
    async def get(key: str) -> bytes:
        async with _client() as s3:
            obj = await s3.get_object(Bucket=S3_BUCKET_NAME, Key=key)
            async with obj["Body"] as body:
                return await body.read()

    @staticmethod
    async def delete(key: str) -> None:
        async with _client() as s3:
            await s3.delete_object(Bucket=S3_BUCKET_NAME, Key=key)
