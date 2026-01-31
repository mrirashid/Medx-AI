from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.http import FileResponse
import io


from apps.patients.permissions import IsDoctor
from apps.documents.models import Document
from apps.documents.serializers import (
    DocumentSerializer,
    DocumentUploadSerializer,
    DocumentDetailSerializer
)

from .storage import delete_from_storage
from .storage import download_from_storage
from apps.activities.views import log_activity
from apps.activities.models import Activity



class CaseDocumentListView(APIView):
    """
    GET /api/v1/cases/<case_id>/documents/

    Returns all documents for a given case
    (doctor must own the patient).
    """
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, case_id):
        docs = Document.objects.filter(
            case_id=case_id,
            is_deleted=False,
        ).order_by("-created_at")

        serializer = DocumentSerializer(docs, many=True)
        return Response(serializer.data)


class CaseDocumentUploadView(APIView):
    """
    POST /api/v1/cases/<case_id>/documents/upload/

    Accepts multipart/form-data:
    - file: binary
    - kind: one of Document.Kind

    """
    permission_classes = [IsAuthenticated, IsDoctor]

    def post(self, request, case_id):
        serializer = DocumentUploadSerializer(
            data=request.data,
            context={"request": request, "case_id": case_id},
        )
        serializer.is_valid(raise_exception=True)
        document = serializer.save()
        
        # Log document upload activity
        log_activity(
            user=request.user,
            action=Activity.ACTION_CREATE,
            entity_type=Activity.ENTITY_DOCUMENT,
            entity_id=document.id,
            details={
                'kind': document.kind,
                'filename': document.original_filename,
                'case_id': str(case_id),
                'size_bytes': document.size_bytes,
                'entity_name': f'document {document.original_filename}'
            },
            request=request
        )



        out = DocumentSerializer(document)
        return Response(out.data, status=status.HTTP_201_CREATED)

class DocumentDetialsView(APIView):
    """
    GET /api/v1/cases/<case_id>/documents/<document_id>/

    Returns details of a specific document for a given case
    (doctor must own the patient).
    """
    permission_classes = [IsAuthenticated, IsDoctor]

    def get(self, request, case_id, document_id):
        try:
            doc = Document.objects.get(
                id=document_id,
                case_id=case_id,
            )
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = DocumentDetailSerializer(doc)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentDeleteView(APIView):
    def delete(self, request, case_id, document_id):
        try:
            doc = Document.objects.get(id=document_id, case_id=case_id)
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. delete from storage
        deleted = delete_from_storage(doc.object_key)

        # 2. Log activity before deletion
        log_activity(
            user=request.user,
            action=Activity.ACTION_DELETE,
            entity_type=Activity.ENTITY_DOCUMENT,
            entity_id=doc.id,
            details={
                'filename': doc.original_filename,
                'kind': doc.kind,
                'case_id': str(case_id),
                'entity_name': f'document {doc.original_filename}'
            },
            request=request
        )

        # 3. delete DB record
        doc.hard_delete()

        return Response(
            {"status": "deleted", "storage_deleted": deleted},
            status=status.HTTP_200_OK
        )


class DocumentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, case_id, document_id):
        try:
            doc = Document.objects.get(id=document_id, case_id=case_id)
        except Document.DoesNotExist:
            return Response(
                {"error": "Document not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        file_bytes = download_from_storage(doc.object_key)

        return FileResponse(
            io.BytesIO(file_bytes),
            as_attachment=True,
            filename=doc.original_filename or "download",
            content_type=doc.mime_type,
        )

