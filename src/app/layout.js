import { Hind_Siliguri } from "next/font/google";
import { InstallPrompt } from "@/components/domain/install-prompt";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata = {
  title: "Khamar — Farm management",
  description: "Easy farm management for Bangladeshi farmers",
  applicationName: "Khamar",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Khamar",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B7F4B",
};

const bootScript = `
try {
  var theme = localStorage.getItem("khamar-theme");
  if (theme === "light") document.documentElement.classList.remove("dark");
  var language = localStorage.getItem("khamar-language");
  if (language === "bn" || language === "en") document.documentElement.lang = language;
} catch (error) {}
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${hindSiliguri.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <AppProviders>{children}</AppProviders>
        <InstallPrompt />
      </body>
    </html>
  );
}
