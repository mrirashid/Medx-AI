// API and Token Management
export { default as api, tokenManager } from './api';

// Services
export { default as authService } from './authService';
export { default as userService } from './userService';
export { default as patientService } from './patientService';
export { default as caseService } from './caseService';
export { default as notificationService } from './notificationService';

// Types re-export
export type { LoginCredentials, LoginResponse, UserProfile } from './authService';
export type { User, UserListResponse, CreateUserData, UpdateUserData, UserFilters } from './userService';
export type { Patient, PatientListResponse, CreatePatientData, UpdatePatientData, PatientFilters, PatientCase, PatientCasesResponse } from './patientService';
export type { Case, CaseListResponse, CreateCaseData, UpdateCaseData, CaseFilters, Prediction, PredictionListResponse, Recommendation, RecommendationListResponse } from './caseService';
export type { Notification, NotificationListResponse, UnreadCountResponse } from './notificationService';
