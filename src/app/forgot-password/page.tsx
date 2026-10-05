"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  KeyRound,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

type Step = "EMAIL" | "OTP" | "NEW_PASSWORD" | "SUCCESS";
type Locale = "en" | "ta";

export default function ForgotPasswordPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Timers: 10 minutes total OTP validity, 60s cooldown for resend
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(600); // 10 mins
  const [resendCooldown, setResendCooldown] = useState(60); // 60s cooldown

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isTamil = locale === "ta";

  // Countdown timers for OTP expiration and resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "OTP" && otpExpirySeconds > 0) {
      timer = setInterval(() => {
        setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpExpirySeconds]);

  // Focus the first OTP box when entering the OTP step
  useEffect(() => {
    if (step === "OTP") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Password criteria computation
  const hasMinLength = newPassword.length >= 12;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);

  const criteriaPassed = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthPercentage = (criteriaPassed / 5) * 100;

  const getStrengthLabel = () => {
    if (criteriaPassed <= 2) return { text: isTamil ? "பலவீனமானது" : "Weak", color: "bg-red-500", textCol: "text-red-600" };
    if (criteriaPassed <= 4) return { text: isTamil ? "நடுத்தரமானது" : "Moderate", color: "bg-amber-500", textCol: "text-amber-600" };
    return { text: isTamil ? "வலுவானது" : "Strong", color: "bg-emerald-500", textCol: "text-emerald-600" };
  };

  // Handle Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError(isTamil ? "சரியான மின்னஞ்சலை உள்ளிடவும்." : "Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });

      const data = await res.json();
      if (!res.ok && !data.success) {
        setError(data.error || (isTamil ? "பிழை ஏற்பட்டது." : "Failed to send OTP."));
        setIsLoading(false);
        return;
      }

      setInfoMessage(data.message);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setStep("OTP");
      setOtp(["", "", "", "", "", ""]);
      setOtpExpirySeconds(600); // 10 minutes
      setResendCooldown(60); // 60 seconds
    } catch {
      setError(isTamil ? "நெட்வொர்க் பிழை. மீண்டும் முயற்சிக்கவும்." : "Network connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 6-box OTP input navigation & paste
  const handleOtpChange = (index: number, value: string) => {
    // If user pasted a 6-digit code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    // Only allow digits
    const cleaned = value.replace(/\D/g, "");
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);

    // Auto-advance
    if (cleaned && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError(isTamil ? "முழுமையான 6-இலக்க OTP-ஐ உள்ளிடவும்." : "Please enter all 6 digits of the OTP.");
      return;
    }

    if (otpExpirySeconds <= 0) {
      setError(isTamil ? "இந்த OTP காலாவதியாகிவிட்டது. தயவுசெய்து புதிய OTP-ஐக் கோரவும்." : "This OTP has expired. Please request a new OTP.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: fullOtp,
          twoFactorCode: twoFactorCode.trim() || undefined,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.requires2FA) {
          setRequires2FA(true);
          setError(data.message);
        } else {
          setError(data.error || (isTamil ? "OTP சரிபார்ப்பு தோல்வியடைந்தது." : "OTP verification failed."));
        }
        setIsLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setStep("NEW_PASSWORD");
    } catch {
      setError(isTamil ? "நெட்வொர்க் பிழை. மீண்டும் முயற்சிக்கவும்." : "Network connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || (isTamil ? "OTP மீண்டும் அனுப்புவதில் பிழை." : "Failed to resend OTP."));
        setIsLoading(false);
        return;
      }

      setInfoMessage(data.message);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
      }
      setOtp(["", "", "", "", "", ""]);
      setOtpExpirySeconds(600);
      setResendCooldown(60);
      otpInputRefs.current[0]?.focus();
    } catch {
      setError(isTamil ? "நெட்வொர்க் பிழை." : "Network connection error.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 12) {
      setError(isTamil ? "கடவுச்சொல் குறைந்தது 12 எழுத்துக்கள் இருக்க வேண்டும்." : "Password must be at least 12 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isTamil ? "கடவுச்சொற்கள் பொருந்தவில்லை." : "New password and confirmation password do not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          resetToken,
          newPassword,
          confirmPassword,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || (isTamil ? "கடவுச்சொல் மாற்றுவதில் பிழை." : "Failed to reset password."));
        setIsLoading(false);
        return;
      }

      setStep("SUCCESS");
    } catch {
      setError(isTamil ? "நெட்வொர்க் பிழை." : "Network error resetting password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Header & Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ta" : "en")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 hover:bg-orange-200 transition-colors cursor-pointer"
          >
            {locale === "en" ? "தமிழ் (Tamil)" : "English"}
          </button>
        </div>

        <div className="mx-auto w-20 h-20 relative mb-3 rounded-2xl overflow-hidden shadow-md border border-orange-200 dark:border-orange-900 bg-white p-1">
          <Image
            src="/brand/logo.jpg"
            alt="Sai Tours & Travels"
            width={80}
            height={80}
            className="object-contain w-full h-full"
            priority
          />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {isTamil ? "கடவுச்சொல் மீட்டமைப்பு" : "Reset Password"}
        </h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Sai Tours & Travels • Notes & Accounts Portal
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-xl rounded-3xl border border-gray-100 dark:border-gray-800 sm:px-10">
          {/* Global Alert Messages */}
          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <span className="leading-relaxed">{infoMessage}</span>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === "EMAIL" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {isTamil
                  ? "உங்கள் பதிவு செய்யப்பட்ட மின்னஞ்சல் முகவரியை உள்ளிடவும். கடவுச்சொல்லை மீட்டமைக்க 6-இலக்க OTP குறியீட்டை அனுப்புவோம்."
                  : "Enter your registered email address. We will send a 6-digit verification code to reset your password."}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isTamil ? "மின்னஞ்சல் முகவரி" : "Email Address"}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="saipassportmdu@gmail.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>{isTamil ? "OTP அனுப்புக" : "Send Verification OTP"}</span>
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-600 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isTamil ? "உள்நுழைவுப் பக்கத்திற்குத் திரும்பு" : "Back to Sign In"}</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Enter 6-Digit OTP */}
          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center">
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {isTamil ? "அனுப்பப்பட்ட 6-இலக்க OTP:" : "Enter the 6-digit code sent to:"}
                </p>
                <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                  {email}
                </p>
              </div>

              {devOtp && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl text-xs text-amber-950 dark:text-amber-200 flex flex-col gap-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <span>⚡</span> {isTamil ? "சோதனை முறை OTP:" : "Development Test OTP:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const digits = devOtp.split("").slice(0, 6);
                        setOtp(digits);
                        otpInputRefs.current[5]?.focus();
                      }}
                      className="text-[11px] font-bold text-white bg-orange-600 hover:bg-orange-700 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      {isTamil ? "தானாக நிரப்பு" : "Auto-Fill Code"}
                    </button>
                  </div>
                  <div className="font-mono text-2xl font-extrabold tracking-widest text-orange-600 dark:text-orange-400 text-center py-1">
                    {devOtp}
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 text-center leading-normal">
                    {isTamil
                      ? "மின்னஞ்சல் சேவை (.env) இன்னும் இணைக்கப்படவில்லை. இந்த OTP-ஐ பயன்படுத்தி சோதிக்கலாம்."
                      : "Email service API key is not configured in .env. Use this OTP to test locally."}
                  </p>
                </div>
              )}

              {/* 6 OTP Inputs */}
              <div>
                <label className="block text-center text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {isTamil ? "பாதுகாப்பு குறியீடு (OTP)" : "Security Code (OTP)"}
                </label>
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-13 text-center text-xl font-bold bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-900 dark:text-white transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* 2FA Input if enabled */}
              {requires2FA && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {isTamil ? "2FA அங்கீகாரக் குறியீடு" : "Two-Factor Code"}
                  </label>
                  <input
                    type="text"
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                  />
                </div>
              )}

              {/* Expiry Timer & Resend Controls */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                  <span>
                    {isTamil ? "காலாவதி:" : "Expires in:"}{" "}
                    <strong className="text-gray-800 dark:text-gray-200 font-mono">
                      {formatTime(otpExpirySeconds)}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="inline-flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>
                    {resendCooldown > 0
                      ? isTamil
                        ? `மீண்டும் அனுப்பு (${resendCooldown}s)`
                        : `Resend (${resendCooldown}s)`
                      : isTamil
                      ? "மீண்டும் அனுப்பு"
                      : "Resend OTP"}
                  </span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.join("").length !== 6 || otpExpirySeconds <= 0}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>{isTamil ? "OTP சரிபார்" : "Verify Code"}</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep("EMAIL")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{isTamil ? "மின்னஞ்சலை மாற்று" : "Change Email Address"}</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === "NEW_PASSWORD" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {isTamil
                  ? "உங்கள் புதிய பாதுகாப்பான கடவுச்சொல்லை உள்ளிடவும் (குறைந்தது 12 எழுத்துக்கள்)."
                  : "Create a new strong password (minimum 12 characters)."}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isTamil ? "புதிய கடவுச்சொல்" : "New Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Live Strength Meter */}
              {newPassword && (
                <div className="space-y-2 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-600 dark:text-gray-400">
                      {isTamil ? "கடவுச்சொல் வலிமை:" : "Password Strength:"}
                    </span>
                    <span className={`font-bold ${getStrengthLabel().textCol}`}>
                      {getStrengthLabel().text}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                      style={{ width: `${strengthPercentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      {hasMinLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{isTamil ? "12+ எழுத்துக்கள்" : "12+ characters"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasUpper ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{isTamil ? "பெரிய எழுத்து (A-Z)" : "Uppercase (A-Z)"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasLower ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{isTamil ? "சிறிய எழுத்து (a-z)" : "Lowercase (a-z)"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasNumber ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{isTamil ? "எண் (0-9)" : "Number (0-9)"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      {hasSpecial ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{isTamil ? "சிறப்பு குறியீடு (!@#$%...)" : "Symbol (!@#$%...)"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isTamil ? "கடவுச்சொல்லை உறுதிப்படுத்தவும்" : "Confirm New Password"}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !hasMinLength || newPassword !== confirmPassword}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isTamil ? "கடவுச்சொல்லை சேமி" : "Save New Password"}</span>
              </button>
            </form>
          )}

          {/* STEP 4: Success View */}
          {step === "SUCCESS" && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                  {isTamil ? "கடவுச்சொல் மாற்றப்பட்டது!" : "Password Reset Successfully!"}
                </h2>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  {isTamil
                    ? "உங்கள் கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது. பாதுகாப்பு காரணங்களுக்காக உங்கள் பழைய அமர்வுகள் அனைத்தும் வெளியேற்றப்பட்டன. இப்போது உங்கள் புதிய கடவுச்சொல்லுடன் உள்நுழையலாம்."
                    : "Your password has been securely updated. All previous active sessions across all devices have been logged out for your safety."}
                </p>
              </div>

              <Link
                href="/login"
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{isTamil ? "இப்போது உள்நுழையவும்" : "Sign In Now"}</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
