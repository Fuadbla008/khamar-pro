"use client";

import { useQuery } from "@tanstack/react-query";
import { resolveDefinitions } from "@/lib/fields/resolve";
import { createClient } from "@/lib/supabase/client";

export function useCategories(farmId, entity) {
  return useQuery({
    queryKey: ["categories", farmId, entity],
    enabled: Boolean(farmId && entity),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .or(`farm_id.eq.${farmId},farm_id.is.null`)
        .eq("entity", entity)
        .is("deleted_at", null)
        .eq("is_active", true);

      if (error) throw error;
      return resolveDefinitions(data, farmId, "code");
    },
  });
}
