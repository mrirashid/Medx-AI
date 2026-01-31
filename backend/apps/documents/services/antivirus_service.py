# apps/documents/services/antivirus.py

import io
import logging
import tempfile
import os

import cloudmersive_virus_api_client
from cloudmersive_virus_api_client.rest import ApiException

from django.conf import settings

logger = logging.getLogger(__name__)


def scan_file_with_cloudmersive(file_bytes: bytes) -> str:
    api_key = getattr(settings, "CLOUDMERSIVE_API_KEY", "")
    if not api_key:
        return "not_scanned"

    try:
        # 1. Temp file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            temp_path = tmp.name

        # 2. Cloudmersive config
        configuration = cloudmersive_virus_api_client.Configuration()
        configuration.api_key["Apikey"] = api_key
        api_client = cloudmersive_virus_api_client.ApiClient(configuration)
        api_instance = cloudmersive_virus_api_client.ScanApi(api_client)

        # 3. SCAN USING THE FILE PATH
        result = api_instance.scan_file(temp_path)

        # 4. Cleanup
        os.remove(temp_path)

        # 5. Parse result
        if getattr(result, "CleanResult", False):
            return "clean"

        viruses = getattr(result, "FoundViruses", [])
        if viruses:
            names = ", ".join(v.VirusName for v in viruses)
            return f"infected:{names}"

        return "clean"

    except Exception as e:
        logger.error("Cloudmersive Antivirus Error: %s", e)
        try:
            os.remove(temp_path)
        except:
            pass

        return "error"
