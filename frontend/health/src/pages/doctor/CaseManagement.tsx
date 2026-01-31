import { AlertCircle, AlertTriangle, Briefcase, Calendar, CheckCircle2, Eye, FileEdit, FileText, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/common/Pagination";
import { useDoctorCases } from "../../hooks/useDoctorData";
import caseService from "../../services/caseService";
import patientService from "../../services/patientService";

// Loading skeleton component
function CaseManagementSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-64"></div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-12"></div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-64 bg-gray-100"></div>
      </div>
    </div>
  );
}

export default function CaseManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "in_progress" | "complete" | "cancelled">("");
  const [riskFilter, setRiskFilter] = useState<"" | "critical" | "high" | "medium" | "low">("");
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatingReportFor, setGeneratingReportFor] = useState<string | null>(null);

  const {
    cases,
    pagination,
    currentPage,
    pageSize,
    loading,
    error,
    updateFilters,
    goToPage,
    refetch
  } = useDoctorCases();

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    const timeoutId = setTimeout(() => {
      updateFilters({
        search: value || undefined,
        status: statusFilter || undefined,
        risk_level: riskFilter || undefined
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [updateFilters, statusFilter, riskFilter]);

  const handleStatusChange = useCallback((value: string) => {
    const status = value as "" | "draft" | "in_progress" | "complete" | "cancelled";
    setStatusFilter(status);
    updateFilters({
      search: searchTerm || undefined,
      status: status || undefined,
      risk_level: riskFilter || undefined
    });
  }, [updateFilters, searchTerm, riskFilter]);

  const handleRiskChange = useCallback((value: string) => {
    const risk = value as "" | "critical" | "high" | "medium" | "low";
    setRiskFilter(risk);
    updateFilters({
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      risk_level: risk || undefined
    });
  }, [updateFilters, searchTerm, statusFilter]);

  const handleDeleteCase = async () => {
    if (!toDelete) return;

    setDeleting(true);
    try {
      await caseService.deleteCase(toDelete.id.toString());
      setSuccessMessage(`Case ${toDelete.case_code || toDelete.id} has been deleted.`);
      setToDelete(null);
      refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error deleting case:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Calculate counts
  const counts = {
    total: pagination.count,
    draft: cases.filter(c => c.status === 'draft').length,
    inProgress: cases.filter(c => c.status === 'in_progress').length,
    complete: cases.filter(c => c.status === 'complete').length,
    critical: cases.filter(c => c.risk_level?.toLowerCase() === 'critical' || c.risk_level?.toLowerCase() === 'high').length,
  };

  // Generate comprehensive case report (same style as patient report)
  const handleGenerateReport = async (caseItem: any) => {
    setGeneratingReportFor(caseItem.id);
    try {
      // Fetch full case details
      const caseDetails = await caseService.getCase(caseItem.id);
      
      // Fetch predictions and recommendations
      const [predictions, recommendations] = await Promise.all([
        caseService.getPredictions(caseItem.id),
        caseService.getRecommendations(caseItem.id)
      ]);

      // Fetch patient details if we have patient ID
      let patient = null;
      if (caseDetails.patient) {
        try {
          patient = await patientService.getPatient(caseDetails.patient);
        } catch (e) {
          console.warn('Could not fetch patient details:', e);
        }
      }

      // Generate the comprehensive report
      caseService.generateComprehensiveCaseReport({
        caseData: {
          ...caseDetails,
          patient_name: caseItem.patient_name || patient?.full_name || 'Unknown Patient',
          patient_code: caseItem.patient_code || patient?.patient_code,
        },
        patient,
        predictions: predictions.results,
        recommendations: recommendations.results,
      });
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReportFor(null);
    }
  };

  // Show loading state
  if (loading && cases.length === 0) {
    return <CaseManagementSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Failed to load cases</h3>
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Cases</h1>
          <p className="text-gray-600 mt-1">View and manage all patient cases ({pagination.count} total)</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Cases",
            value: counts.total,
            icon: Briefcase,
            color: "blue",
            onClick: () => { setRiskFilter(""); handleRiskChange(""); }
          },
          {
            label: "Critical/High",
            value: counts.critical,
            icon: AlertTriangle,
            color: "red",
            onClick: () => handleRiskChange("critical")
          },
          {
            label: "Draft",
            value: counts.draft,
            icon: FileEdit,
            color: "gray",
            onClick: () => handleStatusChange("draft")
          },
          {
            label: "In Progress",
            value: counts.inProgress,
            icon: Loader2,
            color: "amber",
            onClick: () => handleStatusChange("in_progress")
          },
          {
            label: "Complete",
            value: counts.complete,
            icon: CheckCircle2,
            color: "green",
            onClick: () => handleStatusChange("complete")
          },
        ].map((card) => {
          const Icon = card.icon;
          const colorClasses = {
            blue: "bg-blue-50 group-hover:bg-blue-100 text-blue-600",
            red: "bg-red-50 group-hover:bg-red-100 text-red-600",
            gray: "bg-gray-50 group-hover:bg-gray-100 text-gray-600",
            amber: "bg-amber-50 group-hover:bg-amber-100 text-amber-600",
            green: "bg-green-50 group-hover:bg-green-100 text-green-600",
          };
          return (
            <div
              key={card.label}
              onClick={card.onClick}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">
                    {card.value}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-lg transition-colors ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search cases by code or patient..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
          <select
            value={riskFilter}
            onChange={(e) => handleRiskChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Case Code
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Risk Level
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Prediction
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cases.map((caseItem) => (
                <tr
                  key={caseItem.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-gray-900">
                      {caseItem.case_code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {caseItem.patient_name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {caseItem.patient_code || ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${caseItem.risk_level === 'critical' || caseItem.risk_level === 'Critical'
                      ? 'bg-red-100 text-red-800'
                      : caseItem.risk_level === 'high' || caseItem.risk_level === 'High'
                        ? 'bg-orange-100 text-orange-800'
                        : caseItem.risk_level === 'medium' || caseItem.risk_level === 'Medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : caseItem.risk_level === 'low' || caseItem.risk_level === 'Low'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                      {caseItem.risk_level || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(caseItem.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${caseItem.status === "complete"
                        ? "bg-green-100 text-green-800"
                        : caseItem.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : caseItem.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {caseItem.status === "in_progress" ? "In Progress" : caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {caseItem.has_prediction ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          ✓ Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          No
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/doctor/cases/${caseItem.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Case"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateReport(caseItem)}
                        disabled={generatingReportFor === caseItem.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Generate Report"
                      >
                        {generatingReportFor === caseItem.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setToDelete(caseItem)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Case"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalCount={pagination.count}
            pageSize={pageSize}
            onPageChange={goToPage}
          />
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-md w-full max-w-md">
            <div className="p-4 border-b">
              <div className="font-semibold text-red-600">Delete Case</div>
            </div>
            <div className="p-4 text-sm text-gray-600">
              Are you sure you want to delete case{" "}
              <span className="font-mono font-medium text-gray-900">
                {toDelete.case_code || toDelete.id}
              </span>
              ? This action cannot be undone.
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-3 py-2 text-sm rounded-md border bg-white hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCase}
                disabled={deleting}
                className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
