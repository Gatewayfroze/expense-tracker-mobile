import { asc, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories, expenses } from '@/db/schema';

export type ExpenseInput = {
  date: string;
  amountSatang: number;
  discountSatang: number;
  categoryId: number;
  description: string;
  isBasic: boolean;
};

export const expenseWithCategoryFields = {
  id: expenses.id,
  date: expenses.date,
  amountSatang: expenses.amountSatang,
  discountSatang: expenses.discountSatang,
  categoryId: expenses.categoryId,
  description: expenses.description,
  isBasic: expenses.isBasic,
  categoryName: categories.name,
  categoryType: categories.type,
};

export type ExpenseRow = {
  id: number;
  date: string;
  amountSatang: number;
  discountSatang: number;
  categoryId: number | null;
  description: string;
  isBasic: boolean;
  categoryName: string | null;
  categoryType: string | null;
};

export function expensesByDateQuery(date: string) {
  return db
    .select(expenseWithCategoryFields)
    .from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(eq(expenses.date, date))
    .orderBy(desc(expenses.id));
}

export function categoriesQuery() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function addExpense(input: ExpenseInput) {
  await db.insert(expenses).values(input);
}

export async function updateExpense(id: number, input: ExpenseInput) {
  await db
    .update(expenses)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function addCategory(name: string, type: string | null) {
  await db.insert(categories).values({ name, type });
}

export async function renameCategory(id: number, name: string, type: string | null) {
  await db.update(categories).set({ name, type }).where(eq(categories.id, id));
}

/** Deletes a category only if no expense uses it. Returns false when it is still in use. */
export async function deleteCategoryIfUnused(id: number): Promise<boolean> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(eq(expenses.categoryId, id));
  if (count > 0) {
    return false;
  }

  await db.delete(categories).where(eq(categories.id, id));
  return true;
}
