import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, storeAuthSession } from "../lib/api/authApi";
import { getResolvedApiBaseUrl } from "../api/config";

type Step = "login" | "forgot-email" | "forgot-otp" | "forgot-reset";

function extractErrorMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractErrorMessage(item);
      if (nested) return nested;
    }
    return null;
  }

  if (value && typeof value === "object") {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      const nested = extractErrorMessage(nestedValue);
      if (nested) return nested;
    }
  }

  return null;
}

async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getResolvedApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg =
      extractErrorMessage((data as { message?: unknown })?.message) ||
      extractErrorMessage((data as { detail?: unknown })?.detail) ||
      extractErrorMessage(data) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

const inputCls =
  "w-full rounded-[8px] border border-[#cfd7e6] px-3 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-[#359de9] focus:ring-2 focus:ring-[#359de9]/10";

export default function LoginPage() {
  const navigate = useNavigate();

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [step, setStep] = useState<Step>("login");
  const [fpEmail, setFpEmail] = useState("");
  const [fpOtp, setFpOtp] = useState("");
  const [fpNewPwd, setFpNewPwd] = useState("");
  const [fpConfirmPwd, setFpConfirmPwd] = useState("");
  const [fpShowPwd, setFpShowPwd] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSuccess, setFpSuccess] = useState("");

  const rawRedirect =
    typeof window.history.state === "object" &&
    window.history.state !== null &&
    typeof (window.history.state as { usr?: { from?: unknown } }).usr?.from === "string"
      ? ((window.history.state as { usr: { from: string } }).usr.from || "/home")
      : "/home";

  const MODULE_PATHS: Array<{ module: string; prefixes: string[]; landing: string }> = [
    { module: "sales", prefixes: ["/leads", "/contacts", "/accounts", "/deals", "/documents", "/campaigns"], landing: "/leads" },
    { module: "activities", prefixes: ["/tasks", "/meetings", "/calls"], landing: "/tasks" },
    {
      module: "inventory",
      prefixes: ["/products", "/price-books", "/quotes", "/sales-orders", "/purchase-orders", "/invoices", "/vendors", "/configurator"],
      landing: "/products",
    },
    { module: "support", prefixes: ["/support/cases", "/support/solutions"], landing: "/support/cases" },
    { module: "integrations", prefixes: ["/integrations"], landing: "/integrations" },
    { module: "services", prefixes: ["/services/business-hours", "/services/catalog", "/services/appointments", "/services/job-sheets", "/services/settings"], landing: "/services/catalog" },
    { module: "projects", prefixes: ["/projects"], landing: "/projects" },
  ];

  const getRedirectForModules = (path: string, allowedModules: string[]) => {
    const rootMatch = MODULE_PATHS.find((entry) => path === `/${entry.module}`);
    if (rootMatch) {
      return allowedModules.includes(rootMatch.module) ? rootMatch.landing : "/home";
    }

    const match = MODULE_PATHS.find((entry) => entry.prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)));
    return match && !allowedModules.includes(match.module) ? "/home" : path;
  };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Email and password are required."); return; }
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.success || !res.data) { setError(res.message || "Login failed."); return; }
      storeAuthSession(res.data);
      window.dispatchEvent(new Event("auth:login"));
      if (res.data.user.must_change_password) {
        navigate("/change-password", { replace: true });
      } else {
        const allowedModules: string[] = res.data.user.allowed_modules ?? [];
        const finalRedirect = getRedirectForModules(rawRedirect, allowedModules);
        navigate(finalRedirect, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot: send OTP ───────────────────────────────────────────────────────
  const handleSendOtp = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFpError("");
    if (!fpEmail.trim()) { setFpError("Email is required."); return; }
    setFpLoading(true);
    try {
      await authPost("/auth/forgot-password/", { email: fpEmail.trim() });
      setStep("forgot-otp");
    } catch (err) {
      setFpError(err instanceof Error ? err.message : "Failed to send OTP.");
    } finally {
      setFpLoading(false);
    }
  };

  // ── Forgot: verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFpError("");
    if (!fpOtp.trim()) { setFpError("Enter the OTP sent to your email."); return; }
    setStep("forgot-reset");
  };

  // ── Forgot: reset password ─────────────────────────────────────────────────
  const handleResetPassword = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setFpError("");
    if (!fpNewPwd || !fpConfirmPwd) { setFpError("Both password fields are required."); return; }
    if (fpNewPwd !== fpConfirmPwd) { setFpError("Passwords do not match."); return; }
    if (fpNewPwd.length < 6) { setFpError("Password must be at least 6 characters."); return; }
    setFpLoading(true);
    try {
      await authPost("/auth/reset-password/", {
        email: fpEmail.trim(),
        otp: fpOtp.trim(),
        new_password: fpNewPwd,
      });
      setFpSuccess("Password reset successfully. You can now sign in.");
      setStep("login");
      setFpEmail(""); setFpOtp(""); setFpNewPwd(""); setFpConfirmPwd("");
    } catch (err) {
      setFpError(err instanceof Error ? err.message : "Reset failed. Check your OTP and try again.");
    } finally {
      setFpLoading(false);
    }
  };

  const resetForgot = () => {
    setStep("login");
    setFpEmail(""); setFpOtp(""); setFpNewPwd(""); setFpConfirmPwd("");
    setFpError(""); setFpLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f7fb] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1f2d3d] tracking-tight">Zora CRM</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to access your workspace</p>
        </div>

        <div className="rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] p-8">

          {/* ── STEP: login ── */}
          {step === "login" && (
            <>
              <h2 className="mb-6 text-[18px] font-semibold text-[#1f2d3d]">Welcome back</h2>

              {fpSuccess && (
                <div className="mb-4 rounded-[6px] border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
                  {fpSuccess}
                </div>
              )}

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="email" type="email" autoComplete="email" autoFocus
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setFpEmail(email); setFpError(""); setFpSuccess(""); setStep("forgot-email"); }}
                      className="text-xs text-[#359de9] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password" type={showPassword ? "text" : "password"}
                      autoComplete="current-password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={inputCls + " pr-10"}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs" tabIndex={-1}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="mt-2 w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          )}

          {/* ── STEP: forgot-email ── */}
          {step === "forgot-email" && (
            <>
              <h2 className="mb-1 text-[18px] font-semibold text-[#1f2d3d]">Reset Password</h2>
              <p className="mb-6 text-sm text-slate-500">Enter your email and we'll send you a one-time code.</p>

              <form onSubmit={(e) => void handleSendOtp(e)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                  <input type="email" autoFocus value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="you@example.com" className={inputCls} />
                </div>

                {fpError && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{fpError}</div>
                )}

                <button type="submit" disabled={fpLoading}
                  className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {fpLoading ? "Sending…" : "Send OTP"}
                </button>

                <button type="button" onClick={resetForgot}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-1">
                  Back to Sign in
                </button>
              </form>
            </>
          )}

          {/* ── STEP: forgot-otp ── */}
          {step === "forgot-otp" && (
            <>
              <h2 className="mb-1 text-[18px] font-semibold text-[#1f2d3d]">Enter OTP</h2>
              <p className="mb-6 text-sm text-slate-500">
                A 6-digit code was sent to <span className="font-medium text-slate-700">{fpEmail}</span>. It expires in 5 minutes.
              </p>

              <form onSubmit={(e) => void handleVerifyOtp(e)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">One-time code</label>
                  <input type="text" autoFocus maxLength={6} value={fpOtp}
                    onChange={(e) => setFpOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className={inputCls + " tracking-[0.3em] text-center text-lg font-bold"} />
                </div>

                {fpError && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{fpError}</div>
                )}

                <button type="submit" disabled={fpOtp.length < 6}
                  className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  Verify OTP
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setFpError(""); void handleSendOtp({ preventDefault: () => {} }); }}
                    className="text-[#359de9] hover:underline">
                    Resend OTP
                  </button>
                  <button type="button" onClick={resetForgot} className="text-slate-500 hover:text-slate-700">
                    Back to Sign in
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEP: forgot-reset ── */}
          {step === "forgot-reset" && (
            <>
              <h2 className="mb-1 text-[18px] font-semibold text-[#1f2d3d]">New Password</h2>
              <p className="mb-6 text-sm text-slate-500">Choose a strong new password for your account.</p>

              <form onSubmit={(e) => void handleResetPassword(e)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                  <div className="relative">
                    <input type={fpShowPwd ? "text" : "password"} autoFocus value={fpNewPwd}
                      onChange={(e) => setFpNewPwd(e.target.value)}
                      placeholder="At least 6 characters"
                      className={inputCls + " pr-10"} />
                    <button type="button" onClick={() => setFpShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 text-xs" tabIndex={-1}>
                      {fpShowPwd ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                  <input type={fpShowPwd ? "text" : "password"} value={fpConfirmPwd}
                    onChange={(e) => setFpConfirmPwd(e.target.value)}
                    placeholder="Re-enter new password" className={inputCls} />
                </div>

                {fpError && (
                  <div className="rounded-[6px] border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">{fpError}</div>
                )}

                <button type="submit" disabled={fpLoading}
                  className="w-full rounded-[8px] bg-gradient-to-b from-[#359de9] to-[#365eea] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {fpLoading ? "Resetting…" : "Reset Password"}
                </button>

                <button type="button" onClick={resetForgot}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-1">
                  Back to Sign in
                </button>
              </form>
            </>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Contact your administrator if you don't have an account.
        </p>
      </div>
    </div>
  );
}
