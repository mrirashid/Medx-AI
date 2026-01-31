import api from './api';

// Types matching backend
export interface Case {
  id: string;
  case_code: string;
  patient: string; // Patient ID
  patient_name?: string;
  patient_code?: string;
  status: 'draft' | 'in_progress' | 'complete' | 'cancelled';
  risk_level: string | null;
  notes: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  has_prediction?: boolean;
  has_recommendation?: boolean;
}

export interface CaseListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Case[];
}

export interface CreateCaseData {
  patient: string; // Patient ID
  notes?: string;
}

export interface UpdateCaseData {
  status?: 'draft' | 'in_progress' | 'complete' | 'cancelled';
  risk_level?: string;
  notes?: string;
}

export interface CaseFilters {
  status?: 'draft' | 'in_progress' | 'complete' | 'cancelled';
  risk_level?: 'critical' | 'high' | 'medium' | 'low';
  patient?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

// Prediction types
export interface Prediction {
  id: string;
  case: string;
  her2_status: string;
  confidence: number;
  probabilities: Record<string, number>;
  risk_level: string;
  risk_score: number;
  gradcam_url: string | null;
  original_image_url: string | null;
  model_version: string;
  requested_by: string;
  created_at: string;
}

export interface PredictionListResponse {
  count: number;
  results: Prediction[];
}

// Recommendation types
export interface Recommendation {
  id: string;
  case: string;
  prediction: string;
  status: 'draft' | 'saved' | 'discarded';
  clinical_notes: string;
  recommendation_text: string;
  clinical_assessment: string;
  treatment_recommendations: string;
  followup_schedule: string;
  risk_mitigation: string;
  model_version: string;
  generated_by: string;
  created_at: string;
}

export interface RecommendationListResponse {
  count: number;
  results: Recommendation[];
}

// Extended recommendation type with case and patient info for pending recommendations
export interface PendingRecommendation extends Recommendation {
  case_code?: string;
  patient_name?: string;
}

export interface PendingRecommendationListResponse {
  count: number;
  results: PendingRecommendation[];
}

const caseService = {
  /**
   * Get all cases with optional filters
   * GET /api/v1/cases/
   */
  getCases: async (filters?: CaseFilters): Promise<CaseListResponse> => {
    const params = new URLSearchParams();

    if (filters?.status) params.append('status', filters.status);
    if (filters?.risk_level) params.append('risk_level', filters.risk_level);
    if (filters?.patient) params.append('patient', filters.patient);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const response = await api.get<CaseListResponse>(`/v1/cases/?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single case by ID
   * GET /api/v1/cases/{id}/
   */
  getCase: async (id: string): Promise<Case> => {
    const response = await api.get<Case>(`/v1/cases/${id}/`);
    return response.data;
  },

  /**
   * Create a new case
   * POST /api/v1/cases/
   */
  createCase: async (data: CreateCaseData): Promise<Case> => {
    const response = await api.post<Case>('/v1/cases/', data);
    return response.data;
  },

  /**
   * Update a case
   * PATCH /api/v1/cases/{id}/
   */
  updateCase: async (id: string, data: UpdateCaseData): Promise<Case> => {
    const response = await api.patch<Case>(`/v1/cases/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a case (soft delete)
   * DELETE /api/v1/cases/{id}/
   */
  deleteCase: async (id: string): Promise<void> => {
    await api.delete(`/v1/cases/${id}/`);
  },

  // ===== PREDICTIONS =====

  /**
   * Get all predictions for a case
   * GET /api/v1/cases/{caseId}/predictions/
   */
  getPredictions: async (caseId: string): Promise<PredictionListResponse> => {
    const response = await api.get<PredictionListResponse>(`/v1/cases/${caseId}/predictions/`);
    return response.data;
  },

  /**
   * Get a single prediction
   * GET /api/v1/cases/{caseId}/predictions/{predictionId}/
   */
  getPrediction: async (caseId: string, predictionId: string): Promise<Prediction> => {
    const response = await api.get<Prediction>(`/v1/cases/${caseId}/predictions/${predictionId}/`);
    return response.data;
  },

  /**
   * Run HER2 prediction on an image
   * POST /api/v1/cases/{caseId}/predictions/predict/
   */
  runPrediction: async (caseId: string, imageFile: File, generateGradcam = true): Promise<Prediction> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('generate_gradcam', generateGradcam.toString());

    const response = await api.post<{ prediction: Prediction; message: string }>(
      `/v1/cases/${caseId}/predictions/predict/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.prediction;
  },

  /**
   * Delete a prediction
   * DELETE /api/v1/cases/{caseId}/predictions/{predictionId}/
   */
  deletePrediction: async (caseId: string, predictionId: string): Promise<void> => {
    await api.delete(`/v1/cases/${caseId}/predictions/${predictionId}/`);
  },

  // ===== RECOMMENDATIONS =====

  /**
   * Get all recommendations for a case
   * GET /api/v1/cases/{caseId}/recommendations/
   */
  getRecommendations: async (caseId: string): Promise<RecommendationListResponse> => {
    const response = await api.get<RecommendationListResponse>(`/v1/cases/${caseId}/recommendations/`);
    return response.data;
  },

  /**
   * Get a single recommendation
   * GET /api/v1/cases/{caseId}/recommendations/{recommendationId}/
   */
  getRecommendation: async (caseId: string, recommendationId: string): Promise<Recommendation> => {
    const response = await api.get<Recommendation>(`/v1/cases/${caseId}/recommendations/${recommendationId}/`);
    return response.data;
  },

  /**
   * Generate a new recommendation
   * POST /api/v1/cases/{caseId}/recommendations/generate/
   */
  generateRecommendation: async (
    caseId: string,
    predictionId: string,
    clinicalNotes?: string,
    historyDocumentIds?: string[]
  ): Promise<Recommendation> => {
    const response = await api.post<{ recommendation: Recommendation; message: string }>(
      `/v1/cases/${caseId}/recommendations/generate/`,
      {
        prediction_id: predictionId,
        clinical_notes: clinicalNotes || '',
        history_document_ids: historyDocumentIds || [],
      }
    );
    return response.data.recommendation;
  },

  /**
   * Update recommendation status (save or discard)
   * PATCH /api/v1/cases/{caseId}/recommendations/{recommendationId}/update-status/
   */
  updateRecommendationStatus: async (
    caseId: string,
    recommendationId: string,
    status: 'saved' | 'discarded'
  ): Promise<Recommendation> => {
    const response = await api.patch<{ recommendation: Recommendation }>(
      `/v1/cases/${caseId}/recommendations/${recommendationId}/update-status/`,
      { status }
    );
    return response.data.recommendation;
  },

  /**
   * Get all pending (draft) recommendations for the logged-in doctor
   * GET /api/v1/recommendations/pending/
   * Returns recommendations with case_code and patient_name included
   */
  getPendingRecommendations: async (): Promise<PendingRecommendationListResponse> => {
    const response = await api.get<PendingRecommendationListResponse>('/v1/recommendations/pending/');
    return response.data;
  },

  // ========================================
  // DELETED CASES MANAGEMENT
  // ========================================

  /**
   * Get all soft-deleted cases
   * GET /api/v1/cases/deleted/
   * Doctors see their own, superadmins see all
   */
  getDeletedCases: async (): Promise<{ count: number; cases: Case[] }> => {
    const response = await api.get<{ count: number; cases: Case[] }>('/v1/cases/deleted/');
    return response.data;
  },

  /**
   * Restore a soft-deleted case
   * POST /api/v1/cases/{id}/restore/
   */
  restoreCase: async (id: string): Promise<{ status: string; case_code: string; message: string }> => {
    const response = await api.post<{ status: string; case_code: string; message: string }>(`/v1/cases/${id}/restore/`);
    return response.data;
  },

  /**
   * Permanently delete a case (superadmin only)
   * DELETE /api/v1/cases/{id}/permanent-delete/
   */
  permanentDeleteCase: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await api.delete<{ status: string; message: string }>(`/v1/cases/${id}/permanent-delete/`);
    return response.data;
  },

  /**
   * Generate a printable case report with full patient info
   * Opens a new window with formatted case details for printing/PDF
   */
  generateCaseReport: (caseData: {
    case_code: string;
    patient_name: string;
    patient_code?: string;
    status: string;
    risk_level: string | null;
    created_at: string;
    notes?: string | null;
    // Enhanced patient info
    patient_gender?: string | null;
    patient_age?: number | null;
    patient_dob?: string | null;
    patient_phone?: string | null;
    patient_email?: string | null;
    patient_address?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relation?: string | null;
    emergency_contact_phone?: string | null;
    medical_history?: string | null;
    allergies?: string | null;
    current_medications?: string | null;
    assigned_doctor_name?: string | null;
    predictions?: Prediction[];
    recommendations?: Recommendation[];
  }) => {
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const latestPrediction = caseData.predictions?.[0];
    const latestRecommendation = caseData.recommendations?.find(r => r.status === 'saved');

    const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Case Report - ${caseData.case_code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          padding: 40px; 
          color: #333; 
          line-height: 1.6;
        }
        .header { 
          text-align: center; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 20px; 
          margin-bottom: 30px; 
        }
        .header h1 { color: #1e40af; font-size: 28px; }
        .header p { color: #6b7280; margin-top: 5px; }
        .section { 
          margin-bottom: 25px; 
          page-break-inside: avoid; 
        }
        .section-title { 
          background: #eff6ff; 
          padding: 10px 15px; 
          font-weight: 600; 
          color: #1e40af;
          border-left: 4px solid #2563eb;
          margin-bottom: 15px;
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: repeat(2, 1fr); 
          gap: 15px; 
        }
        .info-item { 
          padding: 10px; 
          background: #f9fafb; 
          border-radius: 6px; 
        }
        .info-item label { 
          font-size: 12px; 
          color: #6b7280; 
          text-transform: uppercase; 
          display: block;
        }
        .info-item span { 
          font-size: 16px; 
          font-weight: 500; 
          color: #111827; 
        }
        .risk-critical { color: #dc2626; }
        .risk-high { color: #ea580c; }
        .risk-medium { color: #ca8a04; }
        .risk-low { color: #2563eb; }
        .content-block { 
          padding: 15px; 
          background: #f9fafb; 
          border-radius: 8px; 
          white-space: pre-line; 
        }
        .prediction-result {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px;
          background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .prediction-her2 {
          font-size: 32px;
          font-weight: 700;
          color: #1e40af;
        }
        .confidence-bar {
          flex: 1;
          height: 20px;
          background: #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
        }
        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #22c55e, #16a34a);
          border-radius: 10px;
        }
        .footer { 
          margin-top: 40px; 
          padding-top: 20px; 
          border-top: 1px solid #e5e7eb; 
          text-align: center; 
          color: #9ca3af; 
          font-size: 12px; 
        }
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 Medical Case Report</h1>
        <p>MBD Platform - AI-Powered HER2 Diagnosis System</p>
      </div>

      <div class="section">
        <div class="section-title">Case Information</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Case Code</label>
            <span>${caseData.case_code}</span>
          </div>
          <div class="info-item">
            <label>Status</label>
            <span>${caseData.status.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div class="info-item">
            <label>Risk Level</label>
            <span class="risk-${(caseData.risk_level || 'unknown').toLowerCase()}">${caseData.risk_level || 'Not Assessed'}</span>
          </div>
          <div class="info-item">
            <label>Created Date</label>
            <span>${formatDate(caseData.created_at)}</span>
          </div>
          ${caseData.assigned_doctor_name ? `
          <div class="info-item">
            <label>Attending Physician</label>
            <span>${caseData.assigned_doctor_name}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Patient Demographics</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Full Name</label>
            <span>${caseData.patient_name}</span>
          </div>
          <div class="info-item">
            <label>Patient Code</label>
            <span>${caseData.patient_code || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Gender</label>
            <span style="text-transform: capitalize;">${caseData.patient_gender || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Age / DOB</label>
            <span>${caseData.patient_age ? caseData.patient_age + ' years' : ''}${caseData.patient_dob ? ' (' + formatDate(caseData.patient_dob).split(',')[0] + ')' : 'N/A'}</span>
          </div>
          ${caseData.patient_phone ? `
          <div class="info-item">
            <label>Phone</label>
            <span>${caseData.patient_phone}</span>
          </div>
          ` : ''}
          ${caseData.patient_email ? `
          <div class="info-item">
            <label>Email</label>
            <span>${caseData.patient_email}</span>
          </div>
          ` : ''}
          ${caseData.patient_address ? `
          <div class="info-item" style="grid-column: span 2;">
            <label>Address</label>
            <span>${caseData.patient_address}</span>
          </div>
          ` : ''}
        </div>
      </div>

      ${(caseData.medical_history || caseData.allergies || caseData.current_medications) ? `
      <div class="section">
        <div class="section-title">Medical Background</div>
        ${caseData.medical_history ? `
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Medical History:</strong>
          <div class="content-block">${caseData.medical_history}</div>
        </div>
        ` : ''}
        ${caseData.allergies ? `
        <div style="margin-bottom: 15px;">
          <strong style="color: #dc2626;">Known Allergies:</strong>
          <div class="content-block" style="border-left: 3px solid #dc2626; background: #fef2f2;">${caseData.allergies}</div>
        </div>
        ` : ''}
        ${caseData.current_medications ? `
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Current Medications:</strong>
          <div class="content-block">${caseData.current_medications}</div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${(caseData.emergency_contact_name || caseData.emergency_contact_phone) ? `
      <div class="section">
        <div class="section-title">Emergency Contact</div>
        <div class="info-grid">
          <div class="info-item">
            <label>Contact Name</label>
            <span>${caseData.emergency_contact_name || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Relationship</label>
            <span>${caseData.emergency_contact_relation || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Phone Number</label>
            <span>${caseData.emergency_contact_phone || 'N/A'}</span>
          </div>
        </div>
      </div>
      ` : ''}

      ${latestPrediction ? `
      <div class="section">
        <div class="section-title">AI Prediction Results</div>
        <div class="prediction-result">
          <div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">HER2 Status</div>
            <div class="prediction-her2">${latestPrediction.her2_status}</div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">Confidence: ${(latestPrediction.confidence * 100).toFixed(1)}%</div>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${latestPrediction.confidence * 100}%"></div>
            </div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280;">Risk Score</div>
            <div style="font-size: 24px; font-weight: 600;">${latestPrediction.risk_score}/100</div>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <label>Model Version</label>
            <span>${latestPrediction.model_version}</span>
          </div>
          <div class="info-item">
            <label>Prediction Date</label>
            <span>${formatDate(latestPrediction.created_at)}</span>
          </div>
        </div>
      </div>
      ` : ''}

      ${latestRecommendation ? `
      <div class="section">
        <div class="section-title">Clinical Recommendations</div>
        ${latestRecommendation.clinical_assessment ? `
          <div style="margin-bottom: 15px;">
            <strong>Clinical Assessment:</strong>
            <div class="content-block">${latestRecommendation.clinical_assessment}</div>
          </div>
        ` : ''}
        ${latestRecommendation.treatment_recommendations ? `
          <div style="margin-bottom: 15px;">
            <strong>Treatment Recommendations:</strong>
            <div class="content-block">${latestRecommendation.treatment_recommendations}</div>
          </div>
        ` : ''}
        ${latestRecommendation.followup_schedule ? `
          <div style="margin-bottom: 15px;">
            <strong>Follow-up Schedule:</strong>
            <div class="content-block">${latestRecommendation.followup_schedule}</div>
          </div>
        ` : ''}
        ${latestRecommendation.risk_mitigation ? `
          <div style="margin-bottom: 15px;">
            <strong>Risk Mitigation:</strong>
            <div class="content-block">${latestRecommendation.risk_mitigation}</div>
          </div>
        ` : ''}
      </div>
      ` : ''}

      ${caseData.notes ? `
      <div class="section">
        <div class="section-title">Clinical Notes</div>
        <div class="content-block">${caseData.notes}</div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()} | MBD Platform - AI-Powered Diagnosis System</p>
        <p style="margin-top: 5px;">This report is for medical professional use only. Please consult with qualified healthcare providers for treatment decisions.</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          🖨️ Print / Save as PDF
        </button>
        <button onclick="window.close()" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-left: 10px;">
          Close
        </button>
      </div>
    </body>
    </html>
    `;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(reportHTML);
      reportWindow.document.close();
    }
  },

  /**
   * Generate a comprehensive single-case report matching the patient report design
   * Opens a new window with formatted case details for printing/PDF
   */
  generateComprehensiveCaseReport: (reportData: {
    caseData: Case & { patient_name?: string; patient_code?: string };
    patient: {
      id: string;
      patient_code: string;
      full_name: string;
      identity_number: string | null;
      dob: string | null;
      gender: string;
      phone_number: string | null;
      email: string | null;
      address: string | null;
      emergency_contact_name: string | null;
      emergency_contact_relation: string | null;
      emergency_contact_phone: string | null;
      medical_history: string | null;
      allergies: string | null;
      current_medications: string | null;
      assigned_doctor_name?: string;
      created_at: string;
    } | null;
    predictions: Prediction[];
    recommendations: Recommendation[];
  }) => {
    const { caseData, patient, predictions, recommendations } = reportData;

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const formatDateTime = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const calculateAge = (dob: string | null) => {
      if (!dob) return 'Unknown';
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    const getRiskColor = (risk: string | null) => {
      switch (risk?.toLowerCase()) {
        case 'critical': return '#dc2626';
        case 'high': return '#ea580c';
        case 'medium': return '#ca8a04';
        case 'low': return '#16a34a';
        default: return '#6b7280';
      }
    };

    const riskColor = getRiskColor(caseData.risk_level);

    // Generate predictions HTML
    const generatePredictionsHTML = () => {
      if (predictions.length === 0) {
        return '<div style="padding: 15px; background: #f8fafc; border-radius: 4px; color: #64748b; font-size: 13px; font-style: italic; border: 1px dashed #cbd5e1;">Pending Analysis</div>';
      }

      return predictions.map((pred, idx) => `
        <div style="margin-bottom: ${idx < predictions.length - 1 ? '20px' : '0'}; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <div style="background: #f1f5f9; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; color: #1e293b; font-size: 14px; font-weight: 600;">AI Analysis ${predictions.length > 1 ? '#' + (predictions.length - idx) : ''} ${idx === 0 ? '(Latest)' : ''}</h4>
            <span style="font-size: 11px; color: #64748b;">${formatDateTime(pred.created_at)}</span>
          </div>
          
          <div style="padding: 15px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
              <tr>
                <td style="padding: 8px; width: 25%; color: #64748b; font-size: 13px;">HER2 Status</td>
                <td style="padding: 8px; width: 25%; color: #0f172a; font-weight: 600; font-size: 14px;">${pred.her2_status}</td>
                <td style="padding: 8px; width: 25%; color: #64748b; font-size: 13px;">Confidence</td>
                <td style="padding: 8px; width: 25%; color: #22c55e; font-weight: 600; font-size: 14px;">${(pred.confidence * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td style="padding: 8px; color: #64748b; font-size: 13px;">Risk Assessment</td>
                <td style="padding: 8px; color: ${getRiskColor(pred.risk_level)}; font-weight: 600; font-size: 14px; text-transform: capitalize;">${pred.risk_level}</td>
                <td style="padding: 8px; color: #64748b; font-size: 13px;">Risk Score</td>
                <td style="padding: 8px; color: #0f172a; font-weight: 600; font-size: 14px;">${pred.risk_score}/100</td>
              </tr>
            </table>

            <div style="margin-bottom: 15px;">
              <p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Detailed Probabilities</p>
              ${Object.entries(pred.probabilities).map(([label, prob]) => `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                  <span style="width: 80px; font-size: 12px; color: #475569;">${label}</span>
                  <div style="flex: 1; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #3b82f6; height: 100%; width: ${(prob as number) * 100}%; border-radius: 4px;"></div>
                  </div>
                  <span style="width: 40px; font-size: 12px; font-weight: 500; color: #475569; text-align: right;">${((prob as number) * 100).toFixed(0)}%</span>
                </div>
              `).join('')}
            </div>

            ${(pred.original_image_url || pred.gradcam_url) ? `
              <div style="display: flex; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                ${pred.original_image_url ? `
                  <div style="flex: 1;">
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-align: center;">Original Pathology Image</p>
                    <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;">
                      <img src="${pred.original_image_url}" style="width: 100%; height: auto; display: block;" />
                    </div>
                  </div>
                ` : ''}
                ${pred.gradcam_url ? `
                  <div style="flex: 1;">
                    <p style="font-size: 12px; color: #64748b; margin-bottom: 8px; text-align: center;">AI Attention Map (Grad-CAM)</p>
                    <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;">
                      <img src="${pred.gradcam_url}" style="width: 100%; height: auto; display: block;" />
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
            
            <div style="margin-top: 10px; font-size: 11px; color: #94a3b8; text-align: right;">
              Analysis ID: ${pred.id.split('-').pop()} | Model v${pred.model_version}
            </div>
          </div>
        </div>
      `).join('');
    };

    // Generate recommendations HTML
    const generateRecommendationsHTML = () => {
      if (recommendations.length === 0) {
        return '';
      }

      return recommendations.map((rec, idx) => `
        <div style="margin-top: 20px; ${idx > 0 ? 'padding-top: 20px; border-top: 1px dashed #e2e8f0;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; color: #0f172a; font-size: 14px; font-weight: 600;">Clinical Recommendations ${recommendations.length > 1 ? '#' + (recommendations.length - idx) : ''}</h4>
            <span style="font-size: 11px; color: #64748b; background: ${rec.status === 'saved' ? '#dcfce7' : rec.status === 'discarded' ? '#fee2e2' : '#f1f5f9'}; padding: 2px 8px; border-radius: 4px; text-transform: capitalize;">${rec.status === 'saved' ? 'Accepted' : rec.status}</span>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            ${rec.clinical_assessment ? `
              <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 140px; color: #64748b; font-size: 13px;">Assessment</td>
                <td style="padding: 8px 0; color: #334155; font-size: 13px; line-height: 1.5;">${rec.clinical_assessment}</td>
              </tr>
            ` : ''}
            ${rec.treatment_recommendations ? `
              <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 140px; color: #64748b; font-size: 13px;">Treatment Plan</td>
                <td style="padding: 8px 0; color: #334155; font-size: 13px; line-height: 1.5;">${rec.treatment_recommendations}</td>
              </tr>
            ` : ''}
            ${rec.followup_schedule ? `
              <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 140px; color: #64748b; font-size: 13px;">Follow-up</td>
                <td style="padding: 8px 0; color: #334155; font-size: 13px; line-height: 1.5;">${rec.followup_schedule}</td>
              </tr>
            ` : ''}
            ${rec.risk_mitigation ? `
              <tr>
                <td style="padding: 8px 0; vertical-align: top; width: 140px; color: #64748b; font-size: 13px;">Risk Mitigation</td>
                <td style="padding: 8px 0; color: #334155; font-size: 13px; line-height: 1.5;">${rec.risk_mitigation}</td>
              </tr>
            ` : ''}
          </table>
        </div>
      `).join('');
    };

    const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Case Report - ${caseData.case_code}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          padding: 40px; 
          color: #334155; 
          line-height: 1.5;
          background: #f1f5f9;
        }
        
        .report-container {
          max-width: 850px;
          margin: 0 auto;
          background: white;
          padding: 50px;
          min-height: 100vh;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .header { 
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .brand h1 { 
          color: #0f172a; 
          font-size: 24px; 
          font-weight: 700;
          letter-spacing: -0.025em;
          margin-bottom: 4px;
        }
        
        .brand p { 
          color: #64748b; 
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .meta {
          text-align: right;
          font-size: 12px;
          color: #64748b;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 20px;
          margin-top: 30px;
        }
        
        .patient-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 30px;
          background: #f8fafc;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        
        .info-label {
          width: 150px;
          color: #64748b;
          font-size: 13px;
        }
        
        .info-value {
          color: #0f172a;
          font-weight: 500;
          font-size: 13px;
        }
        
        .case-section {
          page-break-inside: avoid;
          margin-bottom: 30px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }
        
        .case-header {
          background-color: #f8fafc;
          padding: 12px 20px;
          border-bottom: 1px solid #e2e8f0;
          border-radius: 6px 6px 0 0;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
        }
        
        .no-print { margin-top: 30px; text-align: right; }
        
        .btn {
          display: inline-block;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: #0f172a;
          color: white;
        }
        
        .btn-secondary {
          background: white;
          color: #0f172a;
          border: 1px solid #e2e8f0;
          margin-left: 10px;
        }
        
        @media print {
          body { padding: 0; background: white; }
          .report-container { box-shadow: none; padding: 20px; width: 100%; max-width: none; }
          .no-print { display: none; }
          .case-section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="report-container">
        <header class="header">
          <div class="brand">
            <h1>Patient Medical Report</h1>
            <p>MBD Diagnostic Platform</p>
          </div>
          <div class="meta">
            <p>Report Generated: ${new Date().toLocaleDateString()}</p>
            <p>Report ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          </div>
        </header>

        <h2 class="section-title">Patient Demographics</h2>
        <div class="patient-grid">
          <div>
            <div class="info-row">
              <span class="info-label">Full Name:</span>
              <span class="info-value">${patient?.full_name || caseData.patient_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient ID:</span>
              <span class="info-value">${patient?.patient_code || caseData.patient_code || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Identity Number:</span>
              <span class="info-value">${patient?.identity_number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${patient?.dob ? formatDate(patient.dob) : 'N/A'} (${calculateAge(patient?.dob || null)} yrs)</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gender:</span>
              <span class="info-value" style="text-transform: capitalize;">${patient?.gender || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${patient?.phone_number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${patient?.email || 'N/A'}</span>
            </div>
          </div>
          <div>
            <div class="info-row">
              <span class="info-label">Assigned Doctor:</span>
              <span class="info-value">${patient?.assigned_doctor_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${patient?.address || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Emergency Contact:</span>
              <span class="info-value">${patient?.emergency_contact_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Emergency Relation:</span>
              <span class="info-value">${patient?.emergency_contact_relation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Emergency Phone:</span>
              <span class="info-value">${patient?.emergency_contact_phone || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Registered:</span>
              <span class="info-value">${patient?.created_at ? formatDate(patient.created_at) : 'N/A'}</span>
            </div>
          </div>
        </div>

        <h2 class="section-title">Detailed Case History (1 Case)</h2>
        <div class="case-section">
          <div class="case-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">Case Reference: ${caseData.case_code}</h3>
                <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Date: ${formatDate(caseData.created_at)}</p>
              </div>
              <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: #e2e8f0; color: #475569; text-transform: capitalize;">${caseData.status.replace('_', ' ')}</span>
                ${caseData.risk_level ? `<span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${riskColor}15; color: ${riskColor}; border: 1px solid ${riskColor}30; margin-left: 8px; text-transform: capitalize;">${caseData.risk_level} Risk</span>` : ''}
              </div>
            </div>
          </div>
          
          <div style="padding: 20px;">
            ${caseData.notes ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Clinical Notes</h4>
                <div style="background: #f8fafc; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0; color: #334155; font-size: 14px;">${caseData.notes}</div>
              </div>
            ` : ''}
            
            <!-- All Predictions -->
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">AI Analysis Results (${predictions.length})</h4>
              ${generatePredictionsHTML()}
            </div>
            
            <!-- All Recommendations -->
            ${recommendations.length > 0 ? `
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <h4 style="margin: 0 0 12px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Clinical Recommendations (${recommendations.length})</h4>
                ${generateRecommendationsHTML()}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>CONFIDENTIAL: This report contains private medical information.</p>
          <p>Generated by MBD Platform • ${new Date().toLocaleString()}</p>
        </div>

        <div class="no-print">
          <button onclick="window.print()" class="btn btn-primary">Print Report</button>
          <button onclick="window.close()" class="btn btn-secondary">Close Window</button>
        </div>
      </div>
    </body>
    </html>
    `;

    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(reportHTML);
      reportWindow.document.close();
    }
  },
};

export default caseService;
