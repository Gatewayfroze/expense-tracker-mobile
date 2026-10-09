import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories, expenses } from '@/db/schema';
import { expenseWithCategoryFields } from '@/features/expenses/queries';

/**
 * Totals use the gross amount (not net of discount), same as the old web summary,
 * so numbers match what was shown before the migration.
 */

export type PeriodKind = 'month' | 'year';

export type GroupedRow = {
  period: string; // 'MM' for month grouping, 'YYYY' for year grouping
  categoryId: number | null;
  categoryName: string | null;
  categoryType: string | null;
  amount: number;
  discount: number;
  count: number;
};

export type CategorySummary = {
  categoryId: number | null;
  categoryName: string;
  categoryType: string;
  totalAmount: number; // satang
  count: number;
  previousAmount?: number;
  changeAmount?: number;
  changePercent?: number;
};

export type PeriodTab = {
  key: number; // 0 = All, otherwise month (1-12) or year
  label: string;
  categories: CategorySummary[];
};

export type PeriodTotal = {
  key: number;
  label: string;
  totalAmount: number;
  totalDiscount: number;
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Expenses grouped by (period, category) between two 'YYYY-MM-DD' dates, inclusive. */
export function groupedTotalsQuery(kind: PeriodKind, from: string, to: string) {
  const period =
    kind === 'month' ? sql<string>`substr(${expenses.date}, 6, 2)` : sql<string>`substr(${expenses.date}, 1, 4)`;

  return db
    .select({
      period,
      categoryId: expenses.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      amount: sql<number>`sum(${expenses.amountSatang})`,
      discount: sql<number>`sum(${expenses.discountSatang})`,
      count: sql<number>`count(*)`,
    })
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(and(gte(expenses.date, from), lte(expenses.date, to)))
    .groupBy(period, expenses.categoryId);
}

function categoryKey(row: { categoryId: number | null }) {
  return row.categoryId ?? -1;
}

function addToCategoryMap(map: Map<number, CategorySummary>, row: GroupedRow) {
  const key = categoryKey(row);
  let entry = map.get(key);
  if (!entry) {
    entry = {
      categoryId: row.categoryId,
      categoryName: row.categoryName ?? 'Uncategorized',
      categoryType: row.categoryType ?? 'Unknown',
      totalAmount: 0,
      count: 0,
    };
    map.set(key, entry);
  }
  entry.totalAmount += row.amount;
  entry.count += row.count;
}

function sortedCategories(map: Map<number, CategorySummary> | undefined): CategorySummary[] {
  return Array.from(map?.values() ?? []).sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Builds chart totals and per-period category tabs (with an "All" tab first).
 * `periodKeys` fixes which periods appear (12 months, or the last N years).
 * When `withChange` is set, each period's categories are compared with the previous period
 * (year-over-year), mirroring the old GetAllYearsSummary logic.
 */
export function buildSummary(rows: GroupedRow[], periodKeys: number[], labelOf: (key: number) => string, withChange: boolean) {
  const totals: PeriodTotal[] = periodKeys.map((key) => ({
    key,
    label: labelOf(key),
    totalAmount: 0,
    totalDiscount: 0,
  }));
  const totalsByKey = new Map(totals.map((t) => [t.key, t]));

  const allMap = new Map<number, CategorySummary>();
  const perPeriod = new Map<number, Map<number, CategorySummary>>();

  rows.forEach((row) => {
    const key = Number(row.period);
    const total = totalsByKey.get(key);
    if (!total) {
      return;
    }
    total.totalAmount += row.amount;
    total.totalDiscount += row.discount;

    addToCategoryMap(allMap, row);

    let periodMap = perPeriod.get(key);
    if (!periodMap) {
      periodMap = new Map();
      perPeriod.set(key, periodMap);
    }
    addToCategoryMap(periodMap, row);
  });

  const tabs: PeriodTab[] = [
    { key: 0, label: 'All', categories: sortedCategories(allMap) },
    ...periodKeys.map((key) => {
      const current = sortedCategories(perPeriod.get(key));
      if (!withChange) {
        return { key, label: labelOf(key), categories: current };
      }

      const previous = perPeriod.get(key - 1);
      const withYoY = current.map((cat) => {
        const previousAmount = previous?.get(categoryKey(cat))?.totalAmount ?? 0;
        if (previousAmount <= 0) {
          return cat;
        }
        const changeAmount = cat.totalAmount - previousAmount;
        return {
          ...cat,
          previousAmount,
          changeAmount,
          changePercent: (changeAmount / previousAmount) * 100,
        };
      });
      return { key, label: labelOf(key), categories: withYoY };
    }),
  ];

  return { totals, tabs };
}

export function monthLabel(month: number) {
  return MONTH_NAMES[month - 1];
}

export function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

/** Date range for a drill-down: a single month, or the whole span when month is 0. */
export function drillDownRange(kind: PeriodKind, scope: { year: number; key: number; fromYear?: number }) {
  if (kind === 'month') {
    if (scope.key === 0) {
      return yearRange(scope.year);
    }
    const mm = String(scope.key).padStart(2, '0');
    return { from: `${scope.year}-${mm}-01`, to: `${scope.year}-${mm}-31` };
  }

  if (scope.key === 0) {
    return { from: `${scope.fromYear ?? scope.year}-01-01`, to: `${scope.year}-12-31` };
  }
  return yearRange(scope.key);
}

export function expensesInRangeQuery(from: string, to: string, categoryId: number | null) {
  return db
    .select(expenseWithCategoryFields)
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        gte(expenses.date, from),
        lte(expenses.date, to),
        categoryId === null ? isNull(expenses.categoryId) : eq(expenses.categoryId, categoryId),
      ),
    )
    .orderBy(desc(expenses.date), desc(expenses.id));
}
