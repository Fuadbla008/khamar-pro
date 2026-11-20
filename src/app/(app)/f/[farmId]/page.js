import { Suspense } from "react";
import { redirect } from "next/navigation";

export default function FarmIndexPage({ params }) {
  return (
    <Suspense fallback={null}>
      <FarmRedirect params={params} />
    </Suspense>
  );
}

async function FarmRedirect({ params }) {
  const { farmId } = await params;
  redirect(`/f/${farmId}/dashboard`);
}
