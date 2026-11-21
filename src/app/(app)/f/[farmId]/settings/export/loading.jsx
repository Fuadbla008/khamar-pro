import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="ডেটা এক্সপোর্ট"
      description="এক্সপোর্টের বিকল্প লোড হচ্ছে…"
      variant="settings"
      rows={3}
      className="max-w-5xl"
    />
  );
}
