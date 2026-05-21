import type { Metadata } from "next";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { ROBOTS_NOINDEX } from "@/lib/seo/site";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return {
    title: `Team sign in — ${settings.appName}`,
    robots: ROBOTS_NOINDEX,
  };
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(227,75%,8%) 0%, hsl(224,69%,18%) 25%, hsl(220,75%,25%) 50%, hsl(217,80%,30%) 75%, hsl(215,85%,28%) 100%)",
        }}
      />

      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
