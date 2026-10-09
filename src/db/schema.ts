import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type'),
});

export const expenses = sqliteTable(
  'expenses',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // Local calendar date 'YYYY-MM-DD' — no timezone conversion anywhere.
    date: text('date').notNull(),
    // Money is stored in satang (1/100 baht) to avoid floating point drift.
    amountSatang: integer('amount_satang').notNull(),
    discountSatang: integer('discount_satang').notNull().default(0),
    categoryId: integer('category_id').references(() => categories.id),
    description: text('description').notNull().default(''),
    isBasic: integer('is_basic_expense', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index('expenses_date_idx').on(t.date), index('expenses_category_idx').on(t.categoryId)],
);

export type Category = typeof categories.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
