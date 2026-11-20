"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { resolveDefinitions } from "@/lib/fields/resolve";
import { createClient } from "@/lib/supabase/client";

export function fieldsKey(farmId, entity) {
  return ["field-definitions", farmId, entity];
}

export function useFields(farmId, entity) {
  return useQuery({
    queryKey: fieldsKey(farmId, entity),
    enabled: Boolean(farmId && entity),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("field_definitions")
        .select("*")
        .or(`farm_id.eq.${farmId},farm_id.is.null`)
        .eq("entity", entity)
        .eq("is_active", true);

      if (error) throw error;
      return resolveDefinitions(data, farmId);
    },
  });
}

export function useInvalidateFields() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["field-definitions"] });
}
