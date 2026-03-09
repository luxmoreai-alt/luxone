import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/auth/AuthCard";
import EmailStep from "../components/auth/EmailStep";
import PasswordStep from "../components/auth/PasswordStep";
import PromoPanel from "../components/auth/PromoPanel";

export type AuthStep = "email" | "password";

const CHECK_EMAIL_URL = "http://127.0.0.1:8000/api/auth/check-email";
const LOGIN_URL = "http://127.0.0.1:8000/api/auth/login";

const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleNext = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required");
      return;
    }

    const validEmail = /\S+@\S+\.\S+/;
    if (!validEmail.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    try {
      setIsCheckingEmail(true);
      setEmailError("");

      const response = await fetch(CHECK_EMAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = rawText;
      }

      if (!response.ok) {
        setEmailError(
          data?.message ||
            data?.detail ||
            (typeof data === "string" ? data : "") ||
            "Unable to verify this email"
        );
        return;
      }

      setStep("password");
    } catch (error) {
      console.error("Check email error:", error);
      setEmailError("Unable to connect to backend");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSignIn = async () => {
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setPasswordError("Password is required");
      return;
    }

    try {
      setIsSigningIn(true);
      setPasswordError("");

      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: trimmedPassword,
        }),
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = rawText;
      }

      if (!response.ok) {
        setPasswordError(
          data?.message ||
            data?.detail ||
            (typeof data === "string" ? data : "") ||
            "Invalid email or password"
        );
        return;
      }

      const accessToken =
        data?.access ||
        data?.token ||
        data?.data?.access ||
        data?.data?.token ||
        null;

      const refreshToken = data?.refresh || data?.data?.refresh || null;

      if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
      }

      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      navigate("/home");
    } catch (error) {
      console.error("Login error:", error);
      setPasswordError("Unable to connect to backend");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-5">
      <div className="mx-auto flex min-h-screen max-w-[820px] items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] lg:grid-cols-[1fr_0.92fr]">
          <AuthCard>
            {step === "email" ? (
              <EmailStep
                email={email}
                setEmail={setEmail}
                onNext={handleNext}
                error={emailError}
                buttonText={isCheckingEmail ? "Checking..." : "Next"}
                disabled={isCheckingEmail}
              />
            ) : (
              <PasswordStep
                email={email}
                password={password}
                setPassword={setPassword}
                onBack={() => {
                  setPassword("");
                  setPasswordError("");
                  setStep("email");
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