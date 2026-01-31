import { AlertCircle, Calendar, Check, CheckCircle2, Clock, Eye, RefreshCw, Search, Shield, X, XCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAllRecommendations } from "../../hooks/useDoctorData";
import Pagination from "../../components/common/Pagination";

// Loading skeleton component
function RecommendationsSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-96"></div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-24 bg-gray-100 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Recommendation {
  id: string;
  case: string;
  case_code?: string;
  patient_name?: string;
  status: 'draft' | 'saved' | 'discarded';
  clinical_assessment?: string;
  recommendation_text?: string;
  treatment_recommendations?: string;
  followup_schedule?: string;
  risk_mitigation?: string;
  created_at: string;
}

export default function Recommendations() {
  const navigate = useNavigate();
  const { recommendations, loading, error, refetch, updateStatus } = useAllRecommendations();
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Only show pending (draft) recommendations
  const pendingRecommendations = useMemo(() => {
    return recommendations.filter(r => r.status === 'draft');
  }, [recommendations]);

  // Filter based on search
  const filteredRecommendations = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return pendingRecommendations.filter(
      (rec) =>
        (rec.patient_name?.toLowerCase() || '').includes(term) ||
        (rec.case_code?.toLowerCase() || '').includes(term)
    );
  }, [pendingRecommendations, searchTerm]);

  // Paginated recommendations
  const paginatedRecommendations = useMemo(() => {
    return filteredRecommendations.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredRecommendations, currentPage, pageSize]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleStatusUpdate = async (caseId: string, recId: string, status: 'saved' | 'discarded') => {
    try {
      setUpdating(recId);
      await updateStatus(caseId, recId, status);
      setSelectedRec(null);
      setSuccessMessage(status === 'saved' ? 'Recommendation accepted!' : 'Recommendation rejected.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdating(null);
    }
  };

  const parseArray = (data: string | string[] | undefined): string[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [data];
    } catch {
      return [data];
    }
  };

  // Show loading state
  if (loading) {
    return <RecommendationsSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-800">Failed to load recommendations</h3>
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
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Reviews</h1>
          <p className="text-gray-600 mt-1">
            Review and approve AI-generated treatment recommendations ({filteredRecommendations.length} pending)
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

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by patient name or case code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Pending Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">All Caught Up!</h3>
            <p className="text-gray-500">No pending recommendations to review.</p>
          </div>
        )}

        {paginatedRecommendations.map((rec) => (
          <div
            key={rec.id}
            onClick={() => setSelectedRec(rec as Recommendation)}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {(rec.patient_name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {rec.patient_name || 'Unknown Patient'}
                    </h3>
                    <span className="text-sm font-mono text-gray-500">
                      {rec.case_code || 'No Case Code'}
                    </span>
                  </div>
                </div>

                {rec.clinical_assessment && (
                  <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                    {rec.clinical_assessment}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(rec.created_at).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    Pending Review
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Eye className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-blue-600 font-medium">View Details</span>
              </div>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {filteredRecommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
            <Pagination
              currentPage={currentPage}
              totalCount={filteredRecommendations.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRec && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review Recommendation</h2>
                <p className="text-sm text-gray-500">
                  {selectedRec.patient_name} • {selectedRec.case_code}
                </p>
              </div>
              <button
                onClick={() => setSelectedRec(null)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Clinical Assessment */}
              {selectedRec.clinical_assessment && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Clinical Assessment
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900">
                    {selectedRec.clinical_assessment}
                  </div>
                </div>
              )}

              {/* Treatment Recommendations */}
              {selectedRec.treatment_recommendations && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Treatment Recommendations
                  </h3>
                  <div className="bg-green-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {parseArray(selectedRec.treatment_recommendations).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                          <span className="text-green-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Follow-up Schedule */}
              {selectedRec.followup_schedule && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" /> Follow-up Schedule
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {parseArray(selectedRec.followup_schedule).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Risk Mitigation */}
              {selectedRec.risk_mitigation && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600" /> Risk Mitigation
                  </h3>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {parseArray(selectedRec.risk_mitigation).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-orange-800">
                          <span className="text-orange-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Fallback for recommendation_text if no structured data */}
              {!selectedRec.treatment_recommendations && selectedRec.recommendation_text && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" /> AI Recommendation
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-900 whitespace-pre-line">
                    {selectedRec.recommendation_text}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Generated: {new Date(selectedRec.created_at).toLocaleString()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex items-center justify-between sticky bottom-0 bg-white">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleStatusUpdate(selectedRec.case, selectedRec.id, 'saved')}
                  disabled={updating === selectedRec.id}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  {updating === selectedRec.id ? 'Saving...' : 'Accept & Save'}
                </button>
                <button
                  onClick={() => handleStatusUpdate(selectedRec.case, selectedRec.id, 'discarded')}
                  disabled={updating === selectedRec.id}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  {updating === selectedRec.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
              <button
                onClick={() => setSelectedRec(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
