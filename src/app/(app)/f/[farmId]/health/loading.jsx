import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="স্বাস্থ্য"
      description="স্বাস্থ্য রেকর্ড লোড হচ্ছে…"
      variant="list"
    />
  );
}
