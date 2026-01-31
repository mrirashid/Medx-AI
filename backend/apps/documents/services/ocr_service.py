from __future__ import annotations
import base64
import io
import logging
from typing import Optional
import requests
from django.conf import settings
from docx import Document as DocxDocument
from pypdf import PdfReader
from PIL import Image


logger = logging.getLogger(__name__)



# Helpers: read config from settings

def _get_openrouter_api_key() -> Optional[str]:
    return getattr(settings, "OPENROUTER_API_KEY", None)


def _get_openrouter_model() -> str:
    return getattr(
        settings,
        "OPENROUTER_MODEL",
        "qwen/qwen2.5-vl-32b-instruct:free",
    )


def _get_openrouter_url() -> str:
    return getattr(
        settings,
        "OPENROUTER_API_URL",
        "https://openrouter.ai/api/v1/chat/completions",
    )



# 1) PDF TEXT EXTRACTOR (bytes → text)

def _extract_pdf_text(file_bytes: bytes) -> str:
    """
    Extract text from a PDF file given as bytes.
    Equivalent to your Colab extract_pdf_text(path), but backend-safe.
    """
    try:
        buffer = io.BytesIO(file_bytes)
        reader = PdfReader(buffer)
        text_chunks: list[str] = []

        for page in reader.pages:
            page_text = page.extract_text() or ""
            text_chunks.append(page_text)

        return "\n".join(text_chunks).strip()
    except Exception as e:
        logger.exception("PDF OCR: failed to extract text: %s", e)
        return ""



# 2) DOCX TEXT EXTRACTOR (bytes → text)

def _extract_docx_text(file_bytes: bytes) -> str:
    """
    Extract text from a DOCX file given as bytes.
    Equivalent to your Colab extract_docx_text(path), but backend-safe.
    """
    try:
        buffer = io.BytesIO(file_bytes)
        doc = DocxDocument(buffer)
        paragraphs = [p.text for p in doc.paragraphs if p.text]
        return "\n".join(paragraphs).strip()
    except Exception as e:
        logger.exception("DOCX OCR: failed to extract text: %s", e)
        return ""



# 3) IMAGE OCR USING QWEN + OPENROUTER (bytes to text)

def _qwen_ocr_image_bytes(file_bytes: bytes, mime_type: str) -> str:
    """
    Run OCR on image bytes using Qwen via OpenRouter.
    Does NOT convert to PNG — uses original image format (jpeg, png, webp, etc.).
    """

    api_key = _get_openrouter_api_key()
    if not api_key:
        logger.warning("OpenRouter API key missing — skipping OCR")
        return ""

    # Base64 encode original bytes (whatever the image type is)
    base64_img = base64.b64encode(file_bytes).decode("utf-8")

    # Build a proper data URL
    # Example: "data:image/jpeg;base64,<...>"
    data_url = f"data:{mime_type};base64,{base64_img}"

    payload = {
        "model": _get_openrouter_model(),
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract all text from this medical document/image. Return ONLY the text.",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url},
                    },
                ],
            }
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            _get_openrouter_url(),
            headers=headers,
            json=payload,
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()

        content = data["choices"][0]["message"]["content"]

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            parts = [block.get("text", "") for block in content if block.get("type") == "text"]
            return "\n".join(parts).strip()

        return ""

    except Exception as e:
        logger.exception("Qwen OCR failed: %s", e)
        return ""



# SCANNED PDF to IMAGES to QWEN OCR

def _ocr_pdf_via_openrouter(file_bytes: bytes) -> str:
    """
    OCR SCANNED PDFs using OpenRouter's PDF processing engine.
    One single request.
    """

    api_key = getattr(settings, "OPENROUTER_API_KEY", None)
    if not api_key:
        logger.warning("OpenRouter API key missing — skipping PDF OCR.")
        return ""

    # Base64 encode the PDF document
    base64_pdf = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:application/pdf;base64,{base64_pdf}"

    # Build the payload according to OpenRouter docs
    payload = {
        "model": getattr(settings, "OPENROUTER_PDF_MODEL", "qwen/qwen2.5-vl-32b-instruct:free"),

        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Extract ALL text from this scanned PDF. "
                            "Return ONLY the text, no explanations."
                        )
                    },
                    {
                        "type": "file",
                        "file": {
                            "filename": "document.pdf",
                            "file_data": data_url
                        }
                    }
                ]
            }
        ],

        # Use a strong OCR engine for scanned PDFs
        "plugins": [
            {
                "id": "file-parser",
                "pdf": {
                    "engine": "mistral-ocr"       # BEST for scanned documents
                },
            },
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(
            getattr(settings, "OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions"),
            headers=headers,
            json=payload,
            timeout=120,
        )
        resp.raise_for_status()

        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            parts = [block.get("text", "") for block in content if block.get("type") == "text"]
            return "\n".join(parts).strip()

        return ""

    except Exception as e:
        logger.exception("OpenRouter PDF OCR failed: %s", e)
        return ""



# 4) PUBLIC ENTRYPOINT – used by serializers/views

def extract_ocr_text(file_bytes: bytes, mime_type: str) -> str:
    """
    Main function called from DocumentUploadSerializer.

    Decides which extractor to use based on MIME type:
      - PDFs  → pypdf
      - DOC/DOCX → python-docx
      - Images → Qwen OCR via OpenRouter
      - Other types → returns "" (no OCR)
    """
    if not file_bytes:
        return ""

    mime_type = (mime_type or "").lower().strip()

    try:
        # ----- PDF -----
        if mime_type == "application/pdf":
        # Try digital PDF parsing
            text = _extract_pdf_text(file_bytes)

            # If empty , scanned PDF , use OpenRouter PDF OCR
            if not text.strip():
                return _ocr_pdf_via_openrouter(file_bytes)

            return text

        # ----- WORD (DOC / DOCX) -----
        if mime_type in (
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ):
            return _extract_docx_text(file_bytes)

        # ----- IMAGES (for medical history scans / reports) -----
        if mime_type.startswith("image/"):
            return _qwen_ocr_image_bytes(file_bytes, mime_type=mime_type)

      
        logger.info("OCR: Unsupported MIME type for OCR: %s", mime_type)
        return ""
    except Exception as e:
        logger.exception("OCR: unexpected failure while extracting text: %s", e)
        return ""
