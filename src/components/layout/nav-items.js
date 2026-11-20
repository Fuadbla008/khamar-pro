import {
  ChartNoAxesCombined,
  HeartPulse,
  LayoutDashboard,
  Milk,
  Package,
  PawPrint,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

// Labels stay in Bengali; hrefs are appended to /f/[farmId].
export const PRIMARY_NAV = [
  { href: "dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { href: "animals", label: "পশু", icon: PawPrint },
  { href: "transactions", label: "লেনদেন", icon: Wallet },
];

export const SECONDARY_NAV = [
  { href: "members", label: "সদস্য", icon: Users },
  { href: "settings", label: "সেটিংস", icon: Settings },
];

// Live modules that live in the "আরও" drawer rather than the bottom tabs.
export const MODULE_NAV = [
  { href: "inventory", label: "ইনভেন্টরি", icon: Package },
  { href: "health", label: "স্বাস্থ্য", icon: HeartPulse },
];

export const COMING_SOON_NAV = [
  { label: "উৎপাদন", icon: Milk },
  { label: "রিপোর্ট", icon: ChartNoAxesCombined },
];

export const ALL_NAV = [...PRIMARY_NAV, ...MODULE_NAV, ...SECONDARY_NAV];

export function farmPath(farmId, href = "") {
  return `/f/${farmId}${href ? `/${href}` : ""}`;
}
