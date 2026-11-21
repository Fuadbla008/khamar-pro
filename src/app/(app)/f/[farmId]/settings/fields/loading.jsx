import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="অতিরিক্ত ঘর ব্যবস্থাপনা"
      description="অতিরিক্ত ঘর লোড হচ্ছে…"
      variant="settings"
      rows={3}
      className="max-w-5xl"
    />
  );
}
