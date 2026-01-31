import {
  Archive,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/images/icon.png";
import NotificationPanel from "../components/common/NotificationPanel";
import { useAuth } from "../contexts/AuthContext";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

export default function NurseLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems: NavItem[] = [
    { name: "Nurse Dashboard", path: "/nurse/dashboard", icon: LayoutDashboard },
    { name: "Manage Patients", path: "/nurse/patients", icon: Users },
    { name: "Archived Patients", path: "/nurse/patients/archived", icon: Archive },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#001F3F] flex flex-col">
        {/* Logo / Branding */}
        <div className="h-20 flex items-center px-6 gap-3">
          <img src={logo} alt="Health AI Logo" className="w-10 h-10 rounded-lg" />
          <div>
            <h1 className="text-xl font-bold text-white leading-none">Health AI</h1>
            <p className="text-xs text-blue-200">Diagnosis System</p>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Use exact match for /nurse/patients to avoid highlighting when on archived
              const isActive =
                item.path === "/nurse/patients"
                  ? location.pathname === item.path
                  : location.pathname === item.path ||
                  location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-blue-900"
                      }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* Logout */}
        <div className="px-4 py-6 border-t border-blue-900">
          <button
            onClick={() => {
              logout();
              navigate("/admin/login");
            }}
            className="flex items-center px-4 py-3 rounded-lg transition-colors text-gray-300 hover:bg-red-600 hover:text-white w-full"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-2xl font-semibold text-gray-900">
            {navItems.find((item) => location.pathname.startsWith(item.path))
              ?.name || "Dashboard"}
          </h2>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationPanel />
            <div className="relative">
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <img
                  src={
                    currentUser?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      currentUser?.name || "Nurse"
                    )}&background=0ea5e9&color=fff`
                  }
                  alt={currentUser?.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {currentUser?.name || "Nurse"}
                  </p>
                  <p className="text-gray-500">
                    {currentUser?.email || "nurse@healthcare.com"}
                  </p>
                </div>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-1 text-gray-600 hover:text-gray-900"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/nurse/profile");
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" /> View Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/nurse/settings");
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Account Settings
                    </button>
                    <hr className="my-2 border-gray-200" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate("/admin/login");
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
