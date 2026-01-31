import api from './api';

// Types matching backend
export interface Patient {
  id: string;
  patient_code: string;
  full_name: string;
  identity_number: string | null;
  dob: string | null;
  gender: 'male' | 'female' | 'other';
  phone_number: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  medical_history: string | null;
  allergies: string | null;
  current_medications: string | null;
  assigned_doctor: string | null;
  assigned_doctor_name?: string;
  created_by?: string | null;
  created_by_name?: string;
  age?: number | null;
  total_cases?: number;
  last_case_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Patient[];
}

export interface CreatePatientData {
  full_name: string;
  identity_number: string;
  dob?: string;
  gender: 'male' | 'female' | 'other';
  phone_number: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  assigned_doctor: string; // Doctor ID
}

export interface UpdatePatientData {
  full_name?: string;
  identity_number?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  phone_number?: string;
  email?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  assigned_doctor?: string;
}

export interface PatientFilters {
  search?: string;
  gender?: 'male' | 'female' | 'other';
  page?: number;
  page_size?: number;
}

export interface Doctor {
  id: string;
  full_name: string;
  email: string;
}

export interface PatientCase {
  id: string;
  case_code: string;
  status: string;
  created_at: string;
  has_prediction: boolean;
  has_recommendation: boolean;
}

export interface PatientCasesResponse {
  patient_id: string;
  patient_code: string;
  patient_name: string;
  total_cases: number;
  cases: PatientCase[];
}

