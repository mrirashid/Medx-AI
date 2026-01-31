import uuid
from django.conf import settings
from minio import Minio
from supabase import create_client
import io




def generate_case_object_key(case_id, original_filename):
    """
    cases/<case_uuid>/uploads/<random>.ext
    """
    ext = original_filename.split(".")[-1]
    return f"cases/{case_id}/uploads/{uuid.uuid4()}.{ext}"



# AUTO SELECT STORAGE: MinIO (dev) or Supabase (prod)

def upload_to_storage(file_bytes, object_key, content_type):
    if getattr(settings, "USE_SUPABASE", False):
        return _upload_to_supabase(file_bytes, object_key, content_type)
    return _upload_to_minio(file_bytes, object_key, content_type)

def delete_from_storage(object_key: str) -> bool:
    if getattr(settings, "USE_SUPABASE", False):
        return delete_from_supabase(object_key)
    return delete_from_minio(object_key)

def download_from_storage(object_key: str) -> bytes:
    """
    Download a file from MinIO (dev) or Supabase (prod).
    Returns raw bytes.

    Raises:
        FileNotFoundError
        Exception
    """
    if getattr(settings, "USE_SUPABASE", False):
        return _download_from_supabase(object_key)
    return _download_from_minio(object_key)

# MinIO

def _upload_to_minio(file_bytes, object_key, content_type):
    client = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )

    client.put_object(
        settings.MINIO_BUCKET,
        object_key,
        data=io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type=content_type,
    )

    return type("Obj", (), {"object_key": object_key})

def delete_from_minio(object_key: str) -> bool:
    try:
        from minio import Minio

        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )

        client.remove_object(settings.MINIO_BUCKET, object_key)
        return True

    except Exception as e:
        logger.exception("MinIO delete failed: %s", e)
        return False

def _download_from_minio(object_key: str) -> bytes:
    import io
    from minio import Minio

    client = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )

    try:
        response = client.get_object(settings.MINIO_BUCKET, object_key)
        file_bytes = response.read()
        response.close()
        response.release_conn()
        return file_bytes
    except Exception as e:
        raise FileNotFoundError(f"MinIO download failed: {e}")





# Supabase

def _upload_to_supabase(file_bytes, object_key, content_type):
    supabase = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_KEY,
    )

    supabase.storage.from_(settings.SUPABASE_BUCKET).upload(
        object_key, file_bytes, file_options={"content-type": content_type}
    )

    return type("Obj", (), {"object_key": object_key})

def delete_from_supabase(object_key: str) -> bool:
    try:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        res = client.storage.from_(settings.SUPABASE_BUCKET).remove([object_key])

        # Successful deletion returns empty list
        return res == []
    except Exception as e:
        logger.exception("Supabase delete failed: %s", e)
        return False

def _download_from_supabase(object_key: str) -> bytes:
    from supabase import create_client

    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

    try:
        res = supabase.storage.from_(settings.SUPABASE_BUCKET).download(object_key)
        return res
    except Exception as e:
        raise FileNotFoundError(f"Supabase download failed: {e}")


def get_presigned_url(object_key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for accessing an object.
    
    Args:
        object_key: The key of the object in storage
        expires_in: URL expiration time in seconds (default: 1 hour)
        
    Returns:
        Presigned URL string
    """
    if getattr(settings, "USE_SUPABASE", False):
        return _get_supabase_url(object_key, expires_in)
    return _get_minio_presigned_url(object_key, expires_in)


def _get_minio_presigned_url(object_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for MinIO object access"""
    from datetime import timedelta
    
    client = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_USE_SSL,
    )
    
    try:
        url = client.presigned_get_object(
            settings.MINIO_BUCKET,
            object_key,
            expires=timedelta(seconds=expires_in)
        )
        return url
    except Exception as e:
        raise Exception(f"Failed to generate presigned URL: {e}")


def _get_supabase_url(object_key: str, expires_in: int = 3600) -> str:
    """Generate a signed URL for Supabase storage access"""
    from supabase import create_client
    
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    try:
        result = supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(
            object_key, 
            expires_in
        )
        return result.get('signedURL', '')
    except Exception as e:
        raise Exception(f"Failed to generate Supabase signed URL: {e}")