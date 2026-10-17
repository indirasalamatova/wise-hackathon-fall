import os
import aioboto3
from fastapi import UploadFile
from botocore.exceptions import ClientError

S3_ENDPOINT_URL = os.getenv("S3_ENDPOINT_URL", "http://storage:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY_ID", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_ACCESS_KEY", "minioadmin")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "unbound-docs")

session = aioboto3.Session()

class StorageService:
    @staticmethod
    async def ensure_bucket_exists() -> None:
        async with session.client(
            "s3",
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
        ) as s3:
            try:
                await s3.head_bucket(Bucket=S3_BUCKET_NAME)
            except ClientError:
                await s3.create_bucket(Bucket=S3_BUCKET_NAME)

    @staticmethod
    async def save_upload(file: UploadFile, doc_id: str) -> str:
        await StorageService.ensure_bucket_exists()
        ext = os.path.splitext(file.filename or "")[1]
        object_key = f"documents/{doc_id}{ext}"

        file_bytes = await file.read()

        async with session.client(
            "s3",
            endpoint_url=S3_ENDPOINT_URL,
            aws_access_key_id=S3_ACCESS_KEY,
            aws_secret_access_key=S3_SECRET_KEY,
        ) as s3:
            await s3.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=object_key,
                Body=file_bytes,
                ContentType=file.content_type or "application/octet-stream"
            )

        return f"{S3_BUCKET_NAME}/{object_key}"