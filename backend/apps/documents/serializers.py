from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.cases.models import Case
from apps.documents.models import Document
from apps.documents.storage import (
    upload_to_storage,
    generate_case_object_key,
)

from apps.documents.services.antivirus_service import scan_file_with_cloudmersive
from apps.documents.services.ocr_service import extract_ocr_text
from apps.documents.utils.mime_types import ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB

import os


User = get_user_model()


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = (
            "id",
            "case",
            "kind",
            "object_key",
            "original_filename",
            "mime_type",
            "size_bytes",
            "created_at",
        )
        read_only_fields = fields
        
class DocumentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = (
            "id",
            "case",
            "kind",
            "object_key",
            "original_filename",
            "mime_type",
            "size_bytes",
            "ocr_text",
            "created_at",
        )
        read_only_fields = fields

class DocumentUploadSerializer(serializers.Serializer):
    """
    Handles upload → AV scan → OCR → save metadata.
    Clean architecture: No OCR, AV, or storage logic lives here.
    """

    file = serializers.FileField()
    kind = serializers.ChoiceField(choices=Document.Kind.choices)

    def validate(self, attrs):
        request = self.context["request"]
        case_id = self.context["case_id"]

        user: User = request.user
        file_obj = attrs["file"]

        mime_type = file_obj.content_type
        size_bytes = file_obj.size

       
        # MIME VALIDATION
       
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValidationError({"file": f"Unsupported file type: {mime_type}"})

       
        # SIZE VALIDATION
       
        if size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise ValidationError(
                {"file": f"File exceeds {MAX_FILE_SIZE_MB} MB size limit."}
            )

       
        # FETCH CASE
       
        try:
            case = Case.objects.select_related(
                "patient__assigned_doctor"
            ).get(id=case_id, is_deleted=False)
        except Case.DoesNotExist:
            raise ValidationError({"case": "Invalid or deleted case."})

       
        # PERMISSIONS: Only doctor who owns this patient
       
        if user.role != "doctor":
            raise ValidationError("Only doctors can upload documents.")

        if case.patient.assigned_doctor_id != user.id:
            raise ValidationError(
                "You can upload documents only for cases of your assigned patients."
            )

        # Store validated inputs
        attrs["case"] = case
        attrs["mime_type"] = mime_type
        attrs["size_bytes"] = size_bytes
        attrs["original_filename"] = os.path.basename(file_obj.name)

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        case: Case = validated_data["case"]
        file_obj = validated_data["file"]

        # Read file bytes
        file_bytes = file_obj.read()

        
        # 1️ ANTIVIRUS SCAN (ClamAV)
        
        av_status = scan_file_with_cloudmersive(file_bytes)
        if av_status.startswith("infected"):
            raise ValidationError({"file": "This file contains a virus and cannot be uploaded."})


        
        # 2️ GENERATE STORAGE KEY (path)
        
        object_key = generate_case_object_key(
            case_id=case.id,
            original_filename=validated_data["original_filename"],
        )

        
        # 3️ UPLOAD TO MinIO or Supabase (automatically chosen)
        
        stored = upload_to_storage(
            file_bytes=file_bytes,
            object_key=object_key,
            content_type=validated_data["mime_type"],
        )

        
        # 4️ OCR (only if kind supports it)

        ocr_text = ""
        if validated_data["kind"] in [
            Document.Kind.MEDICAL_HISTORY,
            Document.Kind.REPORT,]:
            ocr_text = extract_ocr_text(file_bytes, validated_data["mime_type"])
        
      
        
        # 5️ CREATE DOCUMENT RECORD
        
        document = Document.objects.create(
            case=case,
            kind=validated_data["kind"],
            object_key=stored.object_key,
            original_filename=validated_data["original_filename"],
            mime_type=validated_data["mime_type"],
            size_bytes=validated_data["size_bytes"],
            ocr_text=ocr_text,
            created_by=request.user,
        )

        return document
