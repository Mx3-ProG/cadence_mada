import { createFileRoute, redirect } from "@tanstack/react-router";
import { detectLocaleFromCurrentRequest } from "@/i18n/detect-locale";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const locale = await detectLocaleFromCurrentRequest();
    throw redirect({ to: "/$locale", params: { locale }, replace: true });
  },
});
