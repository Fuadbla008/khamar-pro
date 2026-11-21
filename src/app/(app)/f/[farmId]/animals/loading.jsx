import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="পশু"
      description="পশুর তথ্য লোড হচ্ছে…"
      variant="list"
    />
  );
}
