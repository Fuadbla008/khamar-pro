"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function healthKey(farmId) {
  return ["health", farmId];
}

export function useHealthRecords(farmId) {
  return useQuery({
    queryKey: healthKey(farmId),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("health_records")
        .select("*")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Medicines are inventory items whose active category is 'medicine'. Adding a
// new item through the inventory form makes it available here automatically.
export function useHealthMedicines(farmId) {
  return useQuery({
    queryKey: ["health-medicines", farmId],
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name_bn, name, unit, current_stock")
        .eq("farm_id", farmId)
        .eq("category_code", "medicine")
        .is("deleted_at", null)
        .order("name_bn", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useSoftDeleteHealthRecord(farmId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("health_records")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", recordId)
        .eq("farm_id", farmId);
      if (error) throw error;
    },
    onMutate: async (recordId) => {
      const key = healthKey(farmId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (rows) =>
        rows?.filter((row) => row.id !== recordId)
      );
      return { previous, key };
    },
    onError: (_error, _recordId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: healthKey(farmId) });
    },
  });
}

export function useInvalidateHealth(farmId) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: healthKey(farmId) });
    queryClient.invalidateQueries({ queryKey: ["animals", farmId] });
  };
}
