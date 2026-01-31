import { useAuth } from "../../contexts/AuthContext";

export default function DoctorProfile() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={
              currentUser.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                currentUser.name || "Doctor"
              )}&background=0ea5e9&color=fff`
            }
            alt={currentUser.name}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <p className="text-xl font-semibold text-gray-900">
              {currentUser.name}
            </p>
            <p className="text-gray-600">{currentUser.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Role</p>
            <p className="font-medium capitalize">Doctor</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">Account</p>
            <p className="font-medium">Active</p>
          </div>
        </div>
      </div>
    </div>
  );
}
