import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="ক্যাটাগরি ব্যবস্থাপনা"
      description="ক্যাটাগরির তথ্য লোড হচ্ছে…"
      variant="settings"
      rows={3}
      className="max-w-5xl"
    />
  );
}
