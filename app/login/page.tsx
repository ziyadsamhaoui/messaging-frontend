"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();

  const cardWidthClasses =
    mode === "register" ? "max-w-lg md:max-w-xl" : "max-w-md md:max-w-lg";

  useEffect(() => {
    if (auth.status === "authenticated") {
      router.replace("/app");
    }
  }, [auth.status, router]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabels = ["", "Weak", "Fair", "Strong", "Excellent"];
  const strengthLabel = strengthScore > 0 ? strengthLabels[strengthScore] : "";
  const strengthColors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];

  async function handleSubmit() {
    setError(null);
    if (mode === "register") {
      if (!email.trim() || !username.trim()) {
        setError("Please complete all required fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await auth.login(email.trim(), password);
        toast.push("Signed in.", "success");
      } else {
        await auth.register({ email: email.trim(), username: username.trim(), password });
        toast.push("Account created.", "success");
      }
      router.push("/app");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await auth.logout();
    toast.push("Signed out.", "success");
  }

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-forest)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--color-sage)] border-t-transparent" />
          <p className="text-sm text-[var(--color-parchment-dim)]">Restoring your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-auto bg-cover bg-center text-[var(--color-parchment)]">
      <nav className="relative z-20 h-17 w-full border-b border-[rgba(40,84,48,0.06)] bg-gradient-to-r from-[#E5D9B6] to-[#D4C89E] px-6 py-1 shadow-sm">
        <div className="flex w-full items-center justify-start pl-0">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/favicon.png" width={60} height={60} alt="BadrLink favicon" className="inline-block" />
            <span className="font-display bg-gradient-to-r from-[var(--color-fern)] via-[var(--color-sage)] to-[var(--color-forest)] bg-clip-text text-3xl font-bold text-transparent">
              BadrLink
            </span>
          </Link>
        </div>
      </nav>

      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(40,84,48,0.6)] via-[rgba(95,141,78,0.3)] to-[rgba(229,217,182,0.2)]" />

      <div className="relative z-10 flex min-h-screen flex-col px-4 sm:py-10">
        <div className="mt-8 flex flex-1 flex-col items-center justify-center md:mt-0">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative z-10 w-full ${cardWidthClasses} rounded-3xl border border-[rgba(164,190,123,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.8)] to-[rgba(26,58,32,0.9)] p-8 text-[var(--color-parchment)] shadow-2xl backdrop-blur-xl sm:p-10`}
          >
            <div className="text-center">
              <h1 className="font-display bg-gradient-to-r from-[var(--color-parchment)] via-[var(--color-sage)] to-[var(--color-parchment)] bg-clip-text text-xl uppercase tracking-widest text-transparent sm:text-3xl">
                {mode === "login" ? "Welcome Back" : "Create Your Account"}
              </h1>
              <p className="mt-2 text-sm text-[rgba(164,190,123,0.95)] tracking-wide">
                {mode === "login" ? "Sign in with your email address." : "Register to start messaging."}
              </p>
              <div className="mt-4 h-px w-full bg-[rgba(164,190,123,0.3)]" />
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-400/30 bg-gradient-to-r from-red-900/30 to-red-700/20 p-3 text-sm text-red-200">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {auth.status === "authenticated" && (
              <div className="mt-6 rounded-xl border border-[rgba(164,190,123,0.3)] p-3 text-sm">
                You are signed in as {auth.user?.username ?? "user"}.
                <button type="button" onClick={handleLogout} className="ml-2 underline">
                  Sign out
                </button>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                autoComplete="email"
                className="bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)]"
              />

              {mode === "register" && (
                <Input
                  label="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="fernwalker"
                  disabled={loading}
                  autoComplete="username"
                  className="bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)]"
                />
              )}

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-9 text-sm text-[rgba(164,190,123,0.85)] hover:text-[var(--color-parchment)]"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {mode === "register" && (
                <>
                  <div className="relative">
                    <Input
                      label="Confirm password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                      className="bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-4 top-9 text-sm text-[rgba(164,190,123,0.85)] hover:text-[var(--color-parchment)]"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--color-sage)]">
                      <span>Password strength</span>
                      {strengthScore > 0 && <span>{strengthLabel}</span>}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-1 rounded-full ${
                            index < strengthScore ? strengthColors[index] : "bg-[rgba(229,217,182,0.25)]"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="group relative mt-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-fern)] via-[var(--color-sage)] to-[var(--color-fern)] font-semibold text-[var(--color-parchment)] shadow-lg transition-all duration-300 disabled:opacity-60"
              >
                {loading ? (mode === "login" ? "Signing in…" : "Creating account…") : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </div>

            <div className="mt-6 text-center text-sm text-[var(--color-parchment-dim)]">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                }}
                className="font-semibold text-[var(--color-sage)] underline underline-offset-2 hover:text-[var(--color-parchment)]"
              >
                {mode === "login" ? "Sign Up" : "Sign In"}{" "}
                <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
