import { createContext, useContext, useEffect, useState, useCallback } from "react";
import userService, { User } from "../services/userService";
import dashboardService, { SuperadminDashboardStats } from "../services/dashboardService";
import { useAuth } from "./AuthContext";

// Admin User Type - maps to backend User
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "nurse";
  status: "active" | "inactive";
  dateAdded: string;
  password?: string;
}

// Activity type from backend
export interface Activity {
  id: string;
  user_name: string;
  user_role: string | null;
  action: string;
  entity_type: string;
  description: string;
  created_at: string;
}

interface AdminDataContextType {
  // Data
  users: AdminUser[];
  activities: Activity[];
  userGrowth7Days: { day: string; users: number }[];

  // Loading states
  isLoading: boolean;
  isUsersLoading: boolean;
  isStatsLoading: boolean;
  error: string | null;

  // Actions
  addUser: (user: Omit<AdminUser, "id" | "dateAdded">) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<AdminUser>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Stats
  totalDoctors: number;
  totalNurses: number;
  totalActiveCases: number;
  totalActiveUsers: number;
  totalUsers: number;
  roleDistribution: { name: string; value: number; color: string }[];
}

const AdminDataContext = createContext<AdminDataContextType | undefined>(
  undefined
);

// Helper to convert backend User to AdminUser
function mapUserToAdminUser(user: User): AdminUser {
  return {
    id: user.id,
    name: user.full_name || user.email,
    email: user.email,
    role: user.role as "doctor" | "nurse",
    status: user.is_active ? "active" : "inactive",
    dateAdded: user.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
  };
}

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, currentUser } = useAuth();
  const isAdmin = isAuthenticated && currentUser?.role === "admin";

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userGrowth7Days, setUserGrowth7Days] = useState<{ day: string; users: number }[]>([]);

  // Stats from dashboard
  const [stats, setStats] = useState<SuperadminDashboardStats | null>(null);

  // Loading states - start as false when not admin
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from API
  const refreshUsers = useCallback(async () => {
    if (!isAdmin) return;

    setIsUsersLoading(true);
    setError(null);
    try {
      // Fetch doctors and nurses (not superadmins)
      const response = await userService.getUsers({ page_size: 1000 });
      const filteredUsers = response.results
        .filter((u: User) => u.role === "doctor" || u.role === "nurse")
        .map(mapUserToAdminUser);
      setUsers(filteredUsers);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please try again.");
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin]);

  // Fetch dashboard stats from API
  const refreshStats = useCallback(async () => {
    if (!isAdmin) return;

    setIsStatsLoading(true);
    try {
      const dashboardStats = await dashboardService.getSuperadminStats();
      setStats(dashboardStats);
      setActivities(dashboardStats.recent_activities || []);

      // Map user growth data
      const growthData = dashboardStats.user_growth?.map((item) => ({
        day: item.date,
        users: item.count,
      })) || [];
      setUserGrowth7Days(growthData);
    } catch (err) {
      console.error("Failed to fetch dashboard stats:", err);
      // Don't set error for stats - just use defaults
    } finally {
      setIsStatsLoading(false);
    }
  }, [isAdmin]);

  // Add new user
  const addUser = async (newUser: Omit<AdminUser, "id" | "dateAdded">): Promise<boolean> => {
    try {
      await userService.createUser({
        email: newUser.email,
        password: newUser.password || "TempPassword123!",
        full_name: newUser.name,
        role: newUser.role,
      });

      // Refresh the users list
      await refreshUsers();
      return true;
    } catch (err: unknown) {
      console.error("Failed to add user:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to add user";
      setError(errorMessage);
      return false;
    }
  };

  // Update existing user
  const updateUser = async (id: string, updates: Partial<AdminUser>): Promise<boolean> => {
    try {
      const updateData: Partial<User> & { full_name?: string } = {};

      if (updates.name) updateData.full_name = updates.name;
      if (updates.email) updateData.email = updates.email;
      if (updates.role) updateData.role = updates.role;
      if (updates.status) updateData.is_active = updates.status === "active";

      await userService.updateUser(id, updateData);

      // Refresh the users list
      await refreshUsers();
      return true;
    } catch (err: unknown) {
      console.error("Failed to update user:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update user";
      setError(errorMessage);
      return false;
    }
  };

  // Delete user (archive - moves to UserArchive table)
  const deleteUser = async (id: string): Promise<boolean> => {
    try {
      await userService.deleteUser(id);

      // Refresh the users list
      await refreshUsers();
      return true;
    } catch (err: unknown) {
      console.error("Failed to delete user:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to delete user";
      setError(errorMessage);
      return false;
    }
  };

  // Initial data fetch - only when admin is authenticated
  useEffect(() => {
    if (isAdmin) {
      refreshUsers();
      refreshStats();
    }
  }, [isAdmin, refreshUsers, refreshStats]);

  // Derived values - use stats from API when available, fallback to local calculation
  const totalDoctors = stats?.total_doctors ?? users.filter((u) => u.role === "doctor").length;
  const totalNurses = stats?.total_nurses ?? users.filter((u) => u.role === "nurse").length;
  const totalActiveCases = stats?.active_cases ?? 0;
  const totalActiveUsers = users.filter((u) => u.status === "active").length;
  const totalUsers = stats?.total_users ?? users.length;

  // Role distribution for pie chart
  const roleDistribution = [
    {
      name: "Doctor",
      value: stats?.role_distribution?.doctors ?? totalDoctors,
      color: "#1E40AF",
    },
    {
      name: "Nurse",
      value: stats?.role_distribution?.nurses ?? totalNurses,
      color: "#60A5FA",
    },
    {
      name: "Admin",
      value: stats?.role_distribution?.superadmins ?? 0,
      color: "#10B981",
    },
  ].filter((item) => item.value > 0);

  const isLoading = isUsersLoading || isStatsLoading;

  return (
    <AdminDataContext.Provider
      value={{
        users,
        activities,
        userGrowth7Days,
        isLoading,
        isUsersLoading,
        isStatsLoading,
        error,
        addUser,
        updateUser,
        deleteUser,
        refreshUsers,
        refreshStats,
        totalDoctors,
        totalNurses,
        totalActiveCases,
        totalActiveUsers,
        totalUsers,
        roleDistribution,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  const context = useContext(AdminDataContext);
  if (context === undefined) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return context;
}
