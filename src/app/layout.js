import { Hind_Siliguri } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

export const metadata = {
  title: "Khamar — খামার ব্যবস্থাপনা",
  description: "বাংলাদেশের খামারির জন্য সহজ খামার ব্যবস্থাপনা",
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" className={hindSiliguri.variable} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
