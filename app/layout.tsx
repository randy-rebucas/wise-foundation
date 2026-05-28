import type { Metadata } from "next";
import { Geist, Geist_Mono, Great_Vibes, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { APP_LOGO_SRC } from "@/lib/constants/branding";
import { getPublicAppSettings } from "@/lib/services/appSettings.service";
import { buildRootMetadata } from "@/lib/seo/site";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();
  return {
    ...buildRootMetadata(settings),
    icons: {
      icon: APP_LOGO_SRC,
      apple: APP_LOGO_SRC,
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${greatVibes.variable} ${plusJakartaSans.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
