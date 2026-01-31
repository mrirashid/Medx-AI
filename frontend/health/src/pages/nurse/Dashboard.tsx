import { TrendingUp, UserPlus, Users, Loader2, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useTranslation } from "../../utils/translations";
import dashboardService, { NurseDashboardStats } from "../../services/dashboardService";

export default function NurseDashboard() {
  const { currentUser } = useAuth();
  const { language } = usePreferences();
  const { t } = useTranslation(language);

  const [stats, setStats] = useState<NurseDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardService.getNurseStats();
        setStats(data);
      } catch (err: any) {
        console.error("Failed to fetch nurse dashboard stats:", err);
        setError(err.response?.data?.error || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Transform age distribution for chart
  const ageBuckets = stats
    ? [
      { name: "0-20", patients: stats.age_distribution["0-20"] },
      { name: "21-40", patients: stats.age_distribution["21-40"] },
      { name: "41-60", patients: stats.age_distribution["41-60"] },
      { name: "60+", patients: stats.age_distribution["60+"] },
    ]
    : [];

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hrs ago`;
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("nurse.dashboard.title") || "Nurse Dashboard"}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("nurse.dashboard.subtitle") || "Overview of Your Patients"}
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 flex items-center gap-2 shadow-sm">
          <Calendar className="w-4 h-4 text-blue-600" />
          {new Date().toLocaleDateString(language, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: "Total Patients",
            value: stats?.total_patients || 0,
            icon: Users,
            subtext: "Registered patients"
          },
          {
            label: "Added Today",
            value: stats?.patients_added_today || 0,
            icon: UserPlus,
            subtext: "New registrations"
          },
          {
            label: "Added This Week",
            value: stats?.patients_added_this_week || 0,
            icon: TrendingUp,
            subtext: "Weekly growth"
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-2">
                    {card.value}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <span className="text-gray-400 font-medium flex items-center gap-1">
                  {card.subtext}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Patient Age Distribution
              </h3>
              <p className="text-sm text-gray-500">Demographic breakdown</p>
            </div>
          </div>
          <div className="h-72">
            {ageBuckets.some((b) => b.patients > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageBuckets}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: "#eff6ff" }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar
                    dataKey="patients"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                No patient data available
              </div>
            )}
          </div>
        </div>

        {/* Gender Distribution Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Gender Distribution
            </h3>
            <p className="text-sm text-gray-500">Patient demographics</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[288px]">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Male", value: stats?.gender_distribution?.male || 0 },
                      { name: "Female", value: stats?.gender_distribution?.female || 0 },
                      { name: "Other", value: stats?.gender_distribution?.other || 0 },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ec4899" />
                    <Cell fill="#8b5cf6" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-gray-900">{stats?.total_patients || 0}</span>
              <span className="text-sm text-gray-500 font-medium">Total</span>
            </div>

            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600">Male ({stats?.gender_distribution?.male || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <span className="text-sm text-gray-600">Female ({stats?.gender_distribution?.female || 0})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span className="text-sm text-gray-600">Other ({stats?.gender_distribution?.other || 0})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Profile Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500">Latest actions and updates</p>
          </div>
        </div>
        <div className="space-y-6">
          {stats?.recent_activities && stats.recent_activities.length > 0 ? (
            stats.recent_activities.map((activity, idx) => (
              <div
                key={activity.id || idx}
                className="flex items-start gap-4 pb-6 border-l-2 border-gray-100 pl-4 relative last:pb-0"
              >
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white bg-blue-500 ring-4 ring-blue-50"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatRelativeTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">No recent activity recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
