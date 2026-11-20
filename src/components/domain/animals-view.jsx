"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAnimals, useSoftDeleteAnimal } from "@/hooks/use-animals";
import { useBanglaDigits } from "@/hooks/use-display-settings";
import { useCategories } from "@/hooks/use-categories";
import { formatMoney } from "@/lib/utils/format";
import { STATUS_LABELS } from "@/lib/animals/constants";
import {
  markAnimalDeadAction,
  markAnimalSickAction,
} from "@/lib/health/actions";
import { AnimalCard } from "./animal-card";
import { EmptyState } from "./empty-state";

export function AnimalsView({ farmId }) {
  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(""),
    category: parseAsString.withDefault("all"),
    status: parseAsStringLiteral([
      "all",
      "active",
      "sick",
      "sold",
      "dead",
      "transferred",
    ]).withDefault("all"),
  });

  const queryClient = useQueryClient();
  const [statusPending, startTransition] = useTransition();
  const { data: categories = [] } = useCategories(farmId, "animal");
  const animalsQuery = useAnimals(farmId, filters);
  const deleteMutation = useSoftDeleteAnimal(farmId, filters);
  const banglaDigits = useBanglaDigits(farmId);
  const animals = animalsQuery.data ?? [];

  const labelOf = (code) =>
    categories.find((category) => category.code === code)?.name_bn;

  function handleDelete(animal) {
    if (!window.confirm(`${animal.tag_no} কে মুছে ফেলতে চান?`)) return;
    deleteMutation.mutate(animal.id);
  }

  function handleStatus(action, animal, message) {
    if (!window.confirm(message)) return;
    const data = new FormData();
    data.set("farmId", farmId);
    data.set("animalId", animal.id);
    startTransition(async () => {
      await action(data);
      queryClient.invalidateQueries({ queryKey: ["animals", farmId] });
      queryClient.invalidateQueries({ queryKey: ["health", farmId] });
    });
  }

  function handleSick(animal) {
    handleStatus(
      markAnimalSickAction,
      animal,
      `${animal.tag_no} কে অসুস্থ হিসেবে চিহ্নিত করবেন?`
    );
  }

  function handleDead(animal) {
    handleStatus(
      markAnimalDeadAction,
      animal,
      `${animal.tag_no} কে মৃত হিসেবে চিহ্নিত করবেন?`
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">পশু</h1>
          <p className="text-sm text-muted-foreground">
            আপনার খামারের সব পশু এক জায়গায়
          </p>
        </div>
        <Button asChild className="press h-11 rounded-input">
          <Link href={`/f/${farmId}/animals/new`}>+ নতুন পশু</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={filters.q}
          onChange={(event) => setFilters({ q: event.target.value })}
          placeholder="ট্যাগ বা নাম খুঁজুন"
          className="h-11 rounded-input"
          aria-label="ট্যাগ বা নাম খুঁজুন"
        />
        <Select
          value={filters.category || "all"}
          onValueChange={(value) => setFilters({ category: value })}
        >
          <SelectTrigger className="h-11 rounded-input" aria-label="ধরন">
            <SelectValue placeholder="সব ধরন" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব ধরন</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.code} value={category.code}>
                {category.name_bn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ status: value })}
        >
          <SelectTrigger className="h-11 rounded-input" aria-label="অবস্থা">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব অবস্থা</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {animalsQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-32 rounded-card" />
          ))}
        </div>
      ) : null}

      {animalsQuery.isError ? (
        <EmptyState
          title="পশু লোড করা যায়নি"
          description="সংযোগ যাচাই করে আবার চেষ্টা করুন।"
          action={
            <Button
              variant="outline"
              className="press h-11 rounded-input"
              onClick={() => animalsQuery.refetch()}
            >
              আবার চেষ্টা করুন
            </Button>
          }
        />
      ) : null}

      {animalsQuery.isSuccess && animals.length === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="এখনো কোনো পশু নেই"
            description="প্রথম পশুটি যোগ করে আপনার তালিকা শুরু করুন।"
            action={
              <Button asChild className="press h-11 rounded-input">
                <Link href={`/f/${farmId}/animals/new`}>পশু যোগ করুন</Link>
              </Button>
            }
          />
        </div>
      ) : null}

      {animalsQuery.isSuccess && animals.length > 0 ? (
        <>
          <ul className="grid gap-3 md:hidden">
            {animals.map((animal) => (
              <AnimalCard
                key={animal.id}
                animal={animal}
                categoryLabel={labelOf(animal.category_code)}
                onDelete={handleDelete}
                onSick={handleSick}
                onDead={handleDead}
                banglaDigits={banglaDigits}
              />
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-card border border-border bg-card shadow-soft md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ট্যাগ</TableHead>
                  <TableHead>নাম</TableHead>
                  <TableHead>ধরন</TableHead>
                  <TableHead>অবস্থা</TableHead>
                  <TableHead className="text-right">ক্রয় মূল্য</TableHead>
                  <TableHead className="text-right">কাজ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animals.map((animal) => (
                  <TableRow key={animal.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/f/${farmId}/animals/${animal.id}`}
                        className="hover:underline"
                      >
                        {animal.tag_no}
                      </Link>
                    </TableCell>
                    <TableCell>{animal.name || "—"}</TableCell>
                    <TableCell>{labelOf(animal.category_code) ?? "—"}</TableCell>
                    <TableCell>
                      {STATUS_LABELS[animal.status] ?? animal.status}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {animal.purchase_price
                        ? formatMoney(animal.purchase_price, { banglaDigits })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {animal.status !== "dead" ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={statusPending}
                              onClick={() => handleSick(animal)}
                              className="press min-h-11 text-xs"
                            >
                              অসুস্থ
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={statusPending}
                              onClick={() => handleDead(animal)}
                              className="press min-h-11 text-xs"
                            >
                              মৃত
                            </Button>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(animal)}
                          className="press min-h-11 text-destructive"
                        >
                          মুছুন
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </main>
  );
}
