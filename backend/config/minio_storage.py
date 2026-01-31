import os
from urllib.parse import urljoin
from datetime import timedelta

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from minio.error import S3Error

from config.minio import get_minio_client, MINIO_BUCKET, MINIO_ENDPOINT, MINIO_USE_SSL, MINIO_ACCESS_KEY, MINIO_SECRET_KEY


@deconstructible
class MinioMediaStorage(Storage):
    """Minimal MinIO-backed storage for user-uploaded media."""

    def __init__(self):
        self.client = get_minio_client()
        self.bucket = getattr(settings, "MINIO_MEDIA_BUCKET", MINIO_BUCKET)
        self.auto_create_bucket = getattr(settings, "MINIO_AUTO_CREATE_BUCKET", True)
        self.base_url = getattr(settings, "MINIO_MEDIA_BASE_URL", None)

        if not self.base_url:
            scheme = "https" if MINIO_USE_SSL else "http"
            self.base_url = f"{scheme}://{MINIO_ENDPOINT}"

        if self.auto_create_bucket:
            self._ensure_bucket()

    def _ensure_bucket(self):
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def _open(self, name, mode="rb"):
        response = self.client.get_object(self.bucket, name)
        data = response.read()
        response.close()
        response.release_conn()
        return ContentFile(data)

    def _save(self, name, content):
        content.seek(0)
        size = getattr(content, "size", None)
        if size is None:
            content.seek(0, os.SEEK_END)
            size = content.tell()
            content.seek(0)
        content_type = getattr(content, "content_type", "application/octet-stream")
        self.client.put_object(
            bucket_name=self.bucket,
            object_name=name,
            data=content,
            length=size,
            content_type=content_type,
        )
        return name

    def delete(self, name):
        try:
            self.client.remove_object(self.bucket, name)
        except S3Error:
            pass

    def exists(self, name):
        try:
            self.client.stat_object(self.bucket, name)
            return True
        except S3Error:
            return False

    def size(self, name):
        try:
            stat = self.client.stat_object(self.bucket, name)
            return stat.size
        except S3Error:
            return 0

    def url(self, name):
        """Generate a presigned URL for accessing private objects."""
        clean_name = name.lstrip("/")
        try:
            # Generate presigned URL valid for 7 days (for profile images)
            presigned_url = self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=clean_name,
                expires=timedelta(days=7)
            )
            return presigned_url
        except S3Error:
            # Fallback to direct URL if presigned fails
            return f"{self.base_url}/{self.bucket}/{clean_name}"

    def listdir(self, path):
        # Minimal implementation to satisfy Storage API
        files, dirs = [], []
        prefix = path.rstrip("/") + "/" if path else ""
        for obj in self.client.list_objects(self.bucket, prefix=prefix, recursive=False):
            item = obj.object_name[len(prefix):] if prefix else obj.object_name
            if item.endswith('/'):
                dirs.append(item.rstrip('/'))
            else:
                files.append(item)
        return dirs, files
