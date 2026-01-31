import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { tokenManager } from "../services/api";
import authService, { UserProfile, mapRole } from "../services/authService";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "nurse" | "admin";
  avatarUrl?: string | null;
  phone?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  login: (credentials: {
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAvatar: (dataUrl: string | null) => void;
  updateProfile: (updates: Partial<Omit<User, "id" | "role">>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert backend UserProfile to frontend User
const mapUserProfileToUser = (profile: UserProfile): User => ({
  id: profile.id,
  name: profile.full_name,
  email: profile.email,
  role: mapRole(profile.role),
  avatarUrl: profile.profile_image_url,
  phone: profile.phone_number,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Restore session on mount - check for existing token
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenManager.getAccessToken();
      if (token) {
        try {
          const profile = await authService.getCurrentUser();
          setCurrentUser(mapUserProfileToUser(profile));
        } catch (error) {
          console.error("Failed to restore session:", error);
          tokenManager.clearTokens();
        }
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    console.log("🔐 LOGIN ATTEMPT:", credentials.email);
    
    try {
      // Call backend login endpoint
      await authService.login(credentials);
      
      // Get user profile
      const profile = await authService.getCurrentUser();
      const user = mapUserProfileToUser(profile);
      
      console.log("👤 Logged in user:", user);
      setCurrentUser(user);
      
      // Navigate based on role
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (user.role === "nurse") {
        navigate("/nurse/dashboard", { replace: true });
      }
    } catch (error: any) {
      console.error("❌ Login error:", error);
      const message = error.response?.data?.detail || 
                      error.response?.data?.message || 
                      "Invalid credentials";
      throw new Error(message);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      setCurrentUser(null);
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getCurrentUser();
      setCurrentUser(mapUserProfileToUser(profile));
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, []);

  const setAvatar = useCallback((dataUrl: string | null) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      return { ...prev, avatarUrl: dataUrl };
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<Omit<User, "id" | "role">>) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isLoading,
        setAvatar,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
