"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function inventoryKey(farmId, category = "all") {
  return ["inventory", farmId, category];
}

export function useInventoryItems(farmId, category = "all") {
  return useQuery({
    queryKey: inventoryKey(farmId, category),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("inventory_items")
        .select("*")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("category_code", { ascending: true })
        .order("name_bn", { ascending: true });

      if (category && category !== "all") {
        query = query.eq("category_code", category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvalidateInventory(farmId) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["inventory", farmId] });
}
