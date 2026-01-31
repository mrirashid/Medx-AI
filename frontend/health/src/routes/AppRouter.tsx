import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ClinicalDataProvider } from "../contexts/ClinicalDataContext";
import { PreferencesProvider } from "../contexts/PreferencesContext";
import AdminLayout from "../layouts/AdminLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import NurseLayout from "../layouts/NurseLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminLogin from "../pages/admin/AdminLogin";
import DoctorDashboard from "../pages/doctor/Dashboard";
import DoctorProfile from "../pages/doctor/DoctorProfile";
import DoctorSettings from "../pages/doctor/DoctorSettings";
import PatientList from "../pages/doctor/PatientList";
import CaseHistory from "../pages/doctor/CaseHistory";
import CaseDetails from "../pages/doctor/CaseDetails";
import NewCase from "../pages/doctor/NewCase";
import NurseSettings from "../pages/nurse/AccountSettings";
import NurseDashboard from "../pages/nurse/Dashboard";
import NurseProfile from "../pages/nurse/NurseProfile";
import NursePatients from "../pages/nurse/PatientsList";

function PrivateRoute({
  children,
  allowed,
}: {
  children: React.ReactElement;
  allowed: Array<"admin" | "doctor" | "nurse">;
}) {
  const { currentUser, isAuthenticated } = useAuth();
  console.log("PrivateRoute check:", {
    isAuthenticated,
    currentUser,
    allowed,
    userRole: currentUser?.role,
    isAllowed: currentUser ? allowed.includes(currentUser.role) : false,
  });

  if (!isAuthenticated || !currentUser) {
    console.log(" Not authenticated, redirecting to login");
    return <Navigate to="/admin/login" replace />;
  }
  if (!allowed.includes(currentUser.role)) {
    console.log(
      ` Role ${currentUser.role} not in allowed list ${allowed}, redirecting to login`
    );
    return <Navigate to="/admin/login" replace />;
  }
  console.log(" Access granted");
  return children;
}

function AppContent() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <PrivateRoute allowed={["admin"]}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>

      {/* Doctor */}
      <Route
        path="/doctor/*"
        element={
          <PrivateRoute allowed={["doctor"]}>
            <DoctorLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="patients" element={<PatientList />} />
        <Route path="patients/:patientId/new-case" element={<NewCase />} />
        <Route path="patients/:patientId/cases/:caseId/analyze" element={<NewCase />} />
        <Route path="patients/:patientId/cases/:caseId" element={<CaseDetails />} />
        <Route path="patients/:patientId/cases" element={<CaseHistory />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="settings" element={<DoctorSettings />} />
      </Route>

      {/* Nurse */}
      <Route
        path="/nurse/*"
        element={
          <PrivateRoute allowed={["nurse"]}>
            <NurseLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<NurseDashboard />} />
        <Route path="patients" element={<NursePatients />} />
        <Route path="profile" element={<NurseProfile />} />
        <Route path="settings" element={<NurseSettings />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <PreferencesProvider>
        <AuthProvider>
          <ClinicalDataProvider>
            <AppContent />
          </ClinicalDataProvider>
        </AuthProvider>
      </PreferencesProvider>
    </BrowserRouter>
  );
}
