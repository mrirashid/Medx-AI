import { useState, useEffect, useCallback } from 'react';
import dashboardService, { DoctorDashboardStats } from '../services/dashboardService';
import patientService, { Patient, PatientFilters, PatientListResponse } from '../services/patientService';
import caseService, {
  Case,
  CaseFilters,
  CaseListResponse,
  Prediction,
  Recommendation,
  CreateCaseData,
  UpdateCaseData,
} from '../services/caseService';

// Extended types for doctor-specific data
export interface DoctorPatient extends Patient {
  age: number | null;
}

export interface DoctorCase extends Case {
  patient_age?: number;
}

// Dashboard hook
export function useDoctorDashboard() {
  const [stats, setStats] = useState<DoctorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getDoctorStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard stats');
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

// Patients hook
export function useDoctorPatients(initialFilters?: PatientFilters) {
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PatientFilters>(initialFilters || {});

  const pageSize = 10; // Must match backend PAGE_SIZE

  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchPatients = useCallback(async (newFilters?: PatientFilters, page?: number) => {
    try {
      setLoading(true);
      setError(null);
      const appliedFilters = { ...(newFilters || filters), page: page || currentPage };
      const response = await patientService.getPatients(appliedFilters);

      // Enhance patients with calculated age
      const enhancedPatients: DoctorPatient[] = response.results.map(patient => ({
        ...patient,
        age: calculateAge(patient.dob),
      }));

      setPatients(enhancedPatients);
      setPagination({
        count: response.count,
        next: response.next,
        previous: response.previous,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load patients');
      console.error('Patients fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const updateFilters = useCallback((newFilters: PatientFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    fetchPatients(newFilters, 1);
  }, [fetchPatients]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchPatients(filters, page);
  }, [fetchPatients, filters]);

  const getPatient = useCallback(async (id: string) => {
    try {
      const patient = await patientService.getPatient(id);
      return {
        ...patient,
        age: calculateAge(patient.dob),
      } as DoctorPatient;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to load patient');
    }
  }, []);

  const getPatientCases = useCallback(async (patientId: string) => {
    try {
      return await patientService.getPatientCases(patientId);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to load patient cases');
    }
  }, []);

  return {
    patients,
    pagination,
    currentPage,
    pageSize,
    loading,
    error,
    filters,
    updateFilters,
    goToPage,
    refetch: fetchPatients,
    getPatient,
    getPatientCases,
  };
}

// Cases hook
export function useDoctorCases(initialFilters?: CaseFilters) {
  const [cases, setCases] = useState<Case[]>([]);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CaseFilters>(initialFilters || {});

  const pageSize = 10; // Must match backend PAGE_SIZE

  const fetchCases = useCallback(async (newFilters?: CaseFilters, page?: number) => {
    try {
      setLoading(true);
      setError(null);
      const appliedFilters = { ...(newFilters || filters), page: page || currentPage };
      const response = await caseService.getCases(appliedFilters);
      setCases(response.results);
      setPagination({
        count: response.count,
        next: response.next,
        previous: response.previous,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load cases');
      console.error('Cases fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchCases();
  }, []);

  const updateFilters = useCallback((newFilters: CaseFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    fetchCases(newFilters, 1);
  }, [fetchCases]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    fetchCases(filters, page);
  }, [fetchCases, filters]);

  const getCase = useCallback(async (id: string) => {
    try {
      return await caseService.getCase(id);
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to load case');
    }
  }, []);

  const createCase = useCallback(async (data: CreateCaseData) => {
    try {
      const newCase = await caseService.createCase(data);
      // Refresh the cases list
      await fetchCases();
      return newCase;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to create case');
    }
  }, [fetchCases]);

  const updateCase = useCallback(async (id: string, data: UpdateCaseData) => {
    try {
      const updatedCase = await caseService.updateCase(id, data);
      // Refresh the cases list
      await fetchCases();
      return updatedCase;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to update case');
    }
  }, [fetchCases]);

  const deleteCase = useCallback(async (id: string) => {
    try {
      await caseService.deleteCase(id);
      // Refresh the cases list
      await fetchCases();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to delete case');
    }
  }, [fetchCases]);

  return {
    cases,
    pagination,
    currentPage,
    pageSize,
    loading,
    error,
    filters,
    updateFilters,
    goToPage,
    refetch: fetchCases,
    getCase,
    createCase,
    updateCase,
    deleteCase,
  };
}

// Single case with predictions and recommendations
export function useCaseDetails(caseId: string | null) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCaseDetails = useCallback(async () => {
    if (!caseId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch case details, predictions, and recommendations in parallel
      const [caseResponse, predictionsResponse, recommendationsResponse] = await Promise.all([
        caseService.getCase(caseId),
        caseService.getPredictions(caseId),
        caseService.getRecommendations(caseId),
      ]);

      setCaseData(caseResponse);
      setPredictions(predictionsResponse.results || []);
      setRecommendations(recommendationsResponse.results || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load case details');
      console.error('Case details error:', err);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  const runPrediction = useCallback(async (imageFile: File, generateGradcam = true) => {
    if (!caseId) throw new Error('No case ID provided');

    try {
      const prediction = await caseService.runPrediction(caseId, imageFile, generateGradcam);
      // Refresh predictions
      const response = await caseService.getPredictions(caseId);
      setPredictions(response.results || []);
      return prediction;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to run prediction');
    }
  }, [caseId]);

  const generateRecommendation = useCallback(async (
    predictionId: string,
    clinicalNotes?: string,
    historyDocumentIds?: string[]
  ) => {
    if (!caseId) throw new Error('No case ID provided');

    try {
      const recommendation = await caseService.generateRecommendation(
        caseId,
        predictionId,
        clinicalNotes,
        historyDocumentIds
      );
      // Refresh recommendations
      const response = await caseService.getRecommendations(caseId);
      setRecommendations(response.results || []);
      return recommendation;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to generate recommendation');
    }
  }, [caseId]);

  const updateRecommendationStatus = useCallback(async (
    recommendationId: string,
    status: 'saved' | 'discarded'
  ) => {
    if (!caseId) throw new Error('No case ID provided');

    try {
      const recommendation = await caseService.updateRecommendationStatus(
        caseId,
        recommendationId,
        status
      );
      // Refresh recommendations
      const response = await caseService.getRecommendations(caseId);
      setRecommendations(response.results || []);
      return recommendation;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to update recommendation status');
    }
  }, [caseId]);

  return {
    caseData,
    predictions,
    recommendations,
    loading,
    error,
    refetch: fetchCaseDetails,
    runPrediction,
    generateRecommendation,
    updateRecommendationStatus,
  };
}

// Hook to get all pending recommendations for the logged-in doctor
export interface RecommendationWithCase extends Recommendation {
  case_code?: string;
  patient_name?: string;
}

export function useAllRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendationWithCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the new dedicated endpoint that fetches all pending recommendations
      // for the logged-in doctor in a single API call
      const response = await caseService.getPendingRecommendations();

      // The endpoint already returns recommendations with case_code and patient_name
      setRecommendations(response.results || []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load recommendations');
      console.error('Recommendations fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllRecommendations();
  }, [fetchAllRecommendations]);

  const updateStatus = useCallback(async (
    caseId: string,
    recommendationId: string,
    status: 'saved' | 'discarded'
  ) => {
    try {
      await caseService.updateRecommendationStatus(caseId, recommendationId, status);
      // Refresh all recommendations
      await fetchAllRecommendations();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to update recommendation status');
    }
  }, [fetchAllRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchAllRecommendations,
    updateStatus,
  };
}

// Export all hooks
export default {
  useDoctorDashboard,
  useDoctorPatients,
  useDoctorCases,
  useCaseDetails,
  useAllRecommendations,
};
