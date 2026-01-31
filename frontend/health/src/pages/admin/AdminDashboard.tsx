import { Activity, Loader2, UserCheck, UserPlus, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminData } from "../../contexts/AdminDataContext";

export default function AdminDashboard() {
  const {
    totalDoctors,
    totalNurses,
    totalActiveUsers,
    totalUsers,
    roleDistribution,
    userGrowth7Days,
    activities,
    isLoading,
    totalActiveCases,
  } = useAdminData();
  // Basic Malay translations when language preference is ms-MY
  const t = (key: string) => {
    const lang =
      (localStorage.getItem("preferences") &&
        JSON.parse(localStorage.getItem("preferences") || "{}").language) ||
      "en-US";
    if (lang !== "ms-MY") return key;
    const dict: Record<string, string> = {
      "Total Users": "Jumlah Pengguna",
      "Total Doctors": "Jumlah Doktor",
      "Total Nurses": "Jumlah Jururawat",
      "Active Users": "Pengguna Aktif",
      "User Roles Distribution": "Taburan Peranan Pengguna",
      "User Growth (7 Days)": "Pertumbuhan Pengguna (7 Hari)",
      "Recent Activity": "Aktiviti Terkini",
    };
    return dict[key] || key;
  };

  const statsCards = [
    {
      title: t("Total Users"),
      value: totalUsers,
      icon: Users,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: t("Total Doctors"),
      value: totalDoctors,
      icon: UserPlus,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: t("Total Nurses"),
      value: totalNurses,
      icon: Users,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: t("Active Cases"),
      value: totalActiveCases,
      icon: Activity,
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    
  ];

  // Format relative time for activities
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Roles Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {t("User Roles Distribution")}
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ value }) => `${value}%`}
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-sm">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth (7 Days) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {t("User Growth (7 Days)")}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userGrowth7Days}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="users" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-gray-700" />
          <h3 className="text-xl font-semibold text-gray-900">
            {t("Recent Activity")}
          </h3>
        </div>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.slice(0, 7).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 text-gray-700"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>
                    {activity.user_role && (
                      <span className="text-gray-500"> ({activity.user_role})</span>
                    )}{" "}
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatActivityTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
