export const DRAFTS_CHANGED_EVENT = "khamar:drafts-changed";

const DATABASE_NAME = "khamar-drafts";

let databasePromise;

function notifyDraftsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DRAFTS_CHANGED_EVENT));
}

// Dexie is loaded on demand from the client-only draft helpers so it never
// lands in the initial server/client bundle of unrelated routes.
async function getDatabase() {
  if (typeof window === "undefined") return null;

  if (!databasePromise) {
    databasePromise = import("dexie")
      .then(({ default: Dexie }) => {
        class DraftsDatabase extends Dexie {
          constructor() {
            super(DATABASE_NAME);
            // Declared schema keeps the core draft shape; farmId/userId are
            // extra indexed fields used for implicit scoping.
            this.version(1).stores({
              drafts: "++id, entity, createdAt, syncedAt, farmId, userId",
            });
          }
        }

        return new DraftsDatabase();
      })
      .catch((error) => {
        databasePromise = undefined;
        throw error;
      });
  }

  return databasePromise;
}

export async function saveDraft({
  entity,
  formData = {},
  farmId = "",
  userId = "",
  createdAt = new Date().toISOString(),
}) {
  const db = await getDatabase();
  if (!db) return null;

  const record = {
    entity,
    formData,
    farmId,
    userId,
    createdAt,
    syncedAt: null,
  };
  const id = await db.drafts.add(record);
  notifyDraftsChanged();
  return { ...record, id };
}

export async function updateDraft(id, patch = {}) {
  const db = await getDatabase();
  if (!db || !id) return null;

  const existing = await db.drafts.get(id);
  if (!existing) return null;

  const next = { ...existing, ...patch, id: existing.id };
  await db.drafts.put(next);
  notifyDraftsChanged();
  return next;
}

export async function listDrafts({ farmId, userId, includeSynced = false } = {}) {
  const db = await getDatabase();
  if (!db) return [];

  let rows = await db.drafts.toArray();
  if (!includeSynced) {
    rows = rows.filter((row) => row.syncedAt == null);
  }
  if (farmId) {
    rows = rows.filter((row) => row.farmId === farmId);
  }
  if (userId) {
    rows = rows.filter((row) => row.userId === userId);
  }

  return rows.sort((left, right) =>
    String(right.createdAt).localeCompare(String(left.createdAt))
  );
}

export async function deleteDraft(id) {
  const db = await getDatabase();
  if (!db || !id) return false;

  await db.drafts.delete(id);
  notifyDraftsChanged();
  return true;
}

export async function markSynced(id) {
  return updateDraft(id, { syncedAt: new Date().toISOString() });
}
