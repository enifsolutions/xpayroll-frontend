"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

/* ── Eye toggle (same as login page) ── */
function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? "Hide password" : "Show password"}
      style={{
        all: "unset" as any,
        cursor: "pointer",
        padding: "6px 8px",
        color: "#9ca3af",
        display: "flex",
        alignItems: "center",
        borderRadius: 6,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
    >
      {show ? (
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );
}

/* ── Styled input field ── */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  showPassword,
  onToggleShow,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showPassword: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12.5,
          fontWeight: 500,
          color: "#374151",
          marginBottom: 6,
          fontFamily: "Inter,sans-serif",
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 44,
          borderRadius: 10,
          border: focused ? "1.5px solid #3b82f6" : "1.5px solid #d1d5db",
          background: focused ? "#ffffff" : "#f9fafb",
          boxShadow: focused ? "0 0 0 3px rgba(59,130,246,.14)" : "none",
          transition: "border-color .15s, box-shadow .15s, background .15s",
          overflow: "hidden",
          paddingLeft: 14,
          paddingRight: 6,
          boxSizing: "border-box" as const,
        }}
        onClick={(e) => {
          const inp = (e.currentTarget as HTMLDivElement).querySelector("input");
          inp?.focus();
        }}
      >
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete={autoComplete ?? "new-password"}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: "#111827",
            fontFamily: "Inter,-apple-system,sans-serif",
            height: "100%",
            caretColor: "#3b82f6",
            padding: 0,
            margin: 0,
          }}
        />
        <EyeBtn show={showPassword} onToggle={onToggleShow} />
      </div>
    </div>
  );
}

