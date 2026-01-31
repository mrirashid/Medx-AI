import { Edit, Eye, Loader2, Plus, Search, Trash2, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import patientService, {
  CreatePatientData,
  Doctor,
  Patient,
  UpdatePatientData,
} from "../../services/patientService";
import Pagination from "../../components/common/Pagination";

export default function PatientsList() {
  const [searchParams] = useSearchParams();

  // Data state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female" | "other">("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState<{
    full_name: string;
    identity_number: string;
    gender: "male" | "female" | "other";
    phone_number: string;
    dob: string;
    address: string;
    medical_history: string;
    email: string;
    emergency_contact_name: string;
    emergency_contact_relation: string;
    emergency_contact_phone: string;
    allergies: string;
    current_medications: string;
    assigned_doctor: string;
  }>({
    full_name: "",
    identity_number: "",
    gender: "male",
    phone_number: "",
    dob: "",
    address: "",
    medical_history: "",
    email: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_phone: "",
    allergies: "",
    current_medications: "",
    assigned_doctor: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState<{
    id: string;
    full_name: string;
    identity_number: string;
    gender: "male" | "female" | "other";
    phone_number: string;
    dob: string;
    email: string;
    address: string;
    emergency_contact_name: string;
    emergency_contact_relation: string;
    emergency_contact_phone: string;
    medical_history: string;
    allergies: string;
    current_medications: string;
    assigned_doctor: string;
  }>({
    id: "",
    full_name: "",
    identity_number: "",
    gender: "male",
    phone_number: "",
    dob: "",
    email: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_phone: "",
    medical_history: "",
    allergies: "",
    current_medications: "",
    assigned_doctor: "",
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Set default doctor when doctors load
  useEffect(() => {
    if (doctors.length > 0 && !form.assigned_doctor) {
      setForm((prev) => ({ ...prev, assigned_doctor: doctors[0].id }));
    }
  }, [doctors, form.assigned_doctor]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [patientsRes, doctorsRes] = await Promise.all([
        patientService.getPatients({ page_size: 1000 }),
        patientService.getDoctors(),
      ]);
      setPatients(patientsRes.results);
      setDoctors(doctorsRes);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.response?.data?.detail || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  };

  // Filter patients
  const filteredPatients = patients.filter((p) => {
    const q = query.trim().toLowerCase();
    const genderOk = genderFilter === "all" || p.gender === genderFilter;
    const text = `${p.full_name} ${p.patient_code} ${p.identity_number || ""}`.toLowerCase();
    return genderOk && (q === "" || text.includes(q));
  });

  // Paginated patients
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, genderFilter]);

  // Handle create patient
  const handleCreatePatient = async () => {
    if (!form.full_name || !form.identity_number || !form.phone_number || !form.assigned_doctor) {
      setFormError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const data: CreatePatientData = {
        full_name: form.full_name.trim(),
        identity_number: form.identity_number.trim(),
        gender: form.gender,
        phone_number: form.phone_number.trim(),
        dob: form.dob || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_relation: form.emergency_contact_relation.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
        medical_history: form.medical_history.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        current_medications: form.current_medications.trim() || undefined,
        assigned_doctor: form.assigned_doctor,
      };

      await patientService.createPatient(data);

      // Reset form and refresh list
      setForm({
        full_name: "",
        identity_number: "",
        gender: "male",
        phone_number: "",
        dob: "",
        address: "",
        medical_history: "",
        email: "",
        emergency_contact_name: "",
        emergency_contact_relation: "",
        emergency_contact_phone: "",
        allergies: "",
        current_medications: "",
        assigned_doctor: doctors[0]?.id || "",
      });
      setShowAdd(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to create patient:", err);
      setFormError(err.response?.data?.detail || err.response?.data?.identity_number?.[0] || "Failed to create patient");
    } finally {
      setSaving(false);
    }
  };

  // Handle update patient
  const handleUpdatePatient = async () => {
    if (!editForm.full_name || !editForm.identity_number || !editForm.phone_number) {
      setFormError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const data: UpdatePatientData = {
        full_name: editForm.full_name.trim(),
        identity_number: editForm.identity_number.trim(),
        gender: editForm.gender,
        phone_number: editForm.phone_number.trim(),
        dob: editForm.dob || undefined,
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        emergency_contact_name: editForm.emergency_contact_name.trim() || undefined,
        emergency_contact_relation: editForm.emergency_contact_relation.trim() || undefined,
        emergency_contact_phone: editForm.emergency_contact_phone.trim() || undefined,
        medical_history: editForm.medical_history.trim() || undefined,
        allergies: editForm.allergies.trim() || undefined,
        current_medications: editForm.current_medications.trim() || undefined,
        assigned_doctor: editForm.assigned_doctor || undefined,
      };

      await patientService.updatePatient(editForm.id, data);
      setShowEdit(false);
      fetchData();
    } catch (err: any) {
      console.error("Failed to update patient:", err);
      setFormError(err.response?.data?.detail || "Failed to update patient");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete patient
  const handleDeletePatient = async (patient: Patient) => {
    if (!confirm(`Are you sure you want to delete patient ${patient.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await patientService.deletePatient(patient.id);
      fetchData();
    } catch (err: any) {
      console.error("Failed to delete patient:", err);
      alert(err.response?.data?.detail || "Failed to delete patient");
    }
  };

  // Open edit modal
  const openEditModal = (patient: Patient) => {
    setEditForm({
      id: patient.id,
      full_name: patient.full_name,
      identity_number: patient.identity_number || "",
      gender: patient.gender,
      phone_number: patient.phone_number || "",
      dob: patient.dob || "",
      email: patient.email || "",
      address: patient.address || "",
      emergency_contact_name: patient.emergency_contact_name || "",
      emergency_contact_relation: patient.emergency_contact_relation || "",
      emergency_contact_phone: patient.emergency_contact_phone || "",
      medical_history: patient.medical_history || "",
      allergies: patient.allergies || "",
      current_medications: patient.current_medications || "",
      assigned_doctor: patient.assigned_doctor || "",
    });
    setFormError(null);
    setShowEdit(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading patients...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={fetchData} className="ml-4 underline">
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
            Manage patient records and information
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowAdd(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-5 h-5" /> Add Patient
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search patients by name, ID or IC..."
            />
          </div>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm w-full lg:w-40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Genders</option>
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
                Patient ID
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
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Assigned Doctor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-sm">
            {paginatedPatients.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {p.patient_code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                  {p.full_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.age ?? "--"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {p.gender}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.phone_number || "--"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(p.updated_at).toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.assigned_doctor_name || "Unassigned"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPatient(p)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      title="Edit Patient"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePatient(p)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete Patient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPatients.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  No patients found
                </td>
              </tr>
            )}
          </tbody>
        </table>

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

      {/* Add Patient Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setShowAdd(false)}
          />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl border border-gray-200 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Add New Patient
              </h2>
              <button
                onClick={() => !saving && setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter patient's full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IC/Passport Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.identity_number}
                  onChange={(e) => setForm({ ...form, identity_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 990101-01-1234"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 012-3456789"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="name@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123 Main St, City"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                      Name
                    </label>
                    <input
                      value={form.emergency_contact_name}
                      onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                      Relation
                    </label>
                    <input
                      value={form.emergency_contact_relation}
                      onChange={(e) => setForm({ ...form, emergency_contact_relation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Parent, Spouse"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      value={form.emergency_contact_phone}
                      onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Emergency contact phone"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical History
                </label>
                <textarea
                  value={form.medical_history}
                  onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Previous conditions, surgeries, etc."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies
                  </label>
                  <textarea
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Known allergies"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Medications
                  </label>
                  <textarea
                    value={form.current_medications}
                    onChange={(e) => setForm({ ...form, current_medications: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Current medications"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.assigned_doctor}
                  onChange={(e) => setForm({ ...form, assigned_doctor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {doctors.length === 0 && (
                    <option value="" disabled>
                      No doctors available
                    </option>
                  )}
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
                {doctors.length === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    No active doctors available. Please contact admin.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t p-6 flex items-center justify-end gap-3">
              <button
                disabled={saving}
                onClick={() => !saving && setShowAdd(false)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={saving || !form.full_name || !form.identity_number || !form.phone_number || !form.assigned_doctor}
                onClick={handleCreatePatient}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setShowEdit(false)}
          />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-xl border border-gray-200 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Patient
              </h2>
              <button
                onClick={() => !saving && setShowEdit(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IC/Passport Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={editForm.identity_number}
                  onChange={(e) => setEditForm({ ...editForm, identity_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Emergency Contact
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                      Name
                    </label>
                    <input
                      value={editForm.emergency_contact_name}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                      Relation
                    </label>
                    <input
                      value={editForm.emergency_contact_relation}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_relation: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <input
                      value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical History
                </label>
                <textarea
                  value={editForm.medical_history}
                  onChange={(e) => setEditForm({ ...editForm, medical_history: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies
                  </label>
                  <textarea
                    value={editForm.allergies}
                    onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Medications
                  </label>
                  <textarea
                    value={editForm.current_medications}
                    onChange={(e) => setEditForm({ ...editForm, current_medications: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Doctor
                </label>
                <select
                  value={editForm.assigned_doctor}
                  onChange={(e) => setEditForm({ ...editForm, assigned_doctor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {doctors.length === 0 && (
                    <option value="" disabled>
                      No doctors available
                    </option>
                  )}
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="border-t p-6 flex items-center justify-end gap-3">
              <button
                disabled={saving}
                onClick={() => !saving && setShowEdit(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={saving || !editForm.full_name || !editForm.identity_number || !editForm.phone_number}
                onClick={handleUpdatePatient}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Patient Modal - Improved with scroll */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectedPatient(null)}
          />
          <div className="relative bg-white w-full max-w-lg mx-4 rounded-xl border border-gray-200 shadow-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Patient Details
              </h2>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Patient Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPatient.full_name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{selectedPatient.patient_code}</p>
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">IC/Passport</p>
                    <p className="font-medium text-gray-900">
                      {selectedPatient.identity_number || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                    <p className="font-medium text-gray-900">
                      {selectedPatient.dob
                        ? new Date(selectedPatient.dob).toLocaleDateString()
                        : "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Age</p>
                    <p className="font-medium text-gray-900">
                      {selectedPatient.age ?? "--"} years
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Gender</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedPatient.gender}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Assigned Doctor</p>
                    <p className="font-medium text-gray-900">
                      {selectedPatient.assigned_doctor_name || "Unassigned"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                    <p className="font-medium text-gray-900">
                      {selectedPatient.phone_number || "--"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className={`font-medium ${selectedPatient.email ? 'text-gray-900' : 'text-gray-400'}`}>
                      {selectedPatient.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <p className={`font-medium ${selectedPatient.address ? 'text-gray-900' : 'text-gray-400'}`}>
                      {selectedPatient.address || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>


              {/* Emergency Contact - Always show */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Emergency Contact
                </h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Name</p>
                    <p className={`font-medium ${selectedPatient.emergency_contact_name ? 'text-gray-900' : 'text-gray-400'}`}>
                      {selectedPatient.emergency_contact_name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Relation</p>
                    <p className={`font-medium ${selectedPatient.emergency_contact_relation ? 'text-gray-900' : 'text-gray-400'}`}>
                      {selectedPatient.emergency_contact_relation || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <p className={`font-medium ${selectedPatient.emergency_contact_phone ? 'text-gray-900' : 'text-gray-400'}`}>
                      {selectedPatient.emergency_contact_phone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Medical Information - Always show this section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Medical Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Medical History</p>
                    <p className={`font-medium ${selectedPatient.medical_history ? 'text-gray-900' : 'text-amber-600'}`}>
                      {selectedPatient.medical_history || "Not recorded"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Allergies</p>
                    <p className={`font-medium ${selectedPatient.allergies ? 'text-gray-900' : 'text-amber-600'}`}>
                      {selectedPatient.allergies || "None recorded"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Current Medications</p>
                    <p className={`font-medium ${selectedPatient.current_medications ? 'text-gray-900' : 'text-amber-600'}`}>
                      {selectedPatient.current_medications || "None recorded"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Record Info
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Created</p>
                    <p className="text-gray-900">
                      {new Date(selectedPatient.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Last Updated</p>
                    <p className="text-gray-900">
                      {new Date(selectedPatient.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t p-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  openEditModal(selectedPatient);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Edit Patient
              </button>
              <button
                onClick={() => setSelectedPatient(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
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
