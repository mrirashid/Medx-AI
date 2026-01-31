import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useTranslation } from "../../utils/translations";
import { useDoctorDashboard } from "../../hooks/useDoctorData";

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

function relativeTime(iso: string) {
  const now = new Date().getTime();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ringStyle(
  parts: { level: RiskLevel; count: number; color: string }[]
) {
  const total = parts.reduce((a, b) => a + b.count, 0) || 1;
  let acc = 0;
  const stops = parts.map((p) => {
    const start = (acc / total) * 100;
    acc += p.count;
    const end = (acc / total) * 100;
    return `${p.color} ${start}% ${end}%`;
  });
  return {
    background: `conic-gradient(${stops.join(", ")})`,
  } as React.CSSProperties;
}

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-48"></div>
        <div className="h-10 bg-gray-200 rounded w-64"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:basis-[50%]">
          <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
          <div className="h-48 bg-gray-100 rounded"></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:basis-[50%]">
          <div className="h-6 bg-gray-200 rounded w-40 mb-6"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function DoctorDashboard() {
  const { currentUser } = useAuth();
  const { language } = usePreferences();
  const { t } = useTranslation(language);
  const { stats, loading, error, refetch } = useDoctorDashboard();
  const navigate = useNavigate();

  // Parse risk distribution from backend
  const riskCounts = useMemo(() => {
    if (!stats?.risk_distribution) {
      return { Low: 0, Medium: 0, High: 0, Critical: 0 };
    }
    return {
      Low: stats.risk_distribution.low || 0,
      Medium: stats.risk_distribution.medium || 0,
      High: stats.risk_distribution.high || 0,
      Critical: stats.risk_distribution.critical || 0,
    };
  }, [stats]);

  const parts: { level: RiskLevel; count: number; color: string }[] = [
    { level: "Low", count: riskCounts.Low, color: "#93c5fd" },
    { level: "Medium", count: riskCounts.Medium, color: "#fbbf24" },
    { level: "High", count: riskCounts.High, color: "#f97316" },
    { level: "Critical", count: riskCounts.Critical, color: "#ef4444" },
  ];

  // Build 7 day trend data from backend daily_cases
  const trendData = useMemo(() => {
    if (stats?.daily_cases && stats.daily_cases.length > 0) {
      // Use real data from backend
      return stats.daily_cases.map((day: any, index: number) => ({
        label: day.day_name === 'Today' ? 'Today' : `${new Date(day.date).getMonth() + 1}/${new Date(day.date).getDate()}`,
        fullDate: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cases: day.count,
        dayName: day.day_name,
      }));
    }

    // Fallback to empty data
    const today = new Date();
    const days: { label: string; fullDate: string; cases: number; dayName: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const isToday = i === 0;
      const dayName = isToday ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      const label = isToday ? "Today" : `${d.getMonth() + 1}/${d.getDate()}`;
      const fullDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ label, fullDate, cases: 0, dayName });
    }
    return days;
  }, [stats]);

  // Format recent cases for display
  const recentCases = useMemo(() => {
    if (!stats?.recent_cases) return [];
    return stats.recent_cases.map(c => ({
      id: c.case_code,
      caseId: c.id,
      patientId: c.patient,
      patientName: c.patient_name,
      riskLevel: (c.risk_level || 'Unknown') as RiskLevel,
      status: c.status || 'draft',
      hasPrediction: c.has_prediction || false,
      hasRecommendation: c.has_recommendation || false,
      createdAt: c.created_at,
    }));
  }, [stats]);

  // Show loading state
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Failed to load dashboard</h3>
            <p className="text-red-600">{error}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const counts = {
    cases: stats?.total_cases || 0,
    casesThisWeek: stats?.cases_this_week || 0,
    pendingRecommendations: stats?.pending_recommendations || 0,
    activeCases: stats?.active_cases || 0,
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 mt-1">
            {t("dashboard.subtitle") || "Overview of your patients and cases"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {new Date().toLocaleDateString(language, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: t("dashboard.totalCases"),
            value: counts.cases,
            icon: Activity,
            color: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: t("dashboard.casesThisWeek"),
            value: counts.casesThisWeek,
            icon: CalendarDays,
            color: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: t("dashboard.pendingRecommendations"),
            value: counts.pendingRecommendations,
            icon: ClipboardList,
            color: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: t("dashboard.activeCases"),
            value: counts.activeCases,
            icon: CheckCircle2,
            color: "bg-blue-50",
            iconColor: "text-blue-600",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-2">{card.label}</p>
                  <p className="text-4xl font-bold text-gray-900">
                    {card.value}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Risk Level Distribution (50%) & Patient Age Distribution (50%) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col lg:basis-[50%] lg:flex-shrink-0">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {t("dashboard.riskDistribution")}
          </h3>
          <div className="flex flex-col items-center justify-center flex-1">
            <div
              className="relative w-48 h-48 rounded-full"
              style={ringStyle(parts)}
            >
              <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center shadow-inner">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {counts.cases}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("dashboard.totalCasesLabel")}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 w-full">
              {parts.map((p) => (
                <div key={p.level} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ background: p.color }}
                  />
                  <span className="text-gray-600">
                    {t(`risk.${p.level.toLowerCase()}`)}:
                  </span>
                  <span className="font-medium">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:basis-[50%]">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {t("dashboard.recentCases")}
          </h3>
          <div className="divide-y divide-gray-200">
            {recentCases.length === 0 && (
              <div className="text-sm text-gray-500 py-4">No recent cases</div>
            )}
            {recentCases.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/doctor/patients/${c.patientId}/cases/${c.caseId}`)}
                className="py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${c.riskLevel === "Critical"
                        ? "bg-red-500"
                        : c.riskLevel === "High"
                          ? "bg-orange-500"
                          : c.riskLevel === "Medium"
                            ? "bg-amber-400"
                            : c.riskLevel === "Low"
                              ? "bg-blue-400"
                              : "bg-gray-400"
                      }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.id}</p>
                    <p className="text-xs text-gray-500">{c.patientName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {relativeTime(c.createdAt)}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full border ${c.riskLevel === "Critical"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : c.riskLevel === "High"
                        ? "border-orange-200 bg-orange-50 text-orange-700"
                        : c.riskLevel === "Medium"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : c.riskLevel === "Low"
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                >
                  {c.riskLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cases Trend (full width) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {t("dashboard.casesTrend")}
          </h3>
          <div className="text-sm text-gray-500">
            This Week: {counts.casesThisWeek} cases
          </div>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f3f4f6"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                cursor={{
                  stroke: "#0ea5e9",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                contentStyle={{
                  fontSize: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelFormatter={(label, payload) => {
                  const data = payload?.[0]?.payload;
                  return data ? `${data.dayName} (${data.fullDate})` : label;
                }}
                formatter={(value: number) => [
                  `${value} case${value !== 1 ? "s" : ""}`,
                  "Cases",
                ]}
              />
              <Line
                type="monotone"
                dataKey="cases"
                stroke="#0ea5e9"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "#0ea5e9",
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
                activeDot={{
                  r: 6,
                  fill: "#0ea5e9",
                  strokeWidth: 2,
                  stroke: "#ffffff",
                }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Summary */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-sky-500"></div>
              <span>{t("dashboard.newCases")}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {t("dashboard.lastUpdated")}:{" "}
            {new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>

  );
}
