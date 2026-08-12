type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

// Extension point for a real error tracking service (e.g. Sentry) if/when needed.
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ErrorReportOptions = {
    mechanism: "react_error_boundary",
    handled: false,
    severity: "error",
  },
) {
  if (typeof window === "undefined") return;
  console.error(error, { ...context, ...options });
}
