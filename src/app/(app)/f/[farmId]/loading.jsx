import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="খামার"
      description="খামার লোড হচ্ছে…"
      variant="detail"
      rows={3}
    />
  );
}
