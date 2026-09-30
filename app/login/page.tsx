"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Input } from "../../components/ui/Input";
import { login, register, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/ui/Toast";
import Image from "next/image";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  // card width classes: make login card slightly smaller horizontally than the register card
  const cardWidthClasses =
    mode === "register"
      ? "max-w-lg md:max-w-2xl lg:max-w-4xl"
      : "max-w-md md:max-w-lg lg:max-w-xl";

  const submitScaleClass = mode === "register" ? "" : "hover:scale-[1.02] active:scale-[0.98]";
  const cardHoverClass = mode === "register" ? "hover:scale-[1.01] hover:shadow-[0_8px_60px_rgba(95,141,78,0.2)]" : "hover:scale-[1.01] hover:shadow-[0_8px_60px_rgba(95,141,78,0.2)]";

  const strengthScore = React.useMemo(() => {
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
    setSuccess(null);
    if (mode === "register") {
      if (!displayName.trim() || !username.trim() || !email.trim()) {
        setError("Please complete all required fields.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
        const res = mode === "login"
        ? await login(username, password)
        : await register({
            username,
            password,
            displayName,
            email,
          });
      setSuccess(mode === "login" ? "Welcome back." : "Account created. Welcome in.");
      auth.login(res.token, res.username, res.userId);
      toast.push("Welcome to the canopy.", "success");
      router.push("/app");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.payload?.message || err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-full overflow-auto bg-cover bg-center text-[var(--color-parchment)]">
      {/* Nav bar */}
      <nav className="relative z-20 w-full h-17 bg-gradient-to-r from-[#E5D9B6] to-[#D4C89E] border-b border-[rgba(40,84,48,0.06)] py-1 px-6 shadow-sm">
        <div className="w-full flex items-center justify-start pl-0">

          <Link href="/frontend/public" className="flex items-center gap-3">
            <Image
              src="/favicon.png"
              width={60}
              height={60}
              alt="BadrLink favicon"

              className="inline-block"
            />
            <span className="font-display text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-fern)] via-[var(--color-sage)] to-[var(--color-forest)] hover:animate-pulse">
              BadrLink
            </span>
          </Link>
        </div>
      </nav>

       <div className="absolute inset-0 bg-gradient-to-br from-[rgba(40,84,48,0.6)] via-[rgba(95,141,78,0.3)] to-[rgba(229,217,182,0.2)] animate-pulse" />

      <div className="relative z-10 flex min-h-screen sm:py-10 flex-col px-4">
        {/* spacer to visually separate from nav when not fixed */}
        <div className="" />

         <div className="mt-8 md:mt-0 flex flex-1 flex-col items-center justify-center">

             <motion.div
               initial={{ opacity: 0, y: 18 }}
               animate={{ opacity: 1, y: 0 }}
               className={`relative z-10 w-full ${cardWidthClasses} rounded-3xl border border-[rgba(164,190,123,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.8)] to-[rgba(26,58,32,0.9)] p-8 text-[var(--color-parchment)] shadow-2xl backdrop-blur-xl transition-all duration-500 ${cardHoverClass} sm:p-10`}
             >
               <div className="mx-auto mb-6 flex h-17 w-17 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)]">
                 <svg
                   viewBox="0 0 24 24"
                   fill="none"
                   stroke="currentColor"
                   strokeWidth="1.5"
                   className="h-8 w-8 text-[var(--color-parchment)]"
                 >
                   {mode === "login" ? (
                     <path
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
                     />
                   ) : (
                     <path
                       strokeLinecap="round"
                       strokeLinejoin="round"
                       d="M18 7.5V12m0 0V16.5m0-4.5h4.5m-4.5 0H13.5M6 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM3 20.25a6.75 6.75 0 0 1 13.5 0"
                     />
                   )}
                 </svg>
               </div>

               <div className="text-center">
                 <h1 className="font-display text-xl uppercase tracking-widest text-transparent bg-gradient-to-r from-[var(--color-parchment)] via-[var(--color-sage)] to-[var(--color-parchment)] bg-clip-text sm:text-4xl animate-fade-in">
                   {mode === "login" ? "Welcome Back" : "Create Your Account"}
                 </h1>
                 <p className="mt-2 text-sm text-[rgba(164,190,123,0.8)] tracking-wide">
                   {mode === "login" ? "Good to see you again." : "Join and start chatting."}
                 </p>
                 <div className="mt-4 h-px w-full bg-[rgba(164,190,123,0.3)]" />
               </div>

               {error && (
                 <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-400/30 bg-gradient-to-r from-red-900/30 to-red-700/20 p-3 text-sm text-red-200 animate-shake">
                   <span>⚠</span>
                   <span>{error}</span>
                 </div>
               )}

               {success && (
                 <div className="mt-6 flex items-center gap-3 rounded-xl border border-[rgba(164,190,123,0.3)] bg-gradient-to-r from-[rgba(95,141,78,0.3)] to-[rgba(164,190,123,0.2)] p-3 text-sm text-[var(--color-parchment)] animate-pulse">
                   <span>✓</span>
                   <span>{success}</span>
                 </div>
               )}

              <div className="mt-6 flex flex-col gap-4">
                {mode === "register" ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Display name (col 1, row 1) */}
                    <div className="md:col-start-1">
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300 " />
                        <Input
                          label="Display name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Ziyad"
                          disabled={loading}
                          className="relative h-12 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11"
                        />
                        <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">👤</span>
                      </div>
                    </div>

                    {/* Email spans cols 1-2 under display name (row 2) */}
                    <div className="md:col-start-1 md:row-start-2 md:col-span-2 mt-2">
                        <div className="relative group">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300" />
                            <Input
                                label="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ziyadsamhaoui@example.com"
                                disabled={loading}
                                className="relative h-14 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11"
                            />
                            <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">✉</span>
                        </div>
                    </div>

                    {/* Username sits top-right (col 2 on md) */}
                    <div className="md:col-start-2">
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300" />
                        <Input
                          label="Username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="ziyadsamhaoui"
                          disabled={loading}
                          className="relative h-12 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11"
                        />
                        <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">@</span>
                      </div>
                    </div>

                    {/* Passwords positioned in the right column at row 1 (col 3 row 1) */}
                    <div className="md:col-start-3 md:row-span-3 space-y-4">
                      <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300" />
                        <Input
                          label="Password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={loading}
                          className="relative h-14 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11 pr-12"
                        />
                        <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">🔒</span>
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute text-xl right-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)] hover:text-[var(--color-parchment)]"
                          aria-label="Toggle password visibility"
                        >
                          👁
                        </button>
                      </div>

                      <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300" />
                        <Input
                          label="Confirm Password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={loading}
                          className="relative h-14 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11 pr-12"
                        />
                        <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">🔐</span>
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="absolute text-xl right-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)] hover:text-[var(--color-parchment)]"
                          aria-label="Toggle confirm password visibility"
                        >
                          👁
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-[var(--color-sage)]">
                          <span>Password strength</span>
                          {/* only show descriptor when a value exists */}
                          {strengthScore > 0 && <span>{strengthLabel}</span>}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1 rounded-full ${
                                i < strengthScore ? strengthColors[i] : "bg-[rgba(229,217,182,0.25)]"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                 ) : (
                   <>
                     <div className="relative group">
                       <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300" />
                       <Input
                         label={mode === "login" ? "Username or Email" : "Email address"}
                         value={mode === "login" ? username : email}
                         onChange={(e) => (mode === "login" ? setUsername(e.target.value) : setEmail(e.target.value))}
                         placeholder={mode === "login" ? "ziyadsamhaoui@example.com" : "ziyadsamhaoui@example.com"}
                         disabled={loading}
                         className="relative h-14 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11"
                       />
                      <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">✉</span>
                     </div>

                     <div className="relative group">
                       <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.2)] opacity-0 transition-opacity duration-300" />
                       <Input
                         label="Password"
                         type={showPassword ? "text" : "password"}
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="••••••••"
                         disabled={loading}
                         className="relative h-14 bg-gradient-to-r from-[rgba(40,84,48,0.5)] to-[rgba(40,84,48,0.7)] pl-11 pr-12"
                       />
                       <span className="pointer-events-none absolute left-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)]">🔒</span>
                       <button
                         type="button"
                         onClick={() => setShowPassword((prev) => !prev)}
                         className="absolute text-xl right-4 top-1/2 translate-y-[3px] text-[rgba(164,190,123,0.6)] hover:text-[var(--color-parchment)]"
                         aria-label="Toggle password visibility"
                       >
                         👁
                       </button>
                     </div>
                   </>
                 )}

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`group relative mt-2 flex cursor-pointer h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-fern)] via-[var(--color-sage)] to-[var(--color-fern)] text-[var(--color-parchment)] font-semibold shadow-lg transition-all duration-300 hover:shadow-[0_12px_40px_rgba(95,141,78,0.25)] ${submitScaleClass} disabled:opacity-60`}
                  >
                   <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-white/0 via-white/10 to-white/0 transition-transform duration-1000 group-hover:translate-x-[100%]" />
                   <span className="relative flex items-center gap-2">
                     {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}
                     <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                   </span>
                 </button>
               </div>
                
                <div className="mt-6 text-center text-sm text-[var(--color-parchment-dim)]">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"} {" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "login" ? "register" : "login");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[var(--color-sage)] font-semibold underline underline-offset-2 transition-all hover:text-[var(--color-parchment)] hover:underline-offset-4 cursor-pointer"
                  >
                    {mode === "login" ? "Sign Up" : "Sign In"} →
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
    );
  }