const patientService = {
  /**
   * Get all doctors for patient assignment
   * GET /api/v1/users/doctors/
   */
  getDoctors: async (): Promise<Doctor[]> => {
    const response = await api.get<Doctor[]>('/v1/users/doctors/');
    return response.data;
  },

  /**
   * Get all patients with optional filters
   * GET /api/v1/patients/
   */
  getPatients: async (filters?: PatientFilters): Promise<PatientListResponse> => {
    const params = new URLSearchParams();

    if (filters?.search) params.append('search', filters.search);
    if (filters?.gender) params.append('gender', filters.gender);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.page_size) params.append('page_size', filters.page_size.toString());

    const response = await api.get<PatientListResponse>(`/v1/patients/?${params.toString()}`);
    return response.data;
  },

  /**
   * Get a single patient by ID
   * GET /api/v1/patients/{id}/
   */
  getPatient: async (id: string): Promise<Patient> => {
    const response = await api.get<Patient>(`/v1/patients/${id}/`);
    return response.data;
  },

  /**
   * Create a new patient
   * POST /api/v1/patients/
   */
  createPatient: async (data: CreatePatientData): Promise<Patient> => {
    const response = await api.post<Patient>('/v1/patients/', data);
    return response.data;
  },

  /**
   * Update a patient
   * PATCH /api/v1/patients/{id}/
   */
  updatePatient: async (id: string, data: UpdatePatientData): Promise<Patient> => {
    const response = await api.patch<Patient>(`/v1/patients/${id}/`, data);
    return response.data;
  },

  /**
   * Delete a patient (soft delete)
   * DELETE /api/v1/patients/{id}/
   */
  deletePatient: async (id: string): Promise<void> => {
    await api.delete(`/v1/patients/${id}/`);
  },

  /**
   * Get all cases for a patient
   * GET /api/v1/patients/{id}/cases/
   */
  getPatientCases: async (patientId: string): Promise<PatientCasesResponse> => {
    const response = await api.get<PatientCasesResponse>(`/v1/patients/${patientId}/cases/`);
    return response.data;
  },

  /**
   * Get all soft-deleted patients (nurse only)
   * GET /api/v1/patients/deleted/
   */
  getDeletedPatients: async (): Promise<{ count: number; patients: Patient[] }> => {
    const response = await api.get<{ count: number; patients: Patient[] }>('/v1/patients/deleted/');
    return response.data;
  },

  /**
   * Restore a soft-deleted patient (nurse only)
   * POST /api/v1/patients/{id}/restore/
   */
  restorePatient: async (id: string): Promise<{ status: string; patient_code: string; message: string }> => {
    const response = await api.post<{ status: string; patient_code: string; message: string }>(`/v1/patients/${id}/restore/`);
    return response.data;
  },

  /**
   * Permanently delete a patient (superadmin only)
   * DELETE /api/v1/patients/{id}/permanent-delete/
   */
  permanentDeletePatient: async (id: string): Promise<{ status: string; message: string }> => {
    const response = await api.delete<{ status: string; message: string }>(`/v1/patients/${id}/permanent-delete/`);
    return response.data;
  },

  /**
   * Generate a comprehensive patient report with all cases, predictions, and recommendations
   * Opens a new window with formatted content for printing/PDF
   */
  generatePatientReport: (reportData: {
    patient: Patient;
    cases: Array<{
      id: string;
      case_code: string;
      status: string;
      risk_level: string | null;
      notes?: string | null;
      created_at: string;
      predictions: Array<{
        id: string;
        her2_status: string;
        confidence: number;
        risk_level: string;
        risk_score: number;
        probabilities: Record<string, number>;
        original_image_url: string | null;
        gradcam_url: string | null;
        model_version: string;
        created_at: string;
      }>;
      recommendations: Array<{
        id: string;
        status: string;
        clinical_assessment: string;
        treatment_recommendations: string;
        followup_schedule: string;
        risk_mitigation: string;
        created_at: string;
      }>;
    }>;
  }) => {
    const { patient, cases } = reportData;

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

    // Generate ALL predictions HTML for a case
    const generatePredictionsHTML = (predictions: typeof cases[0]['predictions'], riskColor: string) => {
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
                <td style="padding: 8px; width: 25%; color: #0f172a; font-weight: 600; font-size: 14px;">${(pred.confidence * 100).toFixed(1)}%</td>
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

    // Generate ALL recommendations HTML for a case
    const generateRecommendationsHTML = (recommendations: typeof cases[0]['recommendations']) => {
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

    // Generate cases HTML with ALL predictions and recommendations
    const casesHTML = cases.map((caseItem, idx) => {
      const riskColor = getRiskColor(caseItem.risk_level);

      return `
        <div class="case-section" style="page-break-inside: avoid; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <div class="case-header" style="background-color: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; border-radius: 6px 6px 0 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">Case Reference: ${caseItem.case_code}</h3>
                <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Date: ${formatDate(caseItem.created_at)}</p>
              </div>
              <div style="text-align: right;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: #e2e8f0; color: #475569; text-transform: capitalize;">${caseItem.status.replace('_', ' ')}</span>
                ${caseItem.risk_level ? `<span style="display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; background: ${riskColor}15; color: ${riskColor}; border: 1px solid ${riskColor}30; margin-left: 8px; text-transform: capitalize;">${caseItem.risk_level} Risk</span>` : ''}
              </div>
            </div>
          </div>
          
          <div style="padding: 20px;">
            ${caseItem.notes ? `
              <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Clinical Notes</h4>
                <div style="background: #f8fafc; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0; color: #334155; font-size: 14px;">${caseItem.notes}</div>
              </div>
            ` : ''}
            
            <!-- All Predictions -->
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 12px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">AI Analysis Results (${caseItem.predictions.length})</h4>
              ${generatePredictionsHTML(caseItem.predictions, riskColor)}
            </div>
            
            <!-- All Recommendations -->
            ${caseItem.recommendations.length > 0 ? `
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <h4 style="margin: 0 0 12px; color: #475569; font-size: 12px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Clinical Recommendations (${caseItem.recommendations.length})</h4>
                ${generateRecommendationsHTML(caseItem.recommendations)}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Medical Report - ${patient.full_name}</title>
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
              <span class="info-value">${patient.full_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Patient ID:</span>
              <span class="info-value">${patient.patient_code}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Identity Number:</span>
              <span class="info-value">${patient.identity_number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date of Birth:</span>
              <span class="info-value">${patient.dob ? formatDate(patient.dob) : 'N/A'} (${calculateAge(patient.dob)} yrs)</span>
            </div>
            <div class="info-row">
              <span class="info-label">Gender:</span>
              <span class="info-value" style="text-transform: capitalize;">${patient.gender}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${patient.phone_number || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${patient.email || 'N/A'}</span>
            </div>
          </div>
          <div>
            <div class="info-row">
              <span class="info-label">Assigned Doctor:</span>
              <span class="info-value">${patient.assigned_doctor_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value">${patient.address || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Emergency Contact:</span>
              <span class="info-value">${patient.emergency_contact_name || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Emergency Relation:</span>
              <span class="info-value">${patient.emergency_contact_relation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Emergency Phone:</span>
              <span class="info-value">${patient.emergency_contact_phone || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Registered:</span>
              <span class="info-value">${formatDate(patient.created_at)}</span>
            </div>
          </div>
        </div>

        ${(patient.medical_history || patient.allergies || patient.current_medications) ? `
          <h2 class="section-title">Clinical Background</h2>
          <div style="margin-bottom: 30px; font-size: 13px;">
            <table style="width: 100%; border-collapse: collapse;">
              ${patient.medical_history ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 150px; color: #64748b; vertical-align: top;">Medical History</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155;">${patient.medical_history}</td>
                </tr>
              ` : ''}
              ${patient.allergies ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 150px; color: #dc2626; vertical-align: top; font-weight: 500;">Allergies</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #dc2626;">${patient.allergies}</td>
                </tr>
              ` : ''}
              ${patient.current_medications ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 150px; color: #64748b; vertical-align: top;">Medications</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155;">${patient.current_medications}</td>
                </tr>
              ` : ''}
            </table>
          </div>
        ` : ''}

        <h2 class="section-title">Detailed Case History (${cases.length} Cases)</h2>
        ${cases.length > 0 ? casesHTML : '<p style="text-align: center; color: #94a3b8; font-style: italic; padding: 40px;">No case records found.</p>'}

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

    // Open the report in a new window
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(reportHTML);
      reportWindow.document.close();
    }
  },
};

export default patientService;
