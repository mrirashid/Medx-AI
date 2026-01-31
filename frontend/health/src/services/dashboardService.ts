import api from './api';

// Dashboard stats types
export interface SuperadminDashboardStats {
  total_users: number;
  total_doctors: number;
  total_nurses: number;
  active_cases: number;
  role_distribution: {
    doctors: number;
    nurses: number;
    superadmins: number;
  };
  recent_activities: Array<{
    id: string;
    user_name: string;
    user_role: string | null;
    action: string;
    entity_type: string;
    description: string;
    created_at: string;
  }>;
  user_growth: Array<{
    date: string;
    count: number;
  }>;
}

export interface DoctorDashboardStats {
  total_patients: number;
  total_cases: number;
  active_cases: number;
  completed_cases: number;
  cases_this_week: number;
  recommendations_generated: number;
  total_predictions: number;
  pending_recommendations: number;
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  daily_cases: Array<{
    date: string;
    day_name: string;
    count: number;
  }>;
  recent_cases: Array<{
    id: string;
    case_code: string;
    patient: string;
    patient_name: string;
    patient_code?: string;
    status?: string;
    risk_level: string | null;
    has_prediction?: boolean;
    has_recommendation?: boolean;
    created_at: string;
  }>;
}

export interface NurseDashboardStats {
  total_patients: number;
  patients_added_today: number;
  patients_added_this_week: number;
  age_distribution: {
    '0-20': number;
    '21-40': number;
    '41-60': number;
    '60+': number;
  };
  gender_distribution: {
    male: number;
    female: number;
    other: number;
  };
  recent_activities: Array<{
    id: string;
    description: string;
    created_at: string;
  }>;
}

const dashboardService = {
  /**
   * Get superadmin dashboard stats
   * GET /api/v1/dashboard/superadmin/
   */
  getSuperadminStats: async (): Promise<SuperadminDashboardStats> => {
    const response = await api.get<SuperadminDashboardStats>('/v1/dashboard/superadmin/');
    return response.data;
  },

  /**
   * Get doctor dashboard stats
   * GET /api/v1/dashboard/doctor/
   */
  getDoctorStats: async (): Promise<DoctorDashboardStats> => {
    const response = await api.get<DoctorDashboardStats>('/v1/dashboard/doctor/');
    return response.data;
  },

  /**
   * Get nurse dashboard stats
   * GET /api/v1/dashboard/nurse/
   */
  getNurseStats: async (): Promise<NurseDashboardStats> => {
    const response = await api.get<NurseDashboardStats>('/v1/dashboard/nurse/');
    return response.data;
  },
};

export default dashboardService;
