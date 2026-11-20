"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "@/lib/transactions/actions";

export function transactionsKey(farmId, filters) {
  return ["transactions", farmId, filters];
}

export function useTransactions(farmId, filters = {}) {
  const {
    from = "",
    to = "",
    type = "all",
    category = "all",
    paidBy = "all",
  } = filters;

  return useQuery({
    queryKey: transactionsKey(farmId, { from, to, type, category, paidBy }),
    enabled: Boolean(farmId),
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("farm_id", farmId)
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      if (type !== "all") query = query.eq("type", type);
      if (category !== "all") query = query.eq("category_code", category);
      if (paidBy !== "all") query = query.eq("paid_by", paidBy);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

function optimisticRow(formData, id) {
  const paidBy = String(formData.get("paidBy") ?? "none");
  const animalId = String(formData.get("animalId") ?? "none");
  let customFields = {};
  try {
    customFields = JSON.parse(String(formData.get("custom_fields") ?? "{}"));
  } catch {
    // Server validation will reject malformed JSON; keep the optimistic row simple.
  }

  return {
    id,
    farm_id: String(formData.get("farmId") ?? ""),
    type: String(formData.get("type") ?? "expense"),
    category_code: String(formData.get("categoryCode") ?? ""),
    amount: Number(String(formData.get("amount") ?? "0")),
    date: String(formData.get("date") ?? ""),
    paid_by: paidBy === "none" ? null : paidBy,
    animal_id: animalId === "none" ? null : animalId,
    note: String(formData.get("note") ?? "") || null,
    custom_fields: customFields,
    created_at: new Date().toISOString(),
  };
}

function useOptimisticTransactions(farmId) {
  const queryClient = useQueryClient();
  const key = ["transactions", farmId];

  return {
    snapshot: () => {
      // cancelQueries is awaited by callers before mutating the cache.
      return queryClient.cancelQueries({ queryKey: key });
    },
    previous: () => queryClient.getQueriesData({ queryKey: key }),
    restore: (previous) => {
      for (const [queryKey, data] of previous ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    update: (updater) => queryClient.setQueriesData({ queryKey: key }, updater),
    settle: () => queryClient.invalidateQueries({ queryKey: key }),
  };
}

export function useCreateTransaction(farmId) {
  const cache = useOptimisticTransactions(farmId);

  return useMutation({
    mutationFn: (formData) => createTransactionAction(formData),
    onMutate: async (formData) => {
      await cache.snapshot();
      const previous = cache.previous();
      const tempId = `temp-${Date.now()}`;
      const row = optimisticRow(formData, tempId);
      cache.update((rows) => (rows ? [row, ...rows] : [row]));
      return { previous };
    },
    onError: (_error, _formData, context) => cache.restore(context?.previous),
    onSettled: () => cache.settle(),
  });
}

export function useUpdateTransaction(farmId) {
  const cache = useOptimisticTransactions(farmId);

  return useMutation({
    mutationFn: (formData) => updateTransactionAction(formData),
    onMutate: async (formData) => {
      await cache.snapshot();
      const previous = cache.previous();
      const id = String(formData.get("transactionId") ?? "");
      const row = optimisticRow(formData, id);
      cache.update((rows) =>
        rows?.map((item) => (item.id === id ? { ...item, ...row } : item))
      );
      return { previous };
    },
    onError: (_error, _formData, context) => cache.restore(context?.previous),
    onSettled: () => cache.settle(),
  });
}

export function useSoftDeleteTransaction(farmId) {
  const cache = useOptimisticTransactions(farmId);

  return useMutation({
    mutationFn: (transactionId) => {
      const formData = new FormData();
      formData.set("farmId", farmId);
      formData.set("transactionId", transactionId);
      return deleteTransactionAction(formData);
    },
    onMutate: async (transactionId) => {
      await cache.snapshot();
      const previous = cache.previous();
      cache.update((rows) => rows?.filter((item) => item.id !== transactionId));
      return { previous };
    },
    onError: (_error, _transactionId, context) => cache.restore(context?.previous),
    onSettled: () => cache.settle(),
  });
}
