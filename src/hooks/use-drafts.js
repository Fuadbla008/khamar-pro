"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  deleteDraft,
  DRAFTS_CHANGED_EVENT,
  listDrafts,
  markSynced,
  saveDraft,
  updateDraft,
} from "@/lib/drafts/db";
import {
  draftEntityLabel,
  REDIRECTING_DRAFT_ENTITIES,
} from "@/lib/drafts/entities";
import { formDataToObject } from "@/lib/drafts/serialize";
import { getCurrentUserId } from "@/lib/drafts/user";

function banglaCount(value) {
  return new Intl.NumberFormat("bn-BD").format(value);
}

function currentOnlineStatus() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function syncRank(entity) {
  return REDIRECTING_DRAFT_ENTITIES.includes(entity) ? 1 : 0;
}

export function useDrafts(farmId, { watch = true } = {}) {
  const [drafts, setDrafts] = useState([]);
  const [online, setOnline] = useState(currentOnlineStatus);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  async function refreshDrafts() {
    const userId = await getCurrentUserId();
    const rows = await listDrafts({ farmId, userId });
    setDrafts(rows);
  }

  useEffect(() => {
    if (!watch) return undefined;

    let active = true;
    async function load() {
      const userId = await getCurrentUserId();
      const rows = await listDrafts({ farmId, userId });
      if (active) setDrafts(rows);
    }
    load();

    function onChanged() {
      load();
    }
    function onOnline() {
      setOnline(true);
      load();
    }
    function onOffline() {
      setOnline(false);
    }

    window.addEventListener(DRAFTS_CHANGED_EVENT, onChanged);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      active = false;
      window.removeEventListener(DRAFTS_CHANGED_EVENT, onChanged);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [farmId, watch]);

  async function saveDraftFromForm(entity, formData) {
    const data =
      formData instanceof FormData
        ? formDataToObject(formData)
        : { ...(formData ?? {}) };
    const resolvedFarmId = String(data.farmId ?? farmId ?? "");
    const userId = await getCurrentUserId();

    return saveDraft({
      entity,
      formData: data,
      farmId: resolvedFarmId,
      userId,
    });
  }

  async function updateDraftFields(id, patch) {
    return updateDraft(id, patch);
  }

  async function removeDraft(id) {
    return deleteDraft(id);
  }

  async function syncDrafts() {
    const userId = await getCurrentUserId();
    const rows = await listDrafts({ farmId, userId });
    if (rows.length === 0) {
      toast("সিঙ্ক করার মতো কোনো ড্রাফট নেই");
      return { ok: true, synced: 0, failed: 0, error: null };
    }

    setSyncing(true);
    setError(null);

    let synced = 0;
    let failed = 0;
    let message = null;
    const errors = [];

    try {
      const { replayDraft, isRedirectError } = await import(
        "@/lib/drafts/actions"
      );
      const ordered = [...rows].sort(
        (left, right) => syncRank(left.entity) - syncRank(right.entity)
      );

      for (const draft of ordered) {
        const label = draftEntityLabel(draft.entity);
        try {
          const result = await replayDraft(draft);
          if (!result.ok) {
            failed += 1;
            if (result.error) errors.push(`${label}: ${result.error}`);
            continue;
          }
          await markSynced(draft.id);
          synced += 1;
        } catch (caught) {
          if (isRedirectError(caught)) {
            await markSynced(draft.id);
            synced += 1;
            continue;
          }
          failed += 1;
          errors.push(`${label}: সিঙ্ক করা যায়নি`);
        }
      }

      await refreshDrafts();

      if (synced > 0) {
        toast.success(`${banglaCount(synced)}টি ড্রাফট সিঙ্ক হয়েছে`);
      }
      if (failed > 0) {
        const detail = errors.length ? ` — ${errors[0]}` : "";
        message = `${banglaCount(failed)}টি ড্রাফট সিঙ্ক করা যায়নি${detail}`;
        setError(message);
        toast.error(message);
      }

      return { ok: failed === 0, synced, failed, error: message };
    } finally {
      setSyncing(false);
    }
  }

  return {
    drafts,
    pendingCount: drafts.length,
    online,
    syncing,
    error,
    saveDraftFromForm,
    updateDraftFields,
    removeDraft,
    syncDrafts,
    refreshDrafts,
  };
}
