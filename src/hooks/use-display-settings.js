"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function displaySettingsKey(farmId) {
  return ["display-settings", farmId];
}

export function useBanglaDigits(farmId) {
  const { data } = useQuery({
    queryKey: displaySettingsKey(farmId),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("farm_id", farmId)
        .eq("key", "display")
        .maybeSingle();

      if (error) throw error;
      // English is the default; only an explicit opt-in enables Bengali digits.
      return { bangla_digits: data?.value?.bangla_digits === true };
    },
  });

  return data?.bangla_digits === true;
}

export function useInvalidateDisplaySettings() {
  const queryClient = useQueryClient();
  return useCallback(
    (farmId) =>
      queryClient.invalidateQueries({ queryKey: displaySettingsKey(farmId) }),
    [queryClient]
  );
}
