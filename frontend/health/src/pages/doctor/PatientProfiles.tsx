import { Calendar, Mail, Phone, Search } from "lucide-react";
import { useState } from "react";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  bloodType: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalCases: number;
  avatar: string;
}

const mockPatients: Patient[] = [
  {
    id: "P-1234",
    name: "John Doe",
    age: 45,
    gender: "Male",
    bloodType: "A+",
    phone: "+1 234 567 8901",
    email: "john.doe@email.com",
    lastVisit: "2024-11-15",
    totalCases: 5,
    avatar:
      "https://ui-avatars.com/api/?name=John+Doe&background=0ea5e9&color=fff",
  },
  {
    id: "P-1235",
    name: "Jane Smith",
    age: 38,
    gender: "Female",
    bloodType: "B+",
    phone: "+1 234 567 8902",
    email: "jane.smith@email.com",
    lastVisit: "2024-11-14",
    totalCases: 3,
    avatar:
      "https://ui-avatars.com/api/?name=Jane+Smith&background=ec4899&color=fff",
  },
];

export default function PatientProfiles() {
  const [patients] = useState<Patient[]>(mockPatients);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patient Profiles</h1>
        <p className="text-gray-600 mt-1">
          View and manage patient information
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Total Patients</p>
          <p className="text-3xl font-bold text-gray-900">{patients.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">New This Month</p>
          <p className="text-3xl font-bold text-green-600">12</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Active Cases</p>
          <p className="text-3xl font-bold text-blue-600">28</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-1">Follow-ups Due</p>
          <p className="text-3xl font-bold text-orange-600">8</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <img
                src={patient.avatar}
                alt={patient.name}
                className="w-16 h-16 rounded-full"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {patient.name}
                </h3>
                <p className="text-sm text-gray-600 font-mono">{patient.id}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {patient.age} years
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                    {patient.bloodType}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{patient.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{patient.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Last Visit: {new Date(patient.lastVisit).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {patient.totalCases}
                </p>
                <p className="text-xs text-gray-600">Total Cases</p>
              </div>
              <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
                View Profile
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
