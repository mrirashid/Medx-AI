export default function NewPatient() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Add New Patient
        </h1>
        <p className="text-gray-600">Fill in the patient details</p>
      </div>
    </div>
  );
}
