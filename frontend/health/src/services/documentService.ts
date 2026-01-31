import api from './api';

// Document types matching backend
export interface Document {
    id: string;
    case: string;
    kind: DocumentKind;
    object_key: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    ocr_text?: string;
    created_at: string;
}

export type DocumentKind = 'medical_history' | 'report' | 'consent' | 'image' | 'other';

export interface DocumentListResponse {
    count?: number;
    results?: Document[];
}

const documentService = {
    /**
     * Get all documents for a case
     * GET /api/v1/cases/{caseId}/documents/
     */
    getDocuments: async (caseId: string): Promise<Document[]> => {
        const response = await api.get<Document[]>(`/v1/cases/${caseId}/documents/`);
        return response.data;
    },

    /**
     * Upload a document to a case
     * POST /api/v1/cases/{caseId}/documents/upload/
     * 
     * @param caseId - The case ID to upload the document to
     * @param file - The file to upload
     * @param kind - The document type (medical_history, report, consent, image, other)
     */
    uploadDocument: async (
        caseId: string,
        file: File,
        kind: DocumentKind = 'medical_history'
    ): Promise<Document> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('kind', kind);

        const response = await api.post<Document>(
            `/v1/cases/${caseId}/documents/upload/`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        return response.data;
    },

    /**
     * Get a single document by ID
     * GET /api/v1/cases/{caseId}/documents/{documentId}/
     */
    getDocument: async (caseId: string, documentId: string): Promise<Document> => {
        const response = await api.get<Document>(
            `/v1/cases/${caseId}/documents/${documentId}/`
        );
        return response.data;
    },

    /**
     * Delete a document
     * DELETE /api/v1/cases/{caseId}/documents/{documentId}/
     */
    deleteDocument: async (caseId: string, documentId: string): Promise<void> => {
        await api.delete(`/v1/cases/${caseId}/documents/${documentId}/`);
    },

    /**
     * Download a document
     * GET /api/v1/cases/{caseId}/documents/{documentId}/download/
     */
    downloadDocument: async (caseId: string, documentId: string): Promise<Blob> => {
        const response = await api.get<Blob>(
            `/v1/cases/${caseId}/documents/${documentId}/download/`,
            {
                responseType: 'blob',
            }
        );
        return response.data;
    },
};

export default documentService;
