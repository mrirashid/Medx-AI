import { ArrowLeft, Eye, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import caseService from "../../services/caseService";
import patientService from "../../services/patientService";
import { useTranslation } from "../../utils/translations";
import Pagination from "../../components/common/Pagination";

interface Case {
  id: string | number;
  created_at: string;
  risk_level?: string | null;
  has_prediction?: boolean;
  has_recommendation?: boolean;
  status: string;
}

export default function CaseHistory() {
  const { patientId = "" } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { language } = usePreferences();
  const { t } = useTranslation(language);

  // State for patient and cases
  const [patient, setPatient] = useState<any | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Case | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Fetch patient and cases
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const [patientData, casesData] = await Promise.all([
        patientService.getPatient(patientId),
        caseService.getCases({ patient: patientId, page }),
      ]);

      setPatient(patientData);
      setCases(casesData.results || casesData || []);
      setTotalCount(casesData.count || 0);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData(currentPage);
  }, [patientId, currentPage, fetchData]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const handleRefresh = () => {
    fetchData(currentPage);
  };

  const handleDeleteCase = async () => {
    if (!toDelete) return;

    setDeleting(true);
    try {
      await caseService.deleteCase(toDelete.id.toString());
      setSuccessMessage(`Case ${toDelete.id} has been successfully deleted.`);
      setToDelete(null);
      fetchData(currentPage); // Refresh the list

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Error deleting case:", err);
      setError("Failed to delete case. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-8">
        <div className="text-center text-red-500">{error || "Patient not found"}</div>
      </div>
    );
  }

  // Calculate age from DOB
  const dob = patient.date_of_birth || patient.dob;
  const age = dob
    ? Math.floor(
      (new Date().getTime() - new Date(dob).getTime()) /
      (1000 * 3600 * 24 * 365.25)
    )
    : null;

  return (
    <div className="p-8 space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/doctor/patients")}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("cases.title")}
            </h1>
            <p className="text-gray-600 mt-1">
              {patient.full_name || patient.name} - ID: {patient.id} | Age: {age || "--"} | Gender:{" "}
              {patient.gender}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={() => navigate(`/doctor/patients/${patientId}/new-case`)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Create New Case
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Case ID
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Created
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Level
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Has Prediction
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Has Recommendation
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cases.map((c) => {
              const riskLevel = c.risk_level || "Low";
              const status = c.status || "pending";
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-gray-900">{c.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {new Date(c.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskLevel === "High" || riskLevel === "Critical" || riskLevel === "high" || riskLevel === "critical"
                        ? "bg-red-100 text-red-800"
                        : riskLevel === "Medium" || riskLevel === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                        }`}
                    >
                      {riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {c.has_prediction ? (
                      <span className="text-green-600 text-lg">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {c.has_recommendation ? (
                      <span className="text-green-600 text-lg">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status === "complete" || status === "completed"
                        ? "bg-green-100 text-green-800"
                        : status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : status === "draft"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                    >
                      {status === "in_progress" ? "In Progress" :
                        status === "complete" || status === "completed" ? "Complete" :
                          status === "draft" ? "Draft" : status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `/doctor/patients/${patientId}/cases/${c.id}`;
                          console.log("Navigating to case details:", url);
                          navigate(url);
                        }}
                        className="text-blue-600 hover:text-blue-700 transition-colors p-2 rounded hover:bg-blue-50 cursor-pointer"
                        title="View Case Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setToDelete(c)}
                        className="text-red-600 hover:text-red-700 transition-colors p-2 rounded hover:bg-red-50 cursor-pointer"
                        title="Delete Case"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <p className="mb-2">No cases found for this patient</p>
                    <button
                      onClick={() =>
                        navigate(`/doctor/patients/${patientId}/new-case`)
                      }
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Create the first case
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={goToPage}
          />
        </div>
      </div>

      {toDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md w-full max-w-md">
            <div className="p-4 border-b">
              <div className="font-semibold">Delete Case</div>
            </div>
            <div className="p-4 text-sm text-gray-600">
              Are you sure you want to delete case{" "}
              <span className="font-mono font-medium text-gray-900">
                {toDelete.id}
              </span>
              ? This action cannot be undone.
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setToDelete(null)}
                className="px-3 py-2 text-sm rounded-md border bg-white"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCase}
                disabled={deleting}
                className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : t("cases.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
