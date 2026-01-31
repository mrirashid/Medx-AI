import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "doctor" | "nurse";
}

export default function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#041939] text-white">
        Loading...
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" replace />;
  }

  // Check role if required
  if (requiredRole && currentUser.role !== requiredRole) {
    // Redirect to appropriate dashboard based on actual role
    if (currentUser.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (currentUser.role === "doctor") {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (currentUser.role === "nurse") {
      return <Navigate to="/nurse/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
