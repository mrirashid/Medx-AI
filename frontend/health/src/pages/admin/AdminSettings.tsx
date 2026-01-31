import { Bell, Globe, Save, Shield, User } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { useLanguage } from "../../i18n/LanguageProvider";
import userService from "../../services/userService";

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { currentUser, setAvatar, updateProfile, refreshUser } = useAuth();
  const {
    language: prefLanguage,
    timezone,
    dateFormat,
    setLanguage: setPrefLanguage,
    setTimezone,
    setDateFormat,
  } = usePreferences();
  const { t, language, setLanguage: setLangProviderLanguage } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Separate state for pending image (preview before save)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  // 2FA state - load from user profile
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    role: currentUser?.role
      ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)
      : "Administrator",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    emailNotifications: true,
    pushNotifications: true,
  });

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const profile = await userService.getProfile();
        setFormData((prev) => ({
          ...prev,
          name: profile.full_name || "",
          email: profile.email || "",
          phone: profile.phone_number || "",
          role: profile.role
            ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
            : "Administrator",
        }));
        // Update avatar if available from profile
        if (profile.profile_image_url) {
          setAvatar(profile.profile_image_url);
        }
        // Load 2FA setting from profile
        setTwoFactorEnabled(profile.two_factor_enabled || false);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      // First, upload image if there's a pending one
      if (pendingImageFile) {
        const imageResponse = await userService.uploadProfileImage(pendingImageFile);
        if (imageResponse.user.profile_image_url) {
          setAvatar(imageResponse.user.profile_image_url);
        }
        setPendingImageFile(null);
        setPendingImagePreview(null);
      }

      // Then update profile info
      await userService.updateProfile({
        full_name: formData.name,
        email: formData.email,
        phone_number: formData.phone || undefined,
      });

      // Update local auth context
      if (currentUser) {
        updateProfile({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });
      }

      // Refresh user data from server to get updated avatar
      await refreshUser();

      // Update session storage
      const userDataRaw = sessionStorage.getItem("userData");
      if (userDataRaw) {
        try {
          const userData = JSON.parse(userDataRaw);
          const updated = {
            ...userData,
            name: formData.name,
            full_name: formData.name,
            email: formData.email,
            phone: formData.phone,
            phone_number: formData.phone,
          };
          sessionStorage.setItem("userData", JSON.stringify(updated));
        } catch {}
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.full_name?.[0] ||
        err.response?.data?.profile_image?.[0] ||
        "Failed to update profile. Please try again.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSecuritySave = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      // Save 2FA setting to backend
      await userService.update2FASetting(twoFactorEnabled);
      
      // If password fields are filled, change password
      if (formData.currentPassword || formData.newPassword || formData.confirmPassword) {
        await handleChangePassword();
      } else {
        setPasswordSuccess("Security settings saved!");
        setTimeout(() => setPasswordSuccess(null), 3000);
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || "Failed to save security settings.";
      setPasswordError(message);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!formData.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (!formData.newPassword) {
      setPasswordError("New password is required.");
      return;
    }
    if (formData.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);

    try {
      await userService.changePassword({
        old_password: formData.currentPassword,
        new_password: formData.newPassword,
        new_password_confirm: formData.confirmPassword,
      });

      setPasswordSuccess("Password changed successfully!");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      const message =
        err.response?.data?.old_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.detail ||
        "Failed to change password. Please try again.";
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleImageSelect = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setError("File too large. Max 2MB.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Store the file for later upload
    setPendingImageFile(file);
    setSuccess("Image selected. Click 'Save Changes' to upload.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handle2FAToggle = (enabled: boolean) => {
    if (enabled) {
      setShow2FAModal(true);
    } else {
      setTwoFactorEnabled(false);
      localStorage.setItem("twoFactorEnabled", "false");
    }
  };

  const confirm2FAEnable = () => {
    setTwoFactorEnabled(true);
    localStorage.setItem("twoFactorEnabled", "true");
    setShow2FAModal(false);
    setPasswordSuccess("Two-Factor Authentication enabled! You will be prompted for a code on your next login.");
    setTimeout(() => setPasswordSuccess(null), 5000);
  };

  const tabs = [
    { id: "profile", label: t("settings.profile"), icon: User },
    { id: "security", label: t("settings.security"), icon: Shield },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "preferences", label: t("settings.preferences"), icon: Globe },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t("settings.title")}</h1>
        <p className="text-gray-600 mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {t("settings.profile.title")}
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    {t("settings.profile.subtitle")}
                  </p>
                </div>

                {/* Success/Error Messages */}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {success}
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img
                      src={
                        pendingImagePreview ||
                        currentUser?.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          formData.name || "Admin"
                        )}&background=0ea5e9&color=fff&size=128`
                      }
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    {pendingImagePreview && (
                      <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Preview
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageSelect(file);
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSaving}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors"
                    >
                      Change Photo
                    </button>
                    <p className="text-sm text-gray-600 mt-2">
                      JPG, GIF or PNG. Max size of 2MB
                    </p>
                    {pendingImageFile && (
                      <p className="text-xs text-yellow-600 mt-1">
                         Click "Save Changes" to upload the new photo
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={formData.role}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Security Settings
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Manage your password and security preferences
                  </p>
                </div>

                {/* Success/Error Messages for Password */}
                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}

                {/* Change Password */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Change Password
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Confirm your new password"
                    />
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="mt-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isChangingPassword ? "Changing Password..." : "Update Password"}
                  </button>
                </div>

                {/* Two-Factor Authentication */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Two-Factor Authentication
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Add an extra layer of security to your account
                      </p>
                      {twoFactorEnabled && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ 2FA is enabled - you'll need to enter a code when logging in
                        </p>
                      )}
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={(e) => handle2FAToggle(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {t("settings.notifications.title")}
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    {t("settings.notifications.subtitle")}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {t("settings.notifications.email")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t("settings.notifications.emailDesc")}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.emailNotifications}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            emailNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {t("settings.notifications.push")}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {t("settings.notifications.pushDesc")}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.pushNotifications}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pushNotifications: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    {t("settings.preferences.title")}
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    {t("settings.preferences.subtitle")}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("settings.preferences.language")}
                    </label>
                    <select
                      value={language}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setLangProviderLanguage(newLang);
                        setPrefLanguage(newLang);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="en">English (US)</option>
                      <option value="ms">Bahasa Melayu (MY)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("settings.preferences.timezone")}
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="Asia/Kuala_Lumpur">
                        Asia/Kuala_Lumpur (UTC+08:00)
                      </option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t("settings.preferences.dateFormat")}
                    </label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value as any)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
              <button 
                onClick={() => {
                  // Reset form to initial values
                  setError(null);
                  setSuccess(null);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setPendingImageFile(null);
                  setPendingImagePreview(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={activeTab === "security" ? handleSecuritySave : handleSave}
                disabled={isSaving || isChangingPassword}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving || isChangingPassword ? t("common.loading") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Enable Confirmation Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Enable Two-Factor Authentication
            </h3>
            <p className="text-gray-600 mb-4">
              Two-Factor Authentication adds an extra layer of security to your account. 
              When enabled, you'll be required to enter a verification code in addition 
              to your password when logging in.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• After entering your password, you'll see a code prompt</li>
                <li>• A 6-digit verification code will be sent to your email</li>
                <li>• Enter the code to complete your login</li>
                <li>• Codes expire after 10 minutes</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShow2FAModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirm2FAEnable}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
