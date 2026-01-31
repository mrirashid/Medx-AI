import { Bot, Brain, ChevronRight, Dna, HeartPulse, Lock, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const { login, currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // 2FA states
  const [show2FAStep, setShow2FAStep] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      if (currentUser.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (currentUser.role === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (currentUser.role === "nurse") {
        navigate("/nurse/dashboard", { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, currentUser, navigate]);

  // Send 2FA code via email
  const send2FACodeToEmail = async () => {
    setIsSendingCode(true);
    setError("");
    try {
      await userService.send2FACode(email.trim());
      setInfoMessage("Verification code sent to your email.");
      setTimeout(() => setInfoMessage(""), 5000);
      return true;
    } catch (err: any) {
      console.error("Failed to send 2FA code:", err);
      setError(err.response?.data?.detail || "Failed to send verification code.");
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");

    if (!email || !password) {
      setError("Please provide email and password");
      return;
    }

    setIsSubmitting(true);
    try {
      // First check if 2FA is enabled for this user
      let twoFactorEnabled = false;
      try {
        const result = await userService.check2FAEnabled(email.trim());
        twoFactorEnabled = result.two_factor_enabled;
      } catch (checkErr: any) {
        // If check fails, assume 2FA is not enabled and proceed with login
        console.warn("2FA check failed, proceeding with direct login:", checkErr);
      }

      if (twoFactorEnabled && !show2FAStep) {
        // 2FA is enabled - send code and show 2FA step
        // Do NOT try to login here - that would bypass 2FA!
        const codeSent = await send2FACodeToEmail();
        if (codeSent) {
          setShow2FAStep(true);
        }
        setIsSubmitting(false);
        return;
      }

      // No 2FA - proceed with direct login
      await login({ email: email.trim(), password });
    } catch (err: any) {
      console.error("Login error:", err);
      // Extract error message from various possible formats
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.non_field_errors?.[0] ||
        err.message ||
        "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!twoFACode || twoFACode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    // Check if password is still available
    if (!password) {
      setError("Session expired. Please go back and enter your password again.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await userService.verify2FACode(email.trim(), twoFACode);

      if (result.verified) {
        // Code verified successfully - now login
        await login({ email: email.trim(), password });
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err: any) {
      // Extract error message - be more specific about credential errors
      let message = "Invalid or expired verification code.";

      if (err.response?.status === 401) {
        message = "Invalid credentials. Please go back and check your email and password.";
      } else if (err.response?.data?.detail) {
        message = err.response.data.detail;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setTwoFACode("");
    await send2FACodeToEmail();
  };

  const handleBack = () => {
    setShow2FAStep(false);
    setTwoFACode("");
    setError("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Common Left Side Component
  const LeftPanel = () => (
    <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between text-white relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10">
        <div className="absolute top-10 right-10 w-24 h-24 rounded-full bg-white blur-2xl"></div>
        <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
        {/* Dot pattern */}
        <div className="absolute top-8 left-8 grid grid-cols-6 gap-2">
          {[...Array(24)].map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-white opacity-40"></div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm">
            <HeartPulse className="w-8 h-8 text-white" />
          </div>
          <span className="text-xl font-bold tracking-wide">Medx AI</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col justify-center flex-1">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Her2 Breast Cancer Diagnosis System</h1>
        </div>

        <div className="space-y-6">
          <div className="group flex items-start gap-4">
            <div className="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm mt-0.5 transition-transform group-hover:scale-110">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">AI-Based Diagnosis</h3>
              
            </div>
          </div>

          <div className="group flex items-start gap-4">
            <div className="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm mt-0.5 transition-transform group-hover:scale-110">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">LLM-Based Personalized Recommendation</h3>
            </div>
          </div>

          <div className="group flex items-start gap-4">
            <div className="bg-white/20 p-2.5 rounded-lg backdrop-blur-sm mt-0.5 transition-transform group-hover:scale-110">
              <Dna className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">Scalable for Future Diseases</h3>
            </div>
          </div>
        </div>
      </div>


      <div className="relative z-10 flex items-center justify-between text-sm text-blue-200 mt-8 border-t border-white/10 pt-8">
        <span className="flex items-center justify-center text-xs" >© 2026 | Medx AI </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#f0f4f8] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Main Card */}
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-6xl flex overflow-hidden relative z-10 min-h-[700px]">
        {/* Left Panel */}
        <LeftPanel />

        {/* Right Panel - Dynamic Content */}
        <div className="w-full lg:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-white relative">

          {/* Header/Logo for Mobile */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Health AI</span>
          </div>

          <div className="max-w-md w-full mx-auto">
            {show2FAStep ? (
              // 2FA FORM
              <div className="animate-fade-in-up">
                <button
                  onClick={handleBack}
                  className="text-gray-500 hover:text-blue-600 text-sm font-medium mb-8 flex items-center gap-2 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Login
                </button>

                <div className="mb-8">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                    <Shield className="h-7 w-7 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h2>
                  <p className="text-gray-500">
                    We've sent a verification code to
                    <span className="font-semibold text-gray-900 mx-1">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      {error}
                    </div>
                  )}
                  {infoMessage && (
                    <div className="bg-blue-50 border border-blue-100 text-blue-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      {infoMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="block w-full px-6 py-4 text-center text-3xl font-bold tracking-[0.5em] text-gray-900 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder-gray-300"
                      placeholder="000000"
                      maxLength={6}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || twoFACode.length !== 6}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSubmitting ? "Verifying..." : "Verify & Login"}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isSendingCode}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                    >
                      {isSendingCode ? "Sending code..." : "Didn't receive code? Resend"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // LOGIN FORM
              <div className="animate-fade-in-up">
                <div className="mb-10 text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
                  <p className="text-gray-500">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 animate-shake">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      {error}
                    </div>
                  )}

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                          placeholder="name@example.com"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                          placeholder="••••••••"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600">Remember me</span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg py-4 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isSubmitting ? "Signing in..." : "Login"}
                  </button>

                  <div className="text-center mt-6">
                    <p className="text-gray-500 text-sm">
                      Don't have an account?{' '}
                      <span className="text-blue-600 font-semibold hover:underline cursor-pointer">Contact Admin</span>
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
