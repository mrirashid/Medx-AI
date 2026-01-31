import { useState, useEffect } from "react";
import { Archive, Loader2, RefreshCw, Search, Trash2, UserCheck, Users } from "lucide-react";
import patientService from "../../services/patientService";
import { usePreferences } from "../../contexts/PreferencesContext";
import Pagination from "../../components/common/Pagination";

interface DeletedPatient {
    id: string;
    patient_code: string;
    full_name: string;
    identity_number: string | null;
    gender: 'male' | 'female' | 'other';
    phone_number: string | null;
    assigned_doctor_name?: string;
    created_at: string;
    deleted_at?: string;
}

export default function ArchivedPatients() {
    const { language, timezone } = usePreferences();
    const [deletedPatients, setDeletedPatients] = useState<DeletedPatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState<DeletedPatient | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchDeletedPatients = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await patientService.getDeletedPatients();
            setDeletedPatients(response.patients as DeletedPatient[]);
        } catch (err) {
            console.error("Failed to fetch deleted patients:", err);
            setError("Failed to load deleted patients. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeletedPatients();
    }, []);

    const handleRestore = async (patient: DeletedPatient) => {
        setRestoringId(patient.id);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await patientService.restorePatient(patient.id);
            setSuccessMessage(result.message);
            setDeletedPatients((prev) => prev.filter((p) => p.id !== patient.id));
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to restore patient";
            setError(errorMessage);
        } finally {
            setRestoringId(null);
        }
    };

    const openDeleteModal = (patient: DeletedPatient) => {
        setPatientToDelete(patient);
        setShowDeleteModal(true);
    };

    const handlePermanentDelete = async () => {
        if (!patientToDelete) return;

        setDeletingId(patientToDelete.id);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await patientService.permanentDeletePatient(patientToDelete.id);
            setSuccessMessage(result.message);
            setDeletedPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
            setShowDeleteModal(false);
            setPatientToDelete(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete patient";
            setError(errorMessage);
        } finally {
            setDeletingId(null);
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

    const filteredPatients = deletedPatients.filter(
        (patient) =>
            patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.patient_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (patient.identity_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    );

    // Paginated patients
    const paginatedPatients = filteredPatients.slice(
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
                    <h1 className="text-3xl font-bold text-gray-900">Archived Patients</h1>
                    <p className="text-gray-600 mt-1">
                        View, restore, or permanently delete archived patients
                    </p>
                </div>
                <button
                    onClick={fetchDeletedPatients}
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
                    <UserCheck className="w-5 h-5" />
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
                        placeholder="Search by name, patient code, or ID number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Deleted Patients Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading archived patients...</span>
                    </div>
                ) : filteredPatients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <Users className="w-16 h-16 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No archived patients</p>
                        <p className="text-sm">Deleted patients will appear here</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Patient
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Patient Code
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gender
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Assigned Doctor
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
                            {paginatedPatients.map((patient) => (
                                <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                <span className="text-purple-600 font-medium">
                                                    {patient.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{patient.full_name}</p>
                                                <p className="text-sm text-gray-500">{patient.identity_number || "N/A"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-gray-700">{patient.patient_code}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${patient.gender === "male"
                                            ? "bg-blue-100 text-blue-800"
                                            : patient.gender === "female"
                                                ? "bg-pink-100 text-pink-800"
                                                : "bg-gray-100 text-gray-800"
                                            }`}>
                                            {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {patient.assigned_doctor_name || "Unassigned"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {formatDate(patient.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleRestore(patient)}
                                                disabled={restoringId === patient.id || deletingId === patient.id}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                                            >
                                                {restoringId === patient.id ? (
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
                                            <button
                                                onClick={() => openDeleteModal(patient)}
                                                disabled={restoringId === patient.id || deletingId === patient.id}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                                                title="Permanently delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {filteredPatients.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <Pagination
                            currentPage={currentPage}
                            totalCount={filteredPatients.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-1">About Archived Patients</h3>
                <p className="text-sm text-blue-700">
                    When a patient is deleted, they are moved to this archive along with all their cases.
                    <strong> Restoring</strong> a patient will also restore all related cases and predictions.
                    <strong> Permanently deleting</strong> will remove the patient and ALL related data (cases, predictions, recommendations).
                </p>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && patientToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Permanently Delete Patient?
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to permanently delete{" "}
                            <span className="font-semibold">{patientToDelete.full_name}</span> (
                            {patientToDelete.patient_code})?
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                            <p className="text-red-700 text-sm font-medium">
                                This action cannot be undone!
                            </p>
                            <p className="text-red-600 text-sm mt-1">
                                All cases, predictions, and recommendations for this patient will also be permanently deleted.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setPatientToDelete(null);
                                }}
                                disabled={deletingId !== null}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePermanentDelete}
                                disabled={deletingId !== null}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deletingId !== null ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Permanently
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
