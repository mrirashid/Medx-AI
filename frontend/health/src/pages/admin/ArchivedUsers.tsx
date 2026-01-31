import { useState, useEffect } from "react";
import { Archive, Loader2, RefreshCw, Search, Trash2, UserCheck } from "lucide-react";
import userService, { ArchivedUser } from "../../services/userService";
import { usePreferences } from "../../contexts/PreferencesContext";
import Pagination from "../../components/common/Pagination";

export default function ArchivedUsers() {
    const { language, timezone } = usePreferences();
    const [archivedUsers, setArchivedUsers] = useState<ArchivedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Delete confirmation modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<ArchivedUser | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchArchivedUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await userService.getArchivedUsers();
            setArchivedUsers(response.results);
        } catch (err) {
            console.error("Failed to fetch archived users:", err);
            setError("Failed to load archived users. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchArchivedUsers();
    }, []);

    const handleRestore = async (user: ArchivedUser) => {
        setRestoringId(user.id);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await userService.restoreUser(user.id);
            setSuccessMessage(result.message);
            setArchivedUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to restore user";
            setError(errorMessage);
        } finally {
            setRestoringId(null);
        }
    };

    const openDeleteModal = (user: ArchivedUser) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const handlePermanentDelete = async () => {
        if (!userToDelete) return;

        setDeletingId(userToDelete.id);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await userService.permanentDeleteUser(userToDelete.id);
            setSuccessMessage(result.message);
            setArchivedUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete user";
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

    const filteredUsers = archivedUsers.filter(
        (user) =>
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Paginated users
    const paginatedUsers = filteredUsers.slice(
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
                    <h1 className="text-3xl font-bold text-gray-900">Archived Users</h1>
                    <p className="text-gray-600 mt-1">
                        View, restore, or permanently delete archived users
                    </p>
                </div>
                <button
                    onClick={fetchArchivedUsers}
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
                        placeholder="Search archived users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Archived Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading archived users...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <Archive className="w-16 h-16 mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No archived users</p>
                        <p className="text-sm">Deleted users will appear here</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Archived At
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Original Date
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                <span className="text-gray-600 font-medium">
                                                    {user.full_name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                                <p className="text-sm text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${user.role === "doctor"
                                                ? "bg-blue-100 text-blue-800"
                                                : user.role === "nurse"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-purple-100 text-purple-800"
                                                }`}
                                        >
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {formatDate(user.archived_at)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleRestore(user)}
                                                disabled={restoringId === user.id || deletingId === user.id}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                                            >
                                                {restoringId === user.id ? (
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
                                                onClick={() => openDeleteModal(user)}
                                                disabled={restoringId === user.id || deletingId === user.id}
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
                {filteredUsers.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                        <Pagination
                            currentPage={currentPage}
                            totalCount={filteredUsers.length}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-800 mb-1">About Archived Users</h3>
                <p className="text-sm text-blue-700">
                    When a user is deleted, they are moved to this archive instead of being permanently removed.
                    You can <strong>restore</strong> any archived user to make them active again, or{" "}
                    <strong>permanently delete</strong> them if you're sure you no longer need their data.
                    Permanent deletion cannot be undone.
                </p>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Permanently Delete User?
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Are you sure you want to permanently delete{" "}
                            <span className="font-semibold">{userToDelete.full_name}</span> (
                            {userToDelete.email})?
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                            <p className="text-red-700 text-sm font-medium">
                                This action cannot be undone!
                            </p>
                            <p className="text-red-600 text-sm mt-1">
                                This user's account will be permanently removed. Patient and case data will be preserved but will show no assigned user.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
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
