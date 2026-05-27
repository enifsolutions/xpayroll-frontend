'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { setTokens } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import type { AuthResponse, LoginRequest } from '@/types/auth';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", form);

      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setAuth(
        data.tokens.accessToken,
        {
          userId: String(data.userId),
          email: data.email,
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          systemRole: data.role,
          permHash: data.permHash,
        },
        data.permissions ?? [],
      );

      if (data.isTempPassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError("Email is required.");
      return;
    }
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
      setForgotSuccess(true);
    } catch {
      setForgotError("Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Xpay<span className="text-indigo-600">Roll</span>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {showForgot ? "Reset your password" : "Sign in to your account"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* ── Login Form ── */}
          {!showForgot && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setError("");
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {/* ── Forgot Password Form ── */}
          {showForgot && !forgotSuccess && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter your email address and we'll send you a temporary
                password.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder="your@email.com"
                />
              </div>

              {forgotError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {forgotError}
                </p>
              )}

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {forgotLoading ? "Sending…" : "Send Temporary Password"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotError("");
                    setForgotSuccess(false);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}

          {/* ── Forgot Password Success ── */}
          {showForgot && forgotSuccess && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                  <svg
                    className="h-6 w-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Check your email
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                If an account exists for <strong>{forgotEmail}</strong>, a
                temporary password has been sent. Check your inbox and log in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(false);
                  setForgotSuccess(false);
                  setForgotEmail("");
                }}
                className="text-xs text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                ← Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}