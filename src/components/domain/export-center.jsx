"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildExportBundle,
  buildFarmBackup,
  buildMemberBundle,
} from "@/lib/export/actions";
import { downloadBlob } from "@/lib/export/download";

const ENTITY_OPTIONS = [
  { value: "animals", label: "পশু" },
  { value: "transactions", label: "লেনদেন" },
  { value: "inventory", label: "ইনভেন্টরি" },
  { value: "health", label: "স্বাস্থ্য রেকর্ড" },
  { value: "production", label: "উৎপাদন" },
  { value: "members", label: "সদস্য" },
];

const ALL_ENTITIES = ENTITY_OPTIONS.map((item) => item.value);

export function ExportCenter({
  farmId,
  members = [],
  self,
  canSelectMember = false,
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [allDates, setAllDates] = useState(true);
  const [selected, setSelected] = useState(ALL_ENTITIES);
  const [memberId, setMemberId] = useState(
    canSelectMember ? members[0]?.id ?? "" : self?.id ?? ""
  );
  const [busy, setBusy] = useState(null);

  function toggleEntity(value, checked) {
    setSelected((current) =>
      checked
        ? [...new Set([...current, value])]
        : current.filter((item) => item !== value)
    );
  }

  async function run(key, task) {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (error) {
      toast.error(error?.message || "রপ্তানি করা যায়নি, আবার চেষ্টা করুন");
    } finally {
      setBusy(null);
    }
  }

  async function downloadZip(payload) {
    // JSZip is loaded only when an export is requested, keeping it out of the
    // initial route bundle.
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const file of payload.files ?? []) {
      zip.file(file.name, file.content);
    }
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
    downloadBlob(payload.fileName, blob);
  }

  async function handleFullExport() {
    await run("full", async () => {
      const payload = await buildExportBundle(farmId, {
        section: "full",
        allData: true,
      });
      await downloadZip(payload);
      toast.success("সম্পূর্ণ খামার ডেটা এক্সপোর্ট সম্পন্ন");
    });
  }

  async function handleDateExport() {
    if (!allDates && (!from || !to)) {
      toast.error("শুরু ও শেষ তারিখ নির্বাচন করুন");
      return;
    }
    if (!selected.length) {
      toast.error("কমপক্ষে একটি ডেটা ধরন নির্বাচন করুন");
      return;
    }

    await run("date", async () => {
      const payload = await buildExportBundle(farmId, {
        section: "date",
        allData: allDates,
        from: allDates ? "" : from,
        to: allDates ? "" : to,
        entities: selected,
      });
      await downloadZip(payload);
      toast.success("ডেট ভিত্তিক এক্সপোর্ট সম্পন্ন");
    });
  }

  async function handleMemberExport() {
    if (canSelectMember && !memberId) {
      toast.error("একজন সদস্য নির্বাচন করুন");
      return;
    }

    await run("member", async () => {
      const payload = await buildMemberBundle(farmId, memberId);
      await downloadZip(payload);
      toast.success("সদস্য ভিত্তিক এক্সপোর্ট সম্পন্ন");
    });
  }

  async function handleBackup() {
    await run("backup", async () => {
      const payload = await buildFarmBackup(farmId);
      downloadBlob(
        payload.fileName,
        new Blob([payload.content], {
          type: "application/json;charset=utf-8;",
        })
      );
      toast.success("ব্যাকআপ JSON ডাউনলোড সম্পন্ন");
    });
  }

  return (
    <>
      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">সম্পূর্ণ খামার ডেটা</CardTitle>
          <CardDescription>
            পশু, লেনদেন, ইনভেন্টরি, স্বাস্থ্য, উৎপাদন, সদস্য, ক্যাটাগরি ও
            অতিরিক্ত ঘর—সব কিছু একসঙ্গে ZIP ফাইলে পাবেন।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={handleFullExport}
            disabled={Boolean(busy)}
            className="press h-11 w-full rounded-input sm:w-auto"
          >
            {busy === "full" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {busy === "full" ? "অপেক্ষা করুন..." : "সব ডেটা CSV-এ এক্সপোর্ট"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">ডেট ভিত্তিক এক্সপোর্ট</CardTitle>
          <CardDescription>
            নির্বাচিত ধরনের ডেটা ও নির্দিষ্ট সময়সীমা একসঙ্গে ZIP ফাইলে পাবেন।
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="export-all-dates"
              checked={allDates}
              onCheckedChange={(value) => setAllDates(value === true)}
              disabled={Boolean(busy)}
            />
            <Label htmlFor="export-all-dates">সব ডেটা</Label>
          </div>

          {allDates ? null : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="export-from">শুরুর তারিখ</Label>
                <Input
                  id="export-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                  disabled={Boolean(busy)}
                  className="h-11 rounded-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="export-to">শেষ তারিখ</Label>
                <Input
                  id="export-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => setTo(event.target.value)}
                  disabled={Boolean(busy)}
                  className="h-11 rounded-input"
                />
              </div>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">ডেটার ধরন</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ENTITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`export-entity-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={(value) =>
                      toggleEntity(option.value, value === true)
                    }
                    disabled={Boolean(busy)}
                  />
                  <Label htmlFor={`export-entity-${option.value}`}>
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>

          <Button
            type="button"
            onClick={handleDateExport}
            disabled={Boolean(busy)}
            className="press h-11 w-full rounded-input sm:w-auto"
          >
            {busy === "date" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {busy === "date" ? "অপেক্ষা করুন..." : "নির্বাচিত ডেটা এক্সপোর্ট"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">সদস্য ভিত্তিক</CardTitle>
          <CardDescription>
            নির্বাচিত সদস্যের নিজের তৈরি ও পরিশোধিত রেকর্ড একসঙ্গে পাবেন।
            {canSelectMember
              ? ""
              : " আপনি শুধু নিজের রেকর্ড এক্সপোর্ট করতে পারবেন।"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {canSelectMember ? (
            <div className="space-y-2">
              <Label htmlFor="export-member">সদস্য</Label>
              <Select
                value={memberId}
                onValueChange={setMemberId}
                disabled={Boolean(busy)}
              >
                <SelectTrigger
                  id="export-member"
                  className="h-11 w-full rounded-input"
                >
                  <SelectValue placeholder="সদস্য নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-input bg-muted/60 p-3 text-sm">
              <span className="text-muted-foreground">সদস্য: </span>
              <span className="font-medium">{self?.name ?? "আপনি"}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleMemberExport}
            disabled={Boolean(busy)}
            className="press h-11 w-full rounded-input sm:w-auto"
          >
            {busy === "member" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {busy === "member" ? "অপেক্ষা করুন..." : "সদস্যের ডেটা এক্সপোর্ট"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-card shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">ব্যাকআপ JSON</CardTitle>
          <CardDescription>
            খামার স্থানান্তরের জন্য সম্পূর্ণ JSON ব্যাকআপ—অতিরিক্ত ঘরের মান,
            ফিল্ড সংজ্ঞা, ক্যাটাগরি, পশু, লেনদেন, ইনভেন্টরি, স্বাস্থ্য, উৎপাদন,
            সদস্য ও সেটিংসসহ।
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={handleBackup}
            disabled={Boolean(busy)}
            className="press h-11 w-full rounded-input sm:w-auto"
          >
            {busy === "backup" ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {busy === "backup" ? "অপেক্ষা করুন..." : "JSON ব্যাকআপ ডাউনলোড"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
