/// <reference types="node" />
/**
 * One-off migration: reads all data from the old Supabase project (read-only)
 * and writes a backup file the mobile app can import (Settings › Import).
 *
 * Usage:
 *   1. Create .env.local in this project with:
 *        SUPABASE_URL=https://<project>.supabase.co
 *        SUPABASE_KEY=<anon key, or service_role key if RLS blocks the anon key>
 *   2. npm run dump-supabase            (writes backup-supabase.json)
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const PAGE_SIZE = 1000;

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function fetchAll<T>(table: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

type OldCategory = { id: number; name: string | null; type: string | null };
type OldExpense = {
  id: number;
  add_date: string | null;
  amount: number | null;
  discount: number | null;
  category_id: number | null;
  description: string | null;
  is_basicExpense: boolean | null;
};

function toSatang(value: number | null) {
  return Math.round((value ?? 0) * 100);
}

async function main() {
  const oldCategories = await fetchAll<OldCategory>('Master_Category');
  const oldExpenses = await fetchAll<OldExpense>('Expense_Transaction');

  if (oldExpenses.length === 0) {
    console.warn('WARNING: 0 expenses returned. If RLS is enabled, use the service_role key in SUPABASE_KEY.');
  }

  const skipped: number[] = [];
  const expenses = oldExpenses.flatMap((e) => {
    if (!e.add_date) {
      skipped.push(e.id);
      return [];
    }
    return [
      {
        id: e.id,
        // The web app saved dates as UTC midnight and grouped days by UTC date, so the UTC date is the intended day.
        date: new Date(e.add_date).toISOString().slice(0, 10),
        amountSatang: toSatang(e.amount),
        discountSatang: toSatang(e.discount),
        categoryId: e.category_id,
        description: e.description ?? '',
        isBasic: e.is_basicExpense ?? false,
      },
    ];
  });

  const backup = {
    app: 'expense-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: oldCategories.map((c) => ({ id: c.id, name: c.name ?? `Category ${c.id}`, type: c.type })),
    expenses,
  };

  const out = process.argv[2] ?? 'backup-supabase.json';
  writeFileSync(out, JSON.stringify(backup, null, 1));

  // Per-year gross totals, to compare against the old web Summary page after importing.
  const byYear = new Map<string, number>();
  expenses.forEach((e) => {
    const year = e.date.slice(0, 4);
    byYear.set(year, (byYear.get(year) ?? 0) + e.amountSatang);
  });

  console.log(`Wrote ${out}: ${backup.categories.length} categories, ${expenses.length} expenses`);
  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} expenses with no add_date: ids ${skipped.join(', ')}`);
  }
  console.log('Gross totals by year (should match the app Summary):');
  [...byYear.entries()].sort().forEach(([year, satang]) => {
    console.log(`  ${year}: ${(satang / 100).toFixed(2)}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