/* ── Password strength indicator ── */
function StrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const levels = [
    { label: "Too short", color: "#ef4444" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Good", color: "#22c55e" },
    { label: "Strong", color: "#16a34a" },
  ];
  const level = levels[score];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 4,
              background: i < score ? level.color : "#e5e7eb",
              transition: "background .2s",
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: 11.5,
          color: level.color,
          fontFamily: "Inter,sans-serif",
          fontWeight: 500,
        }}
      >
        {level.label}
      </span>
    </div>
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("New password must differ from your temporary password.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        userId: user?.userId,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      clearAuth();
      router.push("/login");
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          "Could not change password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

        .xp-orb{position:absolute;border-radius:50%;pointer-events:none;will-change:transform}
        .xp-orb-1{width:500px;height:500px;top:-160px;right:-160px;background:radial-gradient(circle,rgba(59,130,246,.22) 0%,transparent 65%);animation:xpf1 9s ease-in-out infinite}
        .xp-orb-2{width:380px;height:380px;bottom:-100px;left:-100px;background:radial-gradient(circle,rgba(99,102,241,.18) 0%,transparent 65%);animation:xpf2 12s ease-in-out infinite}
        .xp-orb-3{width:220px;height:220px;top:42%;left:30%;background:radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 65%);animation:xpf3 7s ease-in-out infinite}
        .xp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);background-size:48px 48px;animation:xpgd 20s linear infinite}
        .xp-particles{position:absolute;inset:0;overflow:hidden}
        .xp-p{position:absolute;width:2px;height:2px;border-radius:50%;background:rgba(148,197,252,.55);animation:xppr linear infinite}
        .xp-p:nth-child(1){left:12%;animation-duration:14s;animation-delay:0s}
        .xp-p:nth-child(2){left:24%;animation-duration:18s;animation-delay:3s;width:3px;height:3px;opacity:.5}
        .xp-p:nth-child(3){left:38%;animation-duration:11s;animation-delay:6s}
        .xp-p:nth-child(4){left:55%;animation-duration:16s;animation-delay:1.5s;width:3px;height:3px}
        .xp-p:nth-child(5){left:70%;animation-duration:13s;animation-delay:4s;opacity:.4}
        .xp-p:nth-child(6){left:82%;animation-duration:20s;animation-delay:8s}
        .xp-p:nth-child(7){left:90%;animation-duration:15s;animation-delay:2s;opacity:.6}
        .xp-p:nth-child(8){left:6%;animation-duration:17s;animation-delay:10s;width:3px;height:3px}
        @keyframes xpf1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-30px,20px) scale(1.05)}66%{transform:translate(20px,-15px) scale(.97)}}
        @keyframes xpf2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(25px,-20px) scale(1.08)}70%{transform:translate(-15px,10px) scale(.95)}}
        @keyframes xpf3{0%,100%{transform:translate(0,0);opacity:.8}50%{transform:translate(-20px,-30px);opacity:.4}}
        @keyframes xpgd{0%{background-position:0 0}100%{background-position:48px 48px}}
        @keyframes xppr{0%{transform:translateY(100vh) scale(0);opacity:0}10%{opacity:1}90%{opacity:.6}100%{transform:translateY(-60px) scale(1);opacity:0}}
        @keyframes xp-spin{to{transform:rotate(360deg)}}
        .xp-spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:xp-spin .7s linear infinite;flex-shrink:0}
        .xp-badge{display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:13px 16px;transition:background .2s,border-color .2s}
        .xp-badge:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.14)}
        .xp-step{display:flex;align-items:flex-start;gap:12px;padding:10px 0}
        .xp-step-num{width:22px;height:22px;border-radius:50%;background:rgba(59,130,246,.2);border:1px solid rgba(59,130,246,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:600;color:#60a5fa;margin-top:1px}
        @media(max-width:768px){.xp-left-panel{display:none!important}.xp-right-panel{padding:32px 24px!important}}
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          fontFamily: "Inter,-apple-system,sans-serif",
          colorScheme: "light",
        }}
      >
        {/* ══ LEFT PANEL ══ */}
        <div
          className="xp-left-panel"
          style={{
            width: "42%",
            flexShrink: 0,
            background: "#0b1e3d",
            display: "flex",
            flexDirection: "column",
            padding: "48px 52px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div className="xp-grid" />
          <div className="xp-orb xp-orb-1" />
          <div className="xp-orb xp-orb-2" />
          <div className="xp-orb xp-orb-3" />
          <div className="xp-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="xp-p" />
            ))}
          </div>

          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 700,
                color: "#fff",
                boxShadow: "0 4px 12px rgba(59,130,246,.4)",
                flexShrink: 0,
              }}
            >
              X
            </div>
            <span
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#fff",
                letterSpacing: -0.2,
              }}
            >
              Xpay<span style={{ color: "#60a5fa" }}>Roll</span>
            </span>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
              zIndex: 2,
              paddingBottom: 32,
            }}
          >
            {/* Lock icon */}
            <div
              style={{
                width: 52,
                height: 52,
                background: "rgba(59,130,246,.15)",
                border: "1px solid rgba(59,130,246,.25)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                color: "#60a5fa",
              }}
            >
              <svg
                width="24"
                height="24"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            <h1
              style={{
                fontSize: 34,
                fontWeight: 700,
                lineHeight: 1.18,
                color: "#f1f5f9",
                letterSpacing: -1.0,
                marginBottom: 14,
              }}
            >
              Secure Your
              <br />
              <span style={{ color: "#60a5fa" }}>Account</span>
            </h1>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.75,
                color: "#94a3b8",
                maxWidth: 300,
                marginBottom: 40,
              }}
            >
              A temporary password was used to access your account. Set a strong
              personal password to keep your payroll data protected.
            </p>

            {/* Steps */}
            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,.06)",
                paddingTop: 24,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 1.2,
                  color: "#475569",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                Password requirements
              </p>
              {[
                "At least 8 characters long",
                "Mix of uppercase and lowercase letters",
                "At least one number or symbol",
                "Must differ from your temporary password",
              ].map((tip, i) => (
                <div key={i} className="xp-step">
                  <div className="xp-step-num">{i + 1}</div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#94a3b8",
                      lineHeight: 1.6,
                    }}
                  >
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              fontSize: 11.5,
              color: "#334155",
              position: "relative",
              zIndex: 2,
            }}
          >
            © 2024 Miracle IT Solutions (Pvt) Ltd. All rights reserved.
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div
          className="xp-right-panel"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 64px",
            backgroundColor: "#ffffff",
            colorScheme: "light",
          }}
        >
          <div style={{ width: "100%", maxWidth: 400 }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#3b82f6"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#111827",
                  letterSpacing: -0.6,
                  fontFamily: "Inter,sans-serif",
                  lineHeight: 1.2,
                }}
              >
                Set new password
              </h2>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: "#6b7280",
                marginBottom: 32,
                lineHeight: 1.55,
                fontFamily: "Inter,sans-serif",
              }}
            >
              Choose a strong password to protect your XpayRoll account.
            </p>

            {/* Notice banner */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 24,
              }}
            >
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#d97706"
                strokeWidth="2.2"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <p
                style={{
                  fontSize: 12.5,
                  color: "#92400e",
                  lineHeight: 1.55,
                  fontFamily: "Inter,sans-serif",
                }}
              >
                You're signed in with a temporary password. You must set a new
                password before you can access the platform.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <PasswordField
                  label="Current (Temporary) Password"
                  value={form.currentPassword}
                  onChange={(v) => setForm({ ...form, currentPassword: v })}
                  showPassword={showCurrent}
                  onToggleShow={() => setShowCurrent((p) => !p)}
                  autoComplete="current-password"
                />

                <div>
                  <PasswordField
                    label="New Password"
                    value={form.newPassword}
                    onChange={(v) => setForm({ ...form, newPassword: v })}
                    placeholder="Min. 8 characters"
                    showPassword={showNew}
                    onToggleShow={() => setShowNew((p) => !p)}
                    autoComplete="new-password"
                  />
                  <StrengthBar password={form.newPassword} />
                </div>

                <PasswordField
                  label="Confirm New Password"
                  value={form.confirmPassword}
                  onChange={(v) => setForm({ ...form, confirmPassword: v })}
                  showPassword={showConfirm}
                  onToggleShow={() => setShowConfirm((p) => !p)}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 12.5,
                    color: "#ef4444",
                    marginTop: 12,
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  all: "unset" as any,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  height: 44,
                  background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                  color: "#fff",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "Inter,sans-serif",
                  boxShadow: "0 2px 14px rgba(59,130,246,.38)",
                  marginTop: 24,
                  boxSizing: "border-box" as const,
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity .15s",
                }}
              >
                {loading ? (
                  <>
                    <span className="xp-spinner" />
                    Updating password…
                  </>
                ) : (
                  "Set new password"
                )}
              </button>
            </form>
          </div>

          {/* Footer links */}
          <div style={{ display: "flex", gap: 22, marginTop: 52 }}>
            {["Privacy Policy", "Terms of Service", "Support"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  textDecoration: "none",
                  fontFamily: "Inter,sans-serif",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#6b7280")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}