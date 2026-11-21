import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="লেনদেন"
      description="লেনদেনের তথ্য লোড হচ্ছে…"
      variant="list"
    />
  );
}
