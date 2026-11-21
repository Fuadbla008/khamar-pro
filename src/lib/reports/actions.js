"use server";

import "server-only";

import { requireFarmAccess } from "@/lib/auth/require-farm-access";
import {
  aggregateAnimalWise,
  aggregateCategoryWise,
  aggregateDetail,
  aggregateSummary,
  aggregateUserWise,
} from "@/lib/reports/aggregate";
import { loadReportData } from "@/lib/reports/query";

// Every read is authenticated and farm-scoped: RLS on transactions, animals
// and farm_members uses is_farm_member(), so a member of another farm cannot
// smuggle rows in through these Server Actions.

export async function getReportSummary(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const data = await loadReportData(supabase, farmId, filters);
  return aggregateSummary(data, data.filters);
}

export async function getUserWiseReport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const data = await loadReportData(supabase, farmId, filters);
  return aggregateUserWise(data);
}

export async function getAnimalWiseReport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const data = await loadReportData(supabase, farmId, filters);
  return aggregateAnimalWise(data);
}

export async function getCategoryWiseReport(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const data = await loadReportData(supabase, farmId, filters);
  return aggregateCategoryWise(data);
}

export async function getTransactionDetail(farmId, filters = {}) {
  const { supabase } = await requireFarmAccess(farmId);
  const data = await loadReportData(supabase, farmId, filters);
  return aggregateDetail(data);
}
