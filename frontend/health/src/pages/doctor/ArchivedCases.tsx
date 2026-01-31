import { useState, useEffect } from "react";
import { FileText, Loader2, RefreshCw, Search, CheckCircle } from "lucide-react";
import caseService, { Case } from "../../services/caseService";
import { usePreferences } from "../../contexts/PreferencesContext";
import Pagination from "../../components/common/Pagination";

export default function DoctorArchivedCases() {
    const { language, timezone } = usePreferences();
    const [deletedCases, setDeletedCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchDeletedCases = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await caseService.getDeletedCases();
            setDeletedCases(response.cases);
        } catch (err) {
            console.error("Failed to fetch deleted cases:", err);
            setError("Failed to load deleted cases. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeletedCases();
    }, []);

    const handleRestore = async (caseItem: Case) => {
        // Prevent double-clicking
        if (restoringId) return;

        setRestoringId(caseItem.id);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await caseService.restoreCase(caseItem.id);
            setSuccessMessage(result.message);
            setDeletedCases((prev) => prev.filter((c) => c.id !== caseItem.id));
        } catch (err: unknown) {
            // Extract error message from axios response
            let errorMessage = "Failed to restore case";
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { error?: string } } };
                errorMessage = axiosError.response?.data?.error || errorMessage;
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setRestoringId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat(language || "en-US", {
            timeZone: timezone || undefined,
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete':
                return 'bg-green-100 text-green-800';
            case 'in_progress':
                return 'bg-blue-100 text-blue-800';
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredCases = deletedCases.filter(
        (caseItem) =>
            caseItem.case_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (caseItem.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
            (caseItem.patient_code?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    // Paginated cases
    const paginatedCases = filteredCases.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Archived Cases</h1>
                    <p className="text-gray-600 mt-1">
                        View and restore deleted cases for your patients
                    </p>
                </div>
                <button
                    onClick={fetchDeletedCases}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by case code, patient name, or patient code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Deleted Cases Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading archived cases...</span>
                    </div>
                ) : filteredCases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <FileText className="w-16 h-16 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No archived cases</p>
                        <p className="text-sm">Deleted cases for your patients will appear here</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Case Code
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Patient
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Risk Level
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedCases.map((caseItem) => (
                                <tr key={caseItem.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="font-mono text-sm text-gray-900">{caseItem.case_code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">{caseItem.patient_name || "Unknown"}</p>
                                            <p className="text-sm text-gray-500">{caseItem.patient_code || "N/A"}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                                            {caseItem.status.replace('_', ' ').charAt(0).toUpperCase() + caseItem.status.slice(1).replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {caseItem.risk_level ? (
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${caseItem.risk_level === 'high' || caseItem.risk_level === 'critical'
                                                ? 'bg-red-100 text-red-800'
                                                : caseItem.risk_level === 'medium'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-green-100 text-green-800'
                                                }`}>
                                                {caseItem.risk_level.charAt(0).toUpperCase() + caseItem.risk_level.slice(1)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {formatDate(caseItem.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={() => handleRestore(caseItem)}
                                                disabled={restoringId === caseItem.id}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                                            >
                                                {restoringId === caseItem.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Restoring...
                                                    </>
                                                ) : (
                                                    <>
                                                        <RefreshCw className="w-4 h-4" />
                                                        Restore
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {filteredCases.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <Pagination
                            currentPage={currentPage}
                            totalCount={filteredCases.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-1">About Archived Cases</h3>
                <p className="text-sm text-blue-700">
                    When a case is deleted, it is moved to this archive along with all predictions and recommendations.
                    <strong> Restoring</strong> a case will also restore all related predictions and recommendations.
                    Note: Cases whose parent patient is deleted cannot be restored until the patient is restored first.
                    Contact a system administrator if you need to permanently delete case records.
                </p>
            </div>
        </div>
    );
}
