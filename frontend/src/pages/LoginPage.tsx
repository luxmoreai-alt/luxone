import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/auth/AuthCard";
import EmailStep from "../components/auth/EmailStep";
import RoleStep, { type UserRole } from "../components/auth/RoleStep";
import PasswordStep from "../components/auth/PasswordStep";
import PromoPanel from "../components/auth/PromoPanel";
import { buildApiUrl } from "../api/config";

export type AuthStep = "email" | "role" | "password";

type ApiPayload = {
  message?: string;
  detail?: string;
  success?: boolean;
  access?: string;
  token?: string;
  access_token?: string;
  refresh?: string;
  refresh_token?: string;
  tenant_db?: string;
  user?: Record<string, unknown>;
  data?: {
    message?: string;
    detail?: string;
    access?: string;
    token?: string;
    access_token?: string;
    refresh?: string;
    refresh_token?: string;
    tenant_db?: string;
    user?: Record<string, unknown>;
    role?: string;
    email?: string;
  };
};

const CHECK_EMAIL_URL = buildApiUrl("/auth/check-email");
const LOGIN_URL = buildApiUrl("/auth/login");

function toApiPayload(value: unknown): ApiPayload | null {
  if (typeof value === "object" && value !== null) return value as ApiPayload;
  return null;
}

function extractErrorMessage(data: unknown, fallback: string): string {
  const payload = toApiPayload(data);
  if (payload?.message) return payload.message;
  if (payload?.detail) return payload.detail;
  if (payload?.data?.message) return payload.data.message;
  if (payload?.data?.detail) return payload.data.detail;
  if (typeof data === "string" && data.trim()) return data;
  return fallback;
}

const LoginPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [password, setPassword] = useState("");

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // ── Step 1: check email → get role from backend ──────────────────────────
  const handleNext = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setEmailError("Email is required"); return; }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setIsCheckingEmail(true);
      setEmailError("");

      const response = await fetch(CHECK_EMAIL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const rawText = await response.text();
      let data: unknown = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { data = rawText; }

      if (!response.ok) {
        setEmailError(extractErrorMessage(data, "Unable to verify this email"));
        return;
      }

      // Read the role returned by backend
      const payload = toApiPayload(data);
      const userRole =
        (payload?.data?.role as UserRole | undefined) ??
        "employee";

      setRole(userRole);
      setStep("role");
    } catch {
      setEmailError("Unable to connect to backend");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // ── Step 2: role confirmed → go to password ──────────────────────────────
  const handleRoleContinue = () => {
    setStep("password");
  };

  // ── Step 3: password → sign in ───────────────────────────────────────────
  const handleSignIn = async () => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) { setPasswordError("Password is required"); return; }

    try {
      setIsSigningIn(true);
      setPasswordError("");

      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: trimmedPassword }),
      });

      const rawText = await response.text();
      let data: unknown = null;
      try { data = rawText ? JSON.parse(rawText) : null; } catch { data = rawText; }

      if (!response.ok) {
        setPasswordError(extractErrorMessage(data, "Invalid email or password"));
        return;
      }

      const payload = toApiPayload(data);

      const accessToken =
        payload?.access || payload?.token || payload?.access_token ||
        payload?.data?.access || payload?.data?.token || payload?.data?.access_token || null;

      const refreshToken =
        payload?.refresh || payload?.refresh_token ||
        payload?.data?.refresh || payload?.data?.refresh_token || null;

      const tenantDb = payload?.tenant_db || payload?.data?.tenant_db || null;
      const user = payload?.user || payload?.data?.user || null;

      if (!accessToken) {
        setPasswordError("Login succeeded but token was missing from backend response");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      if (tenantDb) localStorage.setItem("tenantDb", tenantDb);

      // Store full user info including role
      const userWithRole = user
        ? { ...user, role }
        : { email: email.trim(), role };
      localStorage.setItem("loggedInUser", JSON.stringify(userWithRole));

      navigate("/home", { replace: true });
    } catch {
      setPasswordError("Unable to connect to backend");
    } finally {
      setIsSigningIn(false);
    }
  };

  // ── Reset to email step ───────────────────────────────────────────────────
  const resetToEmail = () => {
    setPassword("");
    setPasswordError("");
    setRole("employee");
    setStep("email");
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-8 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[820px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] lg:grid-cols-[1fr_0.92fr]">
          <AuthCard>
            {step === "email" && (
              <EmailStep
                email={email}
                setEmail={setEmail}
                onNext={handleNext}
                error={emailError}
                buttonText={isCheckingEmail ? "Checking..." : "Next"}
                disabled={isCheckingEmail}
              />
            )}

            {step === "role" && (
              <RoleStep
                email={email}
                role={role}
                onContinue={handleRoleContinue}
                onBack={resetToEmail}
              />
            )}

            {step === "password" && (
              <PasswordStep
                email={email}
                password={password}
                setPassword={setPassword}
                onBack={() => {
                  setPassword("");
                  setPasswordError("");
                  setStep("role");
                }}
                onSubmit={handleSignIn}
                onOtpLogin={() => navigate("/otp-login")}
                onForgotPassword={() => navigate("/forgot-password")}
                error={passwordError}
                buttonText={isSigningIn ? "Signing in..." : "Sign in"}
                disabled={isSigningIn}
              />
            )}
          </AuthCard>

          <PromoPanel />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
