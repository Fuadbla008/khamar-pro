import { ROLE_LABELS } from "@/lib/members/constants";
import { TYPE_LABELS } from "@/lib/transactions/constants";
import { centsToDecimal, decimalToCents, sumDecimal } from "@/lib/utils/decimal";

function netOf(income, expense) {
  return centsToDecimal(decimalToCents(income) - decimalToCents(expense));
}

function percentOf(cents, totalCents) {
  if (totalCents <= 0n) return 0;
  const tenths = (cents * 1000n + totalCents / 2n) / totalCents;
  return Number(tenths) / 10;
}

export function detailRow(transaction, data) {
  const animal = transaction.animal_id ? data.animalMap.get(transaction.animal_id) : null;
  return {
    id: transaction.id,
    date: transaction.date,
    type: transaction.type,
    typeLabel: TYPE_LABELS[transaction.type] ?? transaction.type,
    category: data.categoryLabels.get(transaction.category_code) ?? transaction.category_code,
    amount: transaction.amount,
    paidBy: transaction.paid_by
      ? data.memberNames.get(transaction.paid_by) ?? "সদস্য"
      : "সদস্য নেই",
    animal: animal ? `${animal.tag_no}${animal.name ? ` · ${animal.name}` : ""}` : "",
    note: transaction.note ?? "",
  };
}

function lastTwelveMonths(range) {
  const anchorText = range?.to || range?.from;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(String(anchorText ?? ""))
    ? new Date(`${anchorText}T00:00:00`)
    : new Date();

  const end = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const months = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(end.getFullYear(), end.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      label: new Intl.DateTimeFormat("bn-BD", { month: "short" }).format(date),
      income: "0.00",
      expense: "0.00",
    });
  }
  return months;
}

function categoryBreakdown(rows, data) {
  const totals = new Map();
  for (const row of rows) {
    const code = row.category_code ?? "";
    totals.set(code, (totals.get(code) ?? 0n) + decimalToCents(row.amount));
  }

  const totalCents = [...totals.values()].reduce((sum, cents) => sum + cents, 0n);
  return [...totals.entries()]
    .map(([code, cents]) => ({
      code,
      label: data.categoryLabels.get(code) ?? code,
      amount: centsToDecimal(cents),
      percent: percentOf(cents, totalCents),
    }))
    .sort((a, b) => decimalToCents(b.amount) > decimalToCents(a.amount) ? 1 : -1);
}

export function aggregateSummary(data, range = {}) {
  const transactions = data.transactions;
  const incomeRows = transactions.filter((row) => row.type === "income");
  const expenseRows = transactions.filter((row) => row.type === "expense");
  const income = sumDecimal(incomeRows.map((row) => row.amount));
  const expense = sumDecimal(expenseRows.map((row) => row.amount));

  const monthly = lastTwelveMonths(range);
  const monthlyByKey = new Map(monthly.map((item) => [item.key, item]));
  for (const row of transactions) {
    const bucket = monthlyByKey.get(String(row.date ?? "").slice(0, 7));
    if (!bucket) continue;
    const cents = decimalToCents(row.amount);
    if (row.type === "income") {
      bucket.income = centsToDecimal(decimalToCents(bucket.income) + cents);
    } else {
      bucket.expense = centsToDecimal(decimalToCents(bucket.expense) + cents);
    }
  }

  return {
    income,
    expense,
    net: netOf(income, expense),
    count: transactions.length,
    incomeCount: incomeRows.length,
    expenseCount: expenseRows.length,
    monthly,
    expenseByCategory: categoryBreakdown(expenseRows, data),
  };
}

export function aggregateUserWise(data) {
  const groups = new Map();
  const ensureGroup = (key, name, role) => {
    if (!groups.has(key)) {
      groups.set(key, {
        userId: key,
        name,
        role,
        expenseCount: 0,
        incomeCount: 0,
        expenseAmounts: [],
        incomeAmounts: [],
        transactions: [],
      });
    }
    return groups.get(key);
  };

  for (const [userId, name] of data.memberNames.entries()) {
    ensureGroup(userId, name, data.memberRoles.get(userId) ?? null);
  }

  for (const transaction of data.transactions) {
    const key = transaction.paid_by ?? "none";
    const group = ensureGroup(
      key,
      key === "none" ? "সদস্য নেই" : data.memberNames.get(key) ?? "সদস্য",
      key === "none" ? null : data.memberRoles.get(key) ?? null
    );
    if (transaction.type === "income") {
      group.incomeCount += 1;
      group.incomeAmounts.push(transaction.amount);
    } else {
      group.expenseCount += 1;
      group.expenseAmounts.push(transaction.amount);
    }
    group.transactions.push(detailRow(transaction, data));
  }

  return [...groups.values()]
    .map((group) => {
      const expense = sumDecimal(group.expenseAmounts);
      const income = sumDecimal(group.incomeAmounts);
      const { expenseAmounts, incomeAmounts, ...rest } = group;
      return {
        ...rest,
        expense,
        income,
        balance: netOf(income, expense),
        roleLabel: group.role ? ROLE_LABELS[group.role] ?? group.role : "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "bn"));
}

export function aggregateAnimalWise(data) {
  const groups = new Map();

  for (const transaction of data.transactions) {
    if (!transaction.animal_id) continue;
    const animal = data.animalMap.get(transaction.animal_id);
    if (!animal) continue;

    if (!groups.has(animal.id)) {
      groups.set(animal.id, {
        id: animal.id,
        tagNo: animal.tag_no,
        name: animal.name ?? "",
        category: data.animalCategoryLabels.get(animal.category_code) ?? animal.category_code,
        expenseAmounts: [],
        incomeAmounts: [],
        transactions: [],
      });
    }
    const group = groups.get(animal.id);
    if (transaction.type === "income") group.incomeAmounts.push(transaction.amount);
    else group.expenseAmounts.push(transaction.amount);
    group.transactions.push(detailRow(transaction, data));
  }

  return [...groups.values()]
    .map((group) => {
      const expense = sumDecimal(group.expenseAmounts);
      const income = sumDecimal(group.incomeAmounts);
      const { expenseAmounts, incomeAmounts, ...rest } = group;
      return { ...rest, expense, income, net: netOf(income, expense) };
    })
    .sort((a, b) => a.tagNo.localeCompare(b.tagNo, "en"));
}

export function aggregateCategoryWise(data) {
  const incomeRows = data.transactions.filter((row) => row.type === "income");
  const expenseRows = data.transactions.filter((row) => row.type === "expense");
  return {
    income: categoryBreakdown(incomeRows, data),
    expense: categoryBreakdown(expenseRows, data),
  };
}

export function aggregateDetail(data) {
  return data.transactions.map((row) => detailRow(row, data));
}
