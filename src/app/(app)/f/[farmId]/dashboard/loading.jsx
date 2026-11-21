import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="ড্যাশবোর্ড"
      description="আপনার খামারের হিসাব লোড হচ্ছে…"
      variant="dashboard"
      rows={4}
    />
  );
}
