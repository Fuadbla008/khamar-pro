"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cleanFieldValues, initialFieldValues } from "@/lib/fields/resolve";
import { schemaFromFields } from "@/lib/fields/schema";
import { TRANSACTION_TYPES } from "@/lib/transactions/constants";
import { FieldRenderer } from "./field-renderer";

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function TransactionForm({
  farmId,
  transaction,
  definitions,
  categories = [],
  members = [],
  animals = [],
  onSubmit,
  pending = false,
  externalError,
}) {
  const [type, setType] = useState(transaction?.type ?? "expense");
  const [category, setCategory] = useState(transaction?.category_code ?? "");
  const [customValues, setCustomValues] = useState(() =>
    initialFieldValues(definitions, transaction?.custom_fields ?? {})
  );
  const [error, setError] = useState(null);

  const visibleCategories = categories.filter(
    (item) => !item.transaction_type || item.transaction_type === type
  );

  function handleSubmit(event) {
    event.preventDefault();

    const cleaned = cleanFieldValues(customValues);
    const result = schemaFromFields(definitions).safeParse(cleaned);

    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("custom_fields", JSON.stringify(cleaned));
    onSubmit(formData);
  }

  const shownError = error || externalError;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="farmId" value={farmId} />
      {transaction ? (
        <input type="hidden" name="transactionId" value={transaction.id} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="transaction-type">ধরন *</Label>
          <Select
            name="type"
            value={type}
            onValueChange={(value) => {
              setType(value);
              setCategory("");
            }}
          >
            <SelectTrigger id="transaction-type" className="h-11 rounded-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transaction-category">ক্যাটাগরি *</Label>
          <Select
            name="categoryCode"
            value={category}
            onValueChange={setCategory}
          >
            <SelectTrigger
              id="transaction-category"
              className="h-11 rounded-input"
            >
              <SelectValue placeholder="নির্বাচন করুন" />
            </SelectTrigger>
            <SelectContent>
              {visibleCategories.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">অর্থের পরিমাণ (৳) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            defaultValue={transaction?.amount ?? ""}
            placeholder="0.00"
            className="h-11 rounded-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">তারিখ *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={transaction?.date ?? localToday()}
            className="h-11 rounded-input"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paidBy">কে খরচ/আয় করেছে</Label>
          <Select
            name="paidBy"
            defaultValue={transaction?.paid_by ?? "none"}
          >
            <SelectTrigger id="paidBy" className="h-11 rounded-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">নির্বাচন করুনি</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name || "সদস্য"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="animalId">সম্পর্কিত পশু</Label>
          <Select
            name="animalId"
            defaultValue={transaction?.animal_id ?? "none"}
          >
            <SelectTrigger id="animalId" className="h-11 rounded-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">কোনো পশু নয়</SelectItem>
              {animals.map((animal) => (
                <SelectItem key={animal.id} value={animal.id}>
                  {animal.tag_no}
                  {animal.name ? ` — ${animal.name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">নোট</Label>
          <Textarea
            id="note"
            name="note"
            rows={2}
            defaultValue={transaction?.note ?? ""}
            className="rounded-input"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="attachmentUrl">সংযুক্তির লিংক</Label>
          <Input
            id="attachmentUrl"
            name="attachmentUrl"
            type="url"
            defaultValue={transaction?.attachment_url ?? ""}
            placeholder="https://..."
            className="h-11 rounded-input"
          />
        </div>
      </div>

      {definitions.length ? (
        <fieldset className="space-y-4 rounded-card border border-border p-4">
          <legend className="px-1 text-sm font-semibold">অতিরিক্ত তথ্য</legend>
          {definitions.map((definition) => (
            <FieldRenderer
              key={definition.id}
              definition={definition}
              value={customValues[definition.key]}
              onChange={(next) =>
                setCustomValues((previous) => ({
                  ...previous,
                  [definition.key]: next,
                }))
              }
            />
          ))}
        </fieldset>
      ) : null}

      {shownError ? (
        <p role="alert" className="text-sm text-destructive">
          {shownError}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        className="press h-11 w-full rounded-input"
      >
        {pending
          ? "অপেক্ষা করুন..."
          : transaction
            ? "হালনাগাদ করুন"
            : "লেনদেন যোগ করুন"}
      </Button>
    </form>
  );
}
