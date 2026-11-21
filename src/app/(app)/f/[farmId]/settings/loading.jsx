import { RouteSkeleton } from "@/components/domain/route-skeleton";

export default function Loading() {
  return (
    <RouteSkeleton
      title="সেটিংস"
      description="খামারের সেটিংস লোড হচ্ছে…"
      variant="settings"
      className="max-w-5xl"
    />
  );
}
