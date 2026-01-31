import { AlertCircle, Eye, FileText, Loader2, RefreshCw, Search } from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDoctorPatients } from "../../hooks/useDoctorData";
import Pagination from "../../components/common/Pagination";
import patientService from "../../services/patientService";
import caseService from "../../services/caseService";

// Loading skeleton component
function PatientListSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PatientList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"" | "male" | "female" | "other">("");
  const [generatingReportFor, setGeneratingReportFor] = useState<string | null>(null);

  const {
    patients,
    pagination,
    currentPage,
    pageSize,
    loading,
    error,
    updateFilters,
    goToPage,
    refetch
  } = useDoctorPatients();

  // Generate comprehensive patient report
  const handleGenerateReport = async (patientId: string) => {
    setGeneratingReportFor(patientId);
    try {
      // Fetch patient details
      const patient = await patientService.getPatient(patientId);

      // Fetch all cases for this patient
      const casesResponse = await patientService.getPatientCases(patientId);

      // Fetch predictions and recommendations for each case
      const casesWithDetails = await Promise.all(
        casesResponse.cases.map(async (c) => {
          const [caseDetails, predictions, recommendations] = await Promise.all([
            caseService.getCase(c.id),
            caseService.getPredictions(c.id),
            caseService.getRecommendations(c.id)
          ]);

          return {
            id: c.id,
            case_code: c.case_code,
            status: c.status,
            risk_level: caseDetails.risk_level,
            notes: caseDetails.notes,
            created_at: c.created_at,
            predictions: predictions.results.map(p => ({
              id: p.id,
              her2_status: p.her2_status,
              confidence: p.confidence,
              risk_level: p.risk_level,
              risk_score: p.risk_score,
              probabilities: p.probabilities,
              original_image_url: p.original_image_url,
              gradcam_url: p.gradcam_url,
              model_version: p.model_version,
              created_at: p.created_at
            })),
            recommendations: recommendations.results.map(r => ({
              id: r.id,
              status: r.status,
              clinical_assessment: r.clinical_assessment,
              treatment_recommendations: r.treatment_recommendations,
              followup_schedule: r.followup_schedule,
              risk_mitigation: r.risk_mitigation,
              created_at: r.created_at
            }))
          };
        })
      );

      // Generate the report
      patientService.generatePatientReport({
        patient,
        cases: casesWithDetails
      });
    } catch (err) {
      console.error("Error generating report:", err);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReportFor(null);
    }
  };

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    // Apply filters after user stops typing
    const timeoutId = setTimeout(() => {
      updateFilters({
        search: value || undefined,
        gender: genderFilter || undefined
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [updateFilters, genderFilter]);

  const handleGenderChange = useCallback((value: string) => {
    const gender = value as "" | "male" | "female" | "other";
    setGenderFilter(gender);
    updateFilters({
      search: searchQuery || undefined,
      gender: gender || undefined
    });
  }, [updateFilters, searchQuery]);

  // Show loading state
  if (loading && patients.length === 0) {
    return <PatientListSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Failed to load patients</h3>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 mt-1">
            All patients assigned to you ({pagination.count} total)
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search patients by name or code..."
            />
          </div>
          <select
            value={genderFilter}
            onChange={(e) => handleGenderChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full lg:w-40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Patient Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Age
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Total Cases
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Last Case Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-sm">
            {patients.map((p) => {
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {p.patient_code}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                    onClick={() => navigate(`/doctor/patients/${p.id}/cases`)}
                  >
                    {p.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.age || "--"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {p.gender}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.total_cases || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {p.last_case_date
                      ? new Date(p.last_case_date).toLocaleDateString("en-US", {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "--"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          navigate(`/doctor/patients/${p.id}/cases`)
                        }
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Cases"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleGenerateReport(p.id)}
                        disabled={generatingReportFor === p.id}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Generate Full Patient Report"
                      >
                        {generatingReportFor === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {patients.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>

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
    </div>
  );
}
