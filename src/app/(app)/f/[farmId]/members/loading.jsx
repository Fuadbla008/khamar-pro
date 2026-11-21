import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="সদস্য"
      description="সদস্যদের তথ্য লোড হচ্ছে…"
      variant="list"
    />
  );
}
