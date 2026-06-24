// app/(auth)/layout.tsx
// Minimal layout for auth pages — no html/body (root layout owns those).
// Overrides every Ecme dark-mode CSS variable to light values so inputs
// cannot inherit dark backgrounds from parent theme providers.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      style={{
        // Override every Ecme CSS custom property at this boundary
        ["--background" as string]: "#ffffff",
        ["--foreground" as string]: "#0f172a",
        ["--card" as string]: "#ffffff",
        ["--card-foreground" as string]: "#0f172a",
        ["--input" as string]: "#f9fafb",
        ["--input-background" as string]: "#f9fafb",
        ["--input-bg" as string]: "#f9fafb",
        ["--input-color" as string]: "#111827",
        ["--border" as string]: "#e5e7eb",
        ["--ring" as string]: "#3b82f6",
        ["--primary" as string]: "#3b82f6",
        ["--primary-foreground" as string]: "#ffffff",
        ["--muted" as string]: "#f3f4f6",
        ["--muted-foreground" as string]: "#6b7280",
        ["--popover" as string]: "#ffffff",
        ["--popover-foreground" as string]: "#0f172a",
        // Hard visual reset
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        colorScheme: "light" as const,
      }}
    >
      {children}
    </div>
  );
}
