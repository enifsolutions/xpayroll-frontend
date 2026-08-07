'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { setTokens } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import type { AuthResponse, LoginRequest } from '@/types/auth';

/* ══════════════════════════════════════════════════════════
   SHADOW-ISOLATED INPUT
   Fixes applied:
   - focusInput() exposed via ref for auto-focus on mount
   - tabIndex on host div so Tab key reaches the shadow input
   - keydown Enter forwarded to parent form submit
   - keydown Tab forwarded to next focusable element
══════════════════════════════════════════════════════════ */
interface ShadowInputHandle {
  focusInput: () => void;
}

const ShadowInput = forwardRef<
  ShadowInputHandle,
  {
    type: "email" | "text" | "password";
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
    suffix?: React.ReactNode;
    focused: boolean;
    onFocus: () => void;
    onBlur: () => void;
    onEnter?: () => void;
    tabIndex?: number;
  }
>(function ShadowInput(
  {
    type,
    value,
    onChange,
    placeholder = "",
    autoComplete = "off",
    required = false,
    suffix,
    focused,
    onFocus,
    onBlur,
    onEnter,
    tabIndex = 0,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const onBlurRef = useRef(onBlur);
  const onEnterRef = useRef(onEnter);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onFocusRef.current = onFocus;
  });
  useEffect(() => {
    onBlurRef.current = onBlur;
  });
  useEffect(() => {
    onEnterRef.current = onEnter;
  });

  // Expose focusInput() to parent
  useImperativeHandle(ref, () => ({
    focusInput: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host || host.shadowRoot) return;

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; width: 100%; }
      .wrap {
        display: flex; align-items: center; height: 44px;
        border-radius: 10px; border: 1.5px solid #d1d5db;
        background: #f9fafb;
        transition: border-color .15s, box-shadow .15s, background .15s;
        overflow: hidden; cursor: text; box-sizing: border-box;
        padding-left: 14px; padding-right: 6px;
      }
      .wrap.focused {
        border-color: #3b82f6; background: #ffffff;
        box-shadow: 0 0 0 3px rgba(59,130,246,.14);
      }
      input {
        flex: 1; border: none; outline: none; background: transparent;
        font-size: 14px; color: #111827; font-family: Inter, -apple-system, sans-serif;
        height: 100%; caret-color: #3b82f6; 
        // -webkit-text-fill-color: #111827;
        padding: 0; margin: 0; -webkit-appearance: none; appearance: none; box-shadow: none;
      }
      input::placeholder { color: #9ca3af; -webkit-text-fill-color: #9ca3af; opacity: 1; }
      input:-webkit-autofill,
      input:-webkit-autofill:focus {
        -webkit-box-shadow: 0 0 0 1000px #f9fafb inset !important;
        // -webkit-text-fill-color: #111827 !important;
        transition: background-color 9999s 0s;
      }
      .suffix-slot { display: flex; align-items: center; flex-shrink: 0; }
    `;
    shadow.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "wrap";
    containerRef.current = wrap;

    const input = document.createElement("input");
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autoComplete as AutoFill;
    input.required = required;
    input.value = value;

    input.addEventListener("input", (e) =>
      onChangeRef.current((e.target as HTMLInputElement).value),
    );
    input.addEventListener("focus", () => onFocusRef.current());
    input.addEventListener("blur", () => onBlurRef.current());

    // FIX: Handle Enter (submit) and Tab (move focus) inside shadow DOM
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnterRef.current?.();
      } else if (e.key === "Tab") {
        // Let the browser handle Tab naturally — shadow DOM traps it otherwise
        // We blur this input and let the host div's tabIndex chain take over
        const focusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            'input, button, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.closest("[data-shadow-host]") || el === host);

        const host2 = input.getRootNode() as ShadowRoot;
        const hostEl = host2.host as HTMLElement;
        const allFocusable = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-shadow-host], button:not([tabindex="-1"])',
          ),
        );
        const idx = allFocusable.indexOf(hostEl);
        if (idx !== -1) {
          e.preventDefault();
          const next = e.shiftKey
            ? allFocusable[idx - 1]
            : allFocusable[idx + 1];
          if (next) {
            // If it's another shadow host, focus its inner input
            const innerInput = next.shadowRoot?.querySelector(
              "input",
            ) as HTMLInputElement | null;
            if (innerInput) {
              innerInput.focus();
            } else {
              next.focus();
            }
          }
        }
      }
    });

    inputRef.current = input;
    wrap.appendChild(input);

    const suffixDiv = document.createElement("div");
    suffixDiv.className = "suffix-slot";
    suffixDiv.appendChild(document.createElement("slot"));
    wrap.appendChild(suffixDiv);

    shadow.appendChild(wrap);
    wrap.addEventListener("click", () => input.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inputRef.current) inputRef.current.type = type;
  }, [type]);

  useEffect(() => {
    const el = inputRef.current;
    if (el && el.value !== value) el.value = value;
  }, [value]);

  useEffect(() => {
    containerRef.current?.classList.toggle("focused", focused);
  }, [focused]);

  return (
    <div
      ref={hostRef}
      data-shadow-host
      tabIndex={-1}
      style={{ display: "block", width: "100%" }}
    >
      {suffix}
    </div>
  );
});

/* ── Eye toggle ── */
function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
      style={{ all:'unset' as any, cursor:'pointer', padding:'6px 8px', color:'#9ca3af', display:'flex', alignItems:'center', borderRadius:6 }}
      onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
      onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
    >
      {show ? (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

/* ── Field wrapper ── */
const Field = forwardRef<
  ShadowInputHandle,
  {
    label: string;
    labelRight?: React.ReactNode;
    type: "email" | "text" | "password";
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
    suffix?: React.ReactNode;
    onEnter?: () => void;
  }
>(function Field(
  {
    label,
    labelRight,
    type,
    value,
    onChange,
    placeholder,
    autoComplete,
    required,
    suffix,
    onEnter,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "#374151",
            WebkitTextFillColor: "#374151",
            fontFamily: "Inter,sans-serif",
          }}
        >
          {label}
        </label>
        {labelRight}
      </div>
      <ShadowInput
        ref={ref}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        suffix={suffix}
        focused={focused}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onEnter={onEnter}
      />
    </div>
  );
});

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState<LoginRequest>({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Refs for programmatic focus
  const emailRef = useRef<ShadowInputHandle>(null);
  const passwordRef = useRef<ShadowInputHandle>(null);
  const forgotRef = useRef<ShadowInputHandle>(null);

  // FIX 1: Auto-focus email field on mount
  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focusInput(), 100);
    return () => clearTimeout(t);
  }, []);

  // Re-focus forgot email when panel opens
  useEffect(() => {
    if (showForgot) {
      const t = setTimeout(() => forgotRef.current?.focusInput(), 100);
      return () => clearTimeout(t);
    }
  }, [showForgot]);

  const setEmail = useCallback(
    (v: string) => setForm((f) => ({ ...f, email: v })),
    [],
  );
  const setPassword = useCallback(
    (v: string) => setForm((f) => ({ ...f, password: v })),
    [],
  );

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      router.push(data.isTempPassword ? "/change-password" : "/dashboard");
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
        .xp-check-wrap { display:flex; align-items:center; gap:9px; cursor:pointer; user-select:none; }
        .xp-check-box {
          width:17px; height:17px; border-radius:5px;
          border:1.5px solid #d1d5db; background:#f9fafb;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; transition:border-color .15s, background .15s;
        }
        .xp-check-box.checked { border-color:#3b82f6; background:#3b82f6; }
        .xp-check-label { font-size:12.5px; color:#6b7280; font-family:Inter,sans-serif; }
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
        {/* ══ LEFT ══ */}
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
            <h1
              style={{
                fontSize: 38,
                fontWeight: 700,
                lineHeight: 1.16,
                color: "#f1f5f9",
                letterSpacing: -1.2,
                marginBottom: 18,
              }}
            >
              Streamline
              <br />
              Your <span style={{ color: "#60a5fa" }}>Workforce</span>
            </h1>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "#94a3b8",
                maxWidth: 320,
                marginBottom: 44,
              }}
            >
              Enterprise-grade payroll management and human capital solutions
              designed for modern high-growth companies.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                  t: "AES-256 Encryption",
                  s: "Fully encrypted at rest and in transit",
                },
                {
                  d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                  t: "EPF / ETF / APIT Compliant",
                  s: "Full Sri Lankan statutory compliance built-in",
                },
                {
                  d: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                  t: "Multi-Branch Ready",
                  s: "Manage all locations from a single platform",
                },
              ].map((b) => (
                <div key={b.t} className="xp-badge">
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      background: "rgba(59,130,246,.15)",
                      borderRadius: 9,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: "#60a5fa",
                    }}
                  >
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
                        d={b.d}
                      />
                    </svg>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#f1f5f9",
                        display: "block",
                        marginBottom: 2,
                      }}
                    >
                      {b.t}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        lineHeight: 1.4,
                      }}
                    >
                      {b.s}
                    </span>
                  </div>
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

        {/* ══ RIGHT ══ */}
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
            {/* ── Login form ── */}
            {!showForgot && (
              <>
                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                    letterSpacing: -0.6,
                    marginBottom: 6,
                    fontFamily: "Inter,sans-serif",
                    lineHeight: 1.2,
                  }}
                >
                  Welcome back
                </h2>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#6b7280",
                    WebkitTextFillColor: "#6b7280",
                    marginBottom: 32,
                    lineHeight: 1.55,
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  Sign in to your XpayRoll account to continue.
                </p>

                {/* FIX 3: onSubmit on the form, Enter from each field calls handleSubmit() */}
                <form onSubmit={handleSubmit}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    <Field
                      ref={emailRef}
                      label="Email address"
                      type="email"
                      value={form.email}
                      onChange={setEmail}
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                      // FIX 2: Tab from email moves to password
                      onEnter={() => passwordRef.current?.focusInput()}
                    />

                    <Field
                      ref={passwordRef}
                      label="Password"
                      labelRight={
                        <button
                          type="button"
                          onClick={() => {
                            setShowForgot(true);
                            setError("");
                          }}
                          style={{
                            all: "unset" as any,
                            fontSize: 12,
                            color: "#3b82f6",
                            cursor: "pointer",
                            fontFamily: "Inter,sans-serif",
                          }}
                        >
                          Forgot password?
                        </button>
                      }
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      // FIX 3: Enter in password field submits
                      onEnter={() => handleSubmit()}
                      suffix={
                        <EyeBtn
                          show={showPassword}
                          onToggle={() => setShowPassword((p) => !p)}
                        />
                      }
                    />
                  </div>

                  {/* Remember me */}
                  <div style={{ marginTop: 16 }}>
                    <label
                      className="xp-check-wrap"
                      onClick={() => setRememberMe((r) => !r)}
                    >
                      <div
                        className={`xp-check-box${rememberMe ? " checked" : ""}`}
                      >
                        {rememberMe && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="#fff"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="xp-check-label">
                        Keep me logged in for 30 days
                      </span>
                    </label>
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
                        Signing in…
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ── Forgot form ── */}
            {showForgot && !forgotSuccess && (
              <>
                <h2
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                    letterSpacing: -0.6,
                    marginBottom: 6,
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  Reset password
                </h2>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#6b7280",
                    WebkitTextFillColor: "#6b7280",
                    marginBottom: 32,
                    lineHeight: 1.55,
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  Enter your email and we'll send a temporary password.
                </p>
                <form onSubmit={handleForgotPassword}>
                  <Field
                    ref={forgotRef}
                    label="Email address"
                    type="email"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    onEnter={() => handleForgotPassword()}
                  />
                  {forgotError && (
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
                      {forgotError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={forgotLoading}
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
                      cursor: forgotLoading ? "not-allowed" : "pointer",
                      fontFamily: "Inter,sans-serif",
                      boxShadow: "0 2px 14px rgba(59,130,246,.38)",
                      marginTop: 24,
                      boxSizing: "border-box" as const,
                      opacity: forgotLoading ? 0.6 : 1,
                    }}
                  >
                    {forgotLoading ? (
                      <>
                        <span className="xp-spinner" />
                        Sending…
                      </>
                    ) : (
                      "Send temporary password"
                    )}
                  </button>
                </form>
                <div style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(false);
                      setForgotError("");
                    }}
                    style={{
                      all: "unset" as any,
                      fontSize: 12.5,
                      color: "#3b82f6",
                      cursor: "pointer",
                      fontFamily: "Inter,sans-serif",
                      marginTop: 20,
                      display: "inline-block",
                    }}
                  >
                    ← Back to sign in
                  </button>
                </div>
              </>
            )}

            {/* ── Success ── */}
            {showForgot && forgotSuccess && (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    background: "#dcfce7",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 18px",
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#111827",
                    WebkitTextFillColor: "#111827",
                    textAlign: "center",
                    marginBottom: 8,
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  Check your inbox
                </p>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#6b7280",
                    WebkitTextFillColor: "#6b7280",
                    textAlign: "center",
                    lineHeight: 1.65,
                    fontFamily: "Inter,sans-serif",
                  }}
                >
                  If an account exists for{" "}
                  <strong style={{ color: "#374151" }}>{forgotEmail}</strong>, a
                  temporary password has been sent.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotSuccess(false);
                    setForgotEmail("");
                  }}
                  style={{
                    all: "unset" as any,
                    fontSize: 12.5,
                    color: "#3b82f6",
                    cursor: "pointer",
                    fontFamily: "Inter,sans-serif",
                    marginTop: 24,
                    display: "block",
                    margin: "24px auto 0",
                  }}
                >
                  ← Back to sign in
                </button>
              </div>
            )}
          </div>

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