import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Home, Eye, EyeOff, ArrowLeft } from "lucide-react";
import api from "@/lib/axiosInterceptor";

type Step = "login" | "send-otp" | "verify-otp";

const COUNTDOWN = 10 * 60; // 10 minutes in seconds

const fmtTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const Login = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("login");

  // login
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // forgot password
  const [otpEmail, setOtpEmail]       = useState("");
  const [otp, setOtp]                 = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  // countdown
  const [countdown, setCountdown]   = useState(COUNTDOWN);
  const [expired, setExpired]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearMessages = () => { setError(""); setSuccess(""); };

  const startTimer = () => {
    setCountdown(COUNTDOWN);
    setExpired(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await api.post("/admin/auth/login", { email, password });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await api.post("/admin/auth/send-otp", { email: otpEmail });
      setSuccess("OTP sent to your email. Check your inbox.");
      setStep("verify-otp");
      startTimer();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    clearMessages();
    setLoading(true);
    try {
      await api.post("/admin/auth/send-otp", { email: otpEmail });
      setSuccess("New OTP sent to your email.");
      setOtp("");
      startTimer();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset Password ─────────────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await api.post("/admin/auth/forgot-password", { otp, newPassword });
      setSuccess("Password reset successfully. Please login.");
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => {
        setStep("login");
        setOtp(""); setNewPassword(""); setOtpEmail("");
        setSuccess("");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Home className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">RealSquare</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {step === "login"      && "Real Estate Management Platform"}
              {step === "send-otp"   && "Reset your password"}
              {step === "verify-otp" && "Enter OTP & new password"}
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-4">

          {/* ── Login Form ── */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" type="email" placeholder="you@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPass ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10" required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error   && <p className="text-xs text-destructive text-center">{error}</p>}
              {success && <p className="text-xs text-emerald-600 text-center">{success}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              <button type="button" onClick={() => { setStep("send-otp"); clearMessages(); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
                Forgot password?
              </button>
            </form>
          )}

          {/* ── Send OTP Form ── */}
          {step === "send-otp" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp-email">Your account email</Label>
                <Input
                  id="otp-email" type="email" placeholder="you@company.com"
                  value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} required
                />
              </div>

              {error   && <p className="text-xs text-destructive text-center">{error}</p>}
              {success && <p className="text-xs text-emerald-600 text-center">{success}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>

              <button type="button" onClick={() => { setStep("login"); clearMessages(); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            </form>
          )}

          {/* ── Verify OTP + New Password Form ── */}
          {step === "verify-otp" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="otp">OTP Code</Label>
                <Input
                  id="otp" type="text" placeholder="Enter 6-digit OTP"
                  value={otp} onChange={(e) => setOtp(e.target.value)}
                  maxLength={6} required
                />
              </div>

              {/* Countdown + Resend */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${expired ? "text-destructive" : "text-muted-foreground"}`}>
                  {expired ? "OTP expired" : `Expires in ${fmtTime(countdown)}`}
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password" type={showNewPass ? "text" : "password"}
                    placeholder="••••••••" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10" required
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Min 6 chars, 1 uppercase, 1 number, 1 symbol
                </p>
              </div>

              {error   && <p className="text-xs text-destructive text-center">{error}</p>}
              {success && <p className="text-xs text-emerald-600 text-center">{success}</p>}

              <Button type="submit" className="w-full" disabled={loading || expired}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>

              <button type="button" onClick={() => { setStep("login"); clearMessages(); if (timerRef.current) clearInterval(timerRef.current); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            </form>
          )}

        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
