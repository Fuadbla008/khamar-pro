"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAnimalWiseReport,
  getCategoryWiseReport,
  getReportSummary,
  getTransactionDetail,
  getUserWiseReport,
} from "@/lib/reports/actions";

export function reportsKey(farmId, section, filters = {}) {
  return ["reports", farmId, section, filters];
}

function useReport(farmId, section, filters, action, enabled = true) {
  return useQuery({
    queryKey: reportsKey(farmId, section, filters),
    enabled: Boolean(farmId) && enabled,
    queryFn: () => action(farmId, filters),
  });
}

export function useReportSummary(farmId, filters, enabled = true) {
  return useReport(farmId, "summary", filters, getReportSummary, enabled);
}

export function useUserWiseReport(farmId, filters, enabled = true) {
  return useReport(farmId, "userwise", filters, getUserWiseReport, enabled);
}

export function useAnimalWiseReport(farmId, filters, enabled = true) {
  return useReport(farmId, "animalwise", filters, getAnimalWiseReport, enabled);
}

export function useCategoryWiseReport(farmId, filters, enabled = true) {
  return useReport(farmId, "categorywise", filters, getCategoryWiseReport, enabled);
}

export function useTransactionDetail(farmId, filters, enabled = true) {
  return useReport(farmId, "detail", filters, getTransactionDetail, enabled);
}
