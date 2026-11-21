import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="খামার"
      description="খামারের তথ্য লোড হচ্ছে…"
      variant="dashboard"
      rows={4}
    />
  );
}
