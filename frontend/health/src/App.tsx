import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/common/ProtectedRoute";
import { AdminDataProvider } from "./contexts/AdminDataContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ClinicalDataProvider } from "./contexts/ClinicalDataContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { PreferencesProvider } from "./contexts/PreferencesContext";
import { LanguageProvider } from "./i18n/LanguageProvider";

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const DoctorLayout = lazy(() => import("./layouts/DoctorLayout"));
const NurseLayout = lazy(() => import("./layouts/NurseLayout"));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const NewUser = lazy(() => import("./pages/admin/NewUser"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ArchivedUsers = lazy(() => import("./pages/admin/ArchivedUsers"));
const ArchivedPatients = lazy(() => import("./pages/admin/ArchivedPatients"));
const ArchivedCases = lazy(() => import("./pages/admin/ArchivedCases"));

// Auth pages
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const CaseHistory = lazy(() => import("./pages/doctor/CaseHistory"));
const CaseManagement = lazy(() => import("./pages/doctor/CaseManagement"));
const CaseNew = lazy(() => import("./pages/doctor/CaseNew"));
const CaseDetailsPage = lazy(() => import("./pages/doctor/CaseDetailsPage"));
const CaseDetails = lazy(() => import("./pages/doctor/CaseDetails"));
const DoctorDashboard = lazy(() => import("./pages/doctor/Dashboard"));
const DoctorProfile = lazy(() => import("./pages/doctor/DoctorProfile"));
const DoctorSettings = lazy(() => import("./pages/doctor/DoctorSettings"));
const NewPatientCase = lazy(() => import("./pages/doctor/NewCase"));
const DoctorNewPatient = lazy(() => import("./pages/doctor/NewPatient"));
const PatientList = lazy(() => import("./pages/doctor/PatientList"));
const PatientProfiles = lazy(() => import("./pages/doctor/PatientProfiles"));
const Recommendations = lazy(() => import("./pages/doctor/Recommendations"));
const DoctorArchivedCases = lazy(() => import("./pages/doctor/ArchivedCases"));

const NurseSettings = lazy(() => import("./pages/nurse/AccountSettings"));
const NurseDashboard = lazy(() => import("./pages/nurse/Dashboard"));
const NurseMedications = lazy(() => import("./pages/nurse/Medications"));
const NurseMessages = lazy(() => import("./pages/nurse/Messages"));
const NurseProfile = lazy(() => import("./pages/nurse/NurseProfile"));
const NursePatientDetail = lazy(() => import("./pages/nurse/PatientDetail"));
const NursePatientsList = lazy(() => import("./pages/nurse/PatientsList"));
const NurseSchedule = lazy(() => import("./pages/nurse/Schedule"));
const NurseTasks = lazy(() => import("./pages/nurse/Tasks"));
const NurseVitals = lazy(() => import("./pages/nurse/Vitals"));
const NurseArchivedPatients = lazy(() => import("./pages/nurse/ArchivedPatients"));

function AppLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#041939] text-white">
      Loading dashboard…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <LanguageProvider>
            <NotificationProvider>
              <AdminDataProvider>
                <ClinicalDataProvider>
                  <Suspense fallback={<AppLoadingFallback />}>
                    <Routes>
                      {/* Render Login at root */}
                      <Route path="/" element={<AdminLogin />} />

                      {/* Auth routes */}
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />

                      {/* Redirect /admin/login to root to keep URL clean */}
                      <Route
                        path="/admin/login"
                        element={<Navigate to="/" replace />}
                      />

                      {/* Protected Admin Routes */}
                      <Route
                        path="/admin"
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route
                          index
                          element={<Navigate to="/admin/dashboard" replace />}
                        />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="users/new" element={<NewUser />} />
                        <Route path="users/archived" element={<ArchivedUsers />} />
                        <Route path="patients/archived" element={<ArchivedPatients />} />
                        <Route path="cases/archived" element={<ArchivedCases />} />
                        {/* Removed admin access to cases/recommendations/patients per request */}
                        <Route
                          path="cases"
                          element={<Navigate to="/doctor/cases" replace />}
                        />
                        <Route
                          path="cases/new"
                          element={<Navigate to="/doctor/cases/new" replace />}
                        />
                        <Route
                          path="recommendations"
                          element={
                            <Navigate to="/doctor/recommendations" replace />
                          }
                        />
                        <Route
                          path="patients"
                          element={<Navigate to="/doctor/patients" replace />}
                        />
                        <Route
                          path="patients/new"
                          element={<Navigate to="/doctor/patients/new" replace />}
                        />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route path="profile" element={<AdminProfile />} />
                      </Route>

                      {/* Catch all - redirect to root (login) */}
                      <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                      />
                      {/* Doctor Routes */}
                      <Route
                        path="/doctor"
                        element={
                          <ProtectedRoute requiredRole="doctor">
                            <DoctorLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route
                          index
                          element={<Navigate to="/doctor/dashboard" replace />}
                        />
                        <Route path="dashboard" element={<DoctorDashboard />} />
                        <Route path="patients" element={<PatientList />} />
                        <Route path="patients/new" element={<DoctorNewPatient />} />
                        <Route
                          path="patients/profiles"
                          element={<PatientProfiles />}
                        />
                        <Route path="cases" element={<CaseManagement />} />
                        <Route path="cases/new" element={<CaseNew />} />
                        <Route path="cases/archived" element={<DoctorArchivedCases />} />
                        <Route path="cases/:caseId" element={<CaseDetailsPage />} />
                        <Route
                          path="recommendations"
                          element={<Recommendations />}
                        />
                        <Route
                          path="patients/:patientId/cases"
                          element={<CaseHistory />}
                        />
                        <Route
                          path="patients/:patientId/cases/:caseId"
                          element={<CaseDetails />}
                        />
                        <Route
                          path="patients/:patientId/cases/:caseId/analyze"
                          element={<NewPatientCase />}
                        />
                        <Route
                          path="patients/:patientId/new-case"
                          element={<NewPatientCase />}
                        />
                        <Route path="profile" element={<DoctorProfile />} />
                        <Route path="settings" element={<DoctorSettings />} />
                      </Route>

                      {/* Nurse Routes */}
                      <Route
                        path="/nurse"
                        element={
                          <ProtectedRoute requiredRole="nurse">
                            <NurseLayout />
                          </ProtectedRoute>
                        }
                      >
                        <Route
                          index
                          element={<Navigate to="/nurse/dashboard" replace />}
                        />
                        <Route path="dashboard" element={<NurseDashboard />} />
                        <Route path="patients" element={<NursePatientsList />} />
                        <Route path="patients/archived" element={<NurseArchivedPatients />} />
                        <Route
                          path="patients/:id"
                          element={<NursePatientDetail />}
                        />
                        <Route path="vitals" element={<NurseVitals />} />
                        <Route path="medications" element={<NurseMedications />} />
                        <Route path="schedule" element={<NurseSchedule />} />
                        <Route path="tasks" element={<NurseTasks />} />
                        <Route path="messages" element={<NurseMessages />} />
                        <Route path="settings" element={<NurseSettings />} />
                        <Route path="profile" element={<NurseProfile />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </ClinicalDataProvider>
              </AdminDataProvider>
            </NotificationProvider>
          </LanguageProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
