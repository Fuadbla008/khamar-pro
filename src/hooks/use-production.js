"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { productionTypesForTab } from "@/lib/production/constants";
import { deleteProductionAction } from "@/lib/production/actions";

export function productionKey(farmId, type = "all") {
  return ["production", farmId, type];
}

export function useProductionRecords(farmId, type = "all") {
  return useQuery({
    queryKey: productionKey(farmId, type),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("production_records")
        .select("*")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      const types = productionTypesForTab(type);
      if (types) query = query.in("type", types);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSoftDeleteProduction(farmId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId) => {
      const formData = new FormData();
      formData.set("farmId", farmId);
      formData.set("recordId", recordId);
      return deleteProductionAction(formData);
    },
    onMutate: async (recordId) => {
      const key = ["production", farmId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueriesData({ queryKey: key });
      queryClient.setQueriesData({ queryKey: key }, (rows) =>
        rows?.filter((row) => row.id !== recordId)
      );
      return { previous, key };
    },
    onError: (_error, _recordId, context) => {
      for (const [queryKey, data] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["production", farmId] });
      queryClient.invalidateQueries({ queryKey: ["transactions", farmId] });
      queryClient.invalidateQueries({ queryKey: ["animals", farmId] });
    },
  });
}

export function useInvalidateProduction(farmId) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["production", farmId] });
    queryClient.invalidateQueries({ queryKey: ["transactions", farmId] });
    queryClient.invalidateQueries({ queryKey: ["animals", farmId] });
  };
}
