import { createClient } from "@/lib/supabase/client";

let userIdPromise;

export function getCurrentUserId() {
  if (typeof window === "undefined") return Promise.resolve("local");

  if (!userIdPromise) {
    userIdPromise = createClient()
      .auth.getUser()
      .then(({ data }) => data.user?.id ?? "local")
      .catch(() => "local");
  }

  return userIdPromise;
}
