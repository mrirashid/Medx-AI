

from django.urls import path

from apps.documents.views import (
    CaseDocumentListView,
    CaseDocumentUploadView,
    DocumentDeleteView,
    DocumentDetialsView,
    DocumentDownloadView

)

urlpatterns = [
    path(
        "cases/<uuid:case_id>/documents/",
        CaseDocumentListView.as_view(),
        name="case-documents-list",
    ),
    path(
        "cases/<uuid:case_id>/documents/upload/",
        CaseDocumentUploadView.as_view(),
        name="case-documents-upload",
    ),
    path(
        "cases/<uuid:case_id>/documents/<uuid:document_id>/",
        DocumentDetialsView.as_view(),
        name="documents-detail",
    ),
    path(
    "cases/<uuid:case_id>/documents/<uuid:document_id>/",
    DocumentDeleteView.as_view(),
    name="document-delete"
),
    path(
        "cases/<uuid:case_id>/documents/<uuid:document_id>/download/",
        DocumentDownloadView.as_view(),
        name="document-download"
    )

]
