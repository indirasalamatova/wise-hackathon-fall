from minio import Minio
import os

minio_client = Minio(
    "localhost:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

BUCKET_NAME = "unbound-documents"

def init_storage():
    if not minio_client.bucket_exists(BUCKET_NAME):
        minio_client.make_bucket(BUCKET_NAME)

def upload_file(file_path: str, object_name: str):
    init_storage()
    minio_client.fput_object(BUCKET_NAME, object_name, file_path)
    return minio_client.presigned_get_object(BUCKET_NAME, object_name)