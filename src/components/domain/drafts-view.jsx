"use client";

import { useState } from "react";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/domain/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDrafts } from "@/hooks/use-drafts";
import { draftEntityLabel } from "@/lib/drafts/entities";

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function parseEditedValue(value, original) {
  if (!Array.isArray(original)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : value.split(",").map(String.prototype.trim);
  } catch {
    return value.split(",").map(String.prototype.trim);
  }
}

function formatCreatedAt(value) {
  try {
    return new Date(value).toLocaleString("bn-BD", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function DraftsView({ farmId }) {
  const {
    drafts,
    online,
    syncing,
    error,
    syncDrafts,
    updateDraftFields,
    removeDraft,
  } = useDrafts(farmId);
  const [editingId, setEditingId] = useState(null);
  const [editingRows, setEditingRows] = useState({});
  const countLabel = new Intl.NumberFormat("bn-BD").format(drafts.length);

  function beginEdit(draft) {
    const entries = Object.entries(draft.formData ?? {}).map(([key, value]) => ({
      key,
      value: stringifyValue(value),
    }));
    setEditingRows((previous) => ({ ...previous, [draft.id]: entries }));
    setEditingId(draft.id);
  }

  function changeField(draftId, index, field, value) {
    setEditingRows((previous) => ({
      ...previous,
      [draftId]: (previous[draftId] ?? []).map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      ),
    }));
  }

  function addField(draftId) {
    setEditingRows((previous) => ({
      ...previous,
      [draftId]: [...(previous[draftId] ?? []), { key: "", value: "" }],
    }));
  }

  async function saveEdit(draft) {
    const formData = {};
    for (const entry of editingRows[draft.id] ?? []) {
      const key = entry.key.trim();
      if (!key) continue;
      const original = draft.formData?.[key];
      formData[key] = parseEditedValue(entry.value, original);
    }

    try {
      await updateDraftFields(draft.id, { formData });
      setEditingId(null);
      toast.success("ড্রাফট হালনাগাদ হয়েছে");
    } catch {
      toast.error("ড্রাফট হালনাগাদ করা যায়নি, আবার চেষ্টা করুন");
    }
  }

  async function handleDelete(draft) {
    if (!window.confirm("এই ড্রাফটটি মুছে ফেলতে চান?")) return;

    await removeDraft(draft.id);
    if (editingId === draft.id) setEditingId(null);
    toast.success("ড্রাফট মুছে ফেলা হয়েছে");
  }

  async function handleSync() {
    if (!window.confirm("সেভ করা ড্রাফটগুলো সিঙ্ক করবেন?")) return;
    await syncDrafts();
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">সেভ করা ড্রাফট</h1>
          <p className="text-sm text-muted-foreground">
            ইন্টারনেট না থাকলে সেভ করা তথ্য এখান থেকে দেখুন ও সিঙ্ক করুন
          </p>
        </div>
        {drafts.length ? (
          <Button
            type="button"
            onClick={handleSync}
            disabled={!online || syncing}
            className="press h-11 rounded-input"
          >
            <RefreshCw className="size-4" aria-hidden />
            {syncing ? "সিঙ্ক হচ্ছে..." : "এখন সিঙ্ক করুন"}
          </Button>
        ) : null}
      </div>

      {!online ? (
        <p
          role="status"
          className="rounded-card border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          ইন্টারনেট সংযোগ নেই। সংযোগ ফিরলে ড্রাফটগুলো সিঙ্ক করুন।
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {drafts.length === 0 ? (
        <Card className="rounded-card shadow-soft">
          <EmptyState
            title="কোনো ড্রাফট নেই"
            description="অফলাইনে নতুন রেকর্ড সেভ করলে তা এখানে দেখা যাবে।"
          />
        </Card>
      ) : (
        <Card className="rounded-card shadow-soft">
          <CardHeader>
            <CardTitle>অপেক্ষমাণ ড্রাফট</CardTitle>
            <CardDescription>
              মোট {countLabel}টি ড্রাফট সিঙ্কের অপেক্ষায় আছে
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-card border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ধরন</TableHead>
                    <TableHead>তৈরির সময়</TableHead>
                    <TableHead>তথ্য</TableHead>
                    <TableHead className="text-right">কাজ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft) => {
                    const label = draftEntityLabel(draft.entity);
                    const isEditing = editingId === draft.id;
                    const preview = Object.entries(draft.formData ?? {})
                      .slice(0, 3)
                      .map(([key, value]) => `${key}: ${stringifyValue(value)}`)
                      .join(" · ");

                    return (
                      <TableRow key={draft.id}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatCreatedAt(draft.createdAt)}
                        </TableCell>
                        <TableCell className="min-w-72">
                          {isEditing ? (
                            <div className="space-y-2 py-1">
                              {(editingRows[draft.id] ?? []).map((entry, index) => (
                                <div
                                  key={`${draft.id}-${index}`}
                                  className="grid gap-2 sm:grid-cols-2"
                                >
                                  <Input
                                    value={entry.key}
                                    onChange={(event) =>
                                      changeField(draft.id, index, "key", event.target.value)
                                    }
                                    placeholder="কী"
                                    aria-label="তথ্যের নাম"
                                    className="h-10 rounded-input"
                                  />
                                  <Input
                                    value={entry.value}
                                    onChange={(event) =>
                                      changeField(draft.id, index, "value", event.target.value)
                                    }
                                    placeholder="মান"
                                    aria-label={`${entry.key || "তথ্য"} এর মান`}
                                    className="h-10 rounded-input"
                                  />
                                </div>
                              ))}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addField(draft.id)}
                                  className="press min-h-10"
                                >
                                  <Plus className="size-3.5" aria-hidden />
                                  নতুন কী
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => saveEdit(draft)}
                                  className="press min-h-10"
                                >
                                  সংরক্ষণ করুন
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingId(null)}
                                  className="press min-h-10"
                                >
                                  বাতিল
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
                              {preview || "কোনো তথ্য নেই"}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                isEditing ? setEditingId(null) : beginEdit(draft)
                              }
                              aria-label={`${label} ড্রাফট ${isEditing ? "সম্পাদনা বাতিল করুন" : "সম্পাদনা করুন"}`}
                              className="press size-11"
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(draft)}
                              aria-label={`${label} ড্রাফট মুছুন`}
                              className="press size-11 text-destructive"
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
