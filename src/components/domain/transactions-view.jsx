"use client";

import { useState } from "react";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/domain/kpi-card";
import { EmptyState } from "@/components/domain/empty-state";
import { TransactionEditor } from "@/components/domain/transaction-editor";
import { TransactionRow } from "@/components/domain/transaction-row";
import { ExportButton } from "@/components/domain/export-button";
import { useBanglaDigits } from "@/hooks/use-display-settings";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useCategories } from "@/hooks/use-categories";
import {
  useCreateTransaction,
  useSoftDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "@/hooks/use-transactions";
import { TRANSACTION_CATEGORY_LABEL_FALLBACKS } from "@/lib/categories/fallback-labels";
import { TYPE_LABELS } from "@/lib/transactions/constants";
import { formatDate, formatMoney } from "@/lib/utils/format";

export function TransactionsView({ farmId, farmSlug, definitions, members, animals }) {
  const [filters, setFilters] = useQueryStates({
    from: parseAsString.withDefault(""),
    to: parseAsString.withDefault(""),
    type: parseAsStringLiteral(["all", "income", "expense"]).withDefault("all"),
    category: parseAsString.withDefault("all"),
    paidBy: parseAsString.withDefault("all"),
  });

  const { data: categories = [] } = useCategories(farmId, "transaction");
  const transactionsQuery = useTransactions(farmId, filters);
  const createMutation = useCreateTransaction(farmId);
  const updateMutation = useUpdateTransaction(farmId);
  const deleteMutation = useSoftDeleteTransaction(farmId);
  const isDesktop = useIsDesktop();
  const banglaDigits = useBanglaDigits(farmId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);

  const transactions = transactionsQuery.data ?? [];
  const isMutating = createMutation.isPending || updateMutation.isPending;

  const labelOf = (code) =>
    categories.find((category) => category.code === code)?.name_bn ??
    TRANSACTION_CATEGORY_LABEL_FALLBACKS[code];

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const groups = [];
  for (const transaction of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === transaction.date) {
      last.items.push(transaction);
    } else {
      groups.push({ date: transaction.date, items: [transaction] });
    }
  }

  function openNew() {
    setEditing(null);
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(transaction) {
    setEditing(transaction);
    setFormError(null);
    setEditorOpen(true);
  }

  function handleSubmit(formData) {
    const mutation = editing ? updateMutation : createMutation;
    mutation.mutate(formData, {
      onSuccess: (result) => {
        if (result?.error) {
          setFormError(result.error);
          return;
        }
        setEditorOpen(false);
      },
      onError: () => setFormError("সংরক্ষণ করা যায়নি, আবার চেষ্টা করুন"),
    });
  }

  function handleDelete(transaction) {
    if (!window.confirm("এই লেনদেনটি মুছে ফেলতে চান?")) return;
    deleteMutation.mutate(transaction.id);
  }

  const editorProps = {
    farmId,
    transaction: editing,
    definitions,
    categories,
    members,
    animals,
    onSubmit: handleSubmit,
    pending: isMutating,
    externalError: formError,
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">লেনদেন</h1>
          <p className="text-sm text-muted-foreground">
            খামারের সব আয় ও খরচ এক জায়গায়
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportButton
            farmId={farmId}
            farmSlug={farmSlug}
            entity="transactions"
            filename="transactions"
            filters={{
              from: filters.from,
              to: filters.to,
              type: filters.type,
              category: filters.category,
              paidBy: filters.paidBy,
            }}
          />
          <Button onClick={openNew} className="press h-11 rounded-input">
            + নতুন লেনদেন
          </Button>
        </div>
      </div>

      <section
        aria-label="ফলাফল"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <KpiCard
          label="নির্বাচিত আয়"
          value={formatMoney(income, { banglaDigits })}
          tone="success"
        />
        <KpiCard
          label="নির্বাচিত খরচ"
          value={formatMoney(expense, { banglaDigits })}
          tone="danger"
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          type="date"
          value={filters.from}
          onChange={(event) => setFilters({ from: event.target.value })}
          className="h-11 rounded-input"
          aria-label="শুরুর তারিখ"
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(event) => setFilters({ to: event.target.value })}
          className="h-11 rounded-input"
          aria-label="শেষ তারিখ"
        />
        <Select
          value={filters.type}
          onValueChange={(value) => setFilters({ type: value })}
        >
          <SelectTrigger className="h-11 rounded-input" aria-label="ধরন">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরন</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category || "all"}
          onValueChange={(value) => setFilters({ category: value })}
        >
          <SelectTrigger className="h-11 rounded-input" aria-label="ক্যাটাগরি">
            <SelectValue placeholder="সব ক্যাটাগরি" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ক্যাটাগরি</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.code} value={category.code}>
                {category.name_bn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.paidBy || "all"}
          onValueChange={(value) => setFilters({ paidBy: value })}
        >
          <SelectTrigger className="h-11 rounded-input" aria-label="সদস্য">
            <SelectValue placeholder="সব সদস্য" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব সদস্য</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {transactionsQuery.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-16 rounded-card" />
          ))}
        </div>
      ) : null}

      {transactionsQuery.isError ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="লেনদেন লোড করা যায়নি"
            description="সংযোগ যাচাই করে আবার চেষ্টা করুন।"
            action={
              <Button
                variant="outline"
                className="press h-11 rounded-input"
                onClick={() => transactionsQuery.refetch()}
              >
                আবার চেষ্টা করুন
              </Button>
            }
          />
        </div>
      ) : null}

      {transactionsQuery.isSuccess && transactions.length === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="এখনো কোনো লেনদেন নেই"
            description="প্রথম খরচ বা আয় যোগ করলেই এখানে দেখা যাবে।"
            action={
              <Button
                onClick={openNew}
                className="press h-11 rounded-input"
              >
                লেনদেন যোগ করুন
              </Button>
            }
          />
        </div>
      ) : null}

      {transactionsQuery.isSuccess && transactions.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.date}
              className="overflow-hidden rounded-card border border-border bg-card shadow-soft"
            >
              <div className="flex items-center justify-between bg-muted/60 px-4 py-2">
                <h2 className="text-sm font-semibold">
                  {formatDate(group.date, { banglaDigits })}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} টি লেনদেন
                </span>
              </div>
              <ul className="divide-y divide-border px-4">
                {group.items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    categoryLabel={labelOf(transaction.category_code)}
                    banglaDigits={banglaDigits}
                    actions={
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(transaction)}
                          className="press min-h-11"
                        >
                          সম্পাদনা
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction)}
                          className="press min-h-11 text-destructive"
                        >
                          মুছুন
                        </Button>
                      </>
                    }
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      <TransactionEditor
        key={editing?.id ?? "new"}
        mode={isDesktop ? "dialog" : "sheet"}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        formProps={editorProps}
      />
    </main>
  );
}
