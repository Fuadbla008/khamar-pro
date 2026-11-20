"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function animalsKey(farmId, filters) {
  return ["animals", farmId, filters];
}

export function useAnimals(farmId, filters = {}) {
  const { q = "", category = "all", status = "all" } = filters;

  return useQuery({
    queryKey: animalsKey(farmId, { q, category, status }),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("animals")
        .select("*")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const term = String(q).replace(/[,()\\%]/g, "").trim();
      if (term) {
        query = query.or(`tag_no.ilike.%${term}%,name.ilike.%${term}%`);
      }
      if (category && category !== "all") {
        query = query.eq("category_code", category);
      }
      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSoftDeleteAnimal(farmId, filters) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (animalId) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("animals")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", animalId);
      if (error) throw error;
    },
    onMutate: async (animalId) => {
      const key = animalsKey(farmId, filters);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (rows) =>
        rows?.filter((row) => row.id !== animalId)
      );
      return { previous, key };
    },
    onError: (_error, _animalId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["animals", farmId] });
    },
  });
}
