import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="ইনভেন্টরি"
      description="স্টকের তথ্য লোড হচ্ছে…"
      variant="list"
    />
  );
}
