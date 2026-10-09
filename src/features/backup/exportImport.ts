import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { asc } from 'drizzle-orm';

import { db } from '@/db/client';
import { categories, expenses } from '@/db/schema';

/**
 * Backup file format. The one-off Supabase dump script (scripts/dump-supabase.ts)
 * writes the same shape, so importing old data and restoring a backup share one path.
 */
export type BackupFile = {
  app: 'expense-tracker';
  version: 1;
  exportedAt: string;
  categories: { id: number; name: string; type: string | null }[];
  expenses: {
    id: number;
    date: string;
    amountSatang: number;
    discountSatang: number;
    categoryId: number | null;
    description: string;
    isBasic: boolean;
  }[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INSERT_CHUNK = 500;

function timestampForFilename() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function writeCacheFile(name: string, content: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(content);
  return file;
}

export async function buildBackup(): Promise<BackupFile> {
  const cats = await db.select().from(categories).orderBy(asc(categories.id));
  const rows = await db.select().from(expenses).orderBy(asc(expenses.id));

  return {
    app: 'expense-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    categories: cats.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    expenses: rows.map((e) => ({
      id: e.id,
      date: e.date,
      amountSatang: e.amountSatang,
      discountSatang: e.discountSatang,
      categoryId: e.categoryId,
      description: e.description,
      isBasic: e.isBasic,
    })),
  };
}

export async function exportJson() {
  const backup = await buildBackup();
  const file = writeCacheFile(`expenses-backup-${timestampForFilename()}.json`, JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save backup' });
  return backup.expenses.length;
}

function csvCell(value: string | number | boolean | null) {
  const s = value === null ? '' : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportCsv() {
  const backup = await buildBackup();
  const categoryNames = new Map(backup.categories.map((c) => [c.id, c.name]));
  const lines = ['date,category,description,amount,discount,net,is_basic'];
  backup.expenses.forEach((e) => {
    lines.push(
      [
        e.date,
        e.categoryId === null ? '' : (categoryNames.get(e.categoryId) ?? ''),
        e.description,
        (e.amountSatang / 100).toFixed(2),
        (e.discountSatang / 100).toFixed(2),
        ((e.amountSatang - e.discountSatang) / 100).toFixed(2),
        e.isBasic,
      ]
        .map(csvCell)
        .join(','),
    );
  });

  // BOM so Excel opens Thai text correctly.
  const file = writeCacheFile(`expenses-${timestampForFilename()}.csv`, '﻿' + lines.join('\n'));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
  return backup.expenses.length;
}

/** Throws with a readable message if the file is not a valid backup. */
export function parseBackup(text: string): BackupFile {
  let data: BackupFile;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  if (data?.app !== 'expense-tracker' || data.version !== 1) {
    throw new Error('Not an expense-tracker backup (version 1).');
  }
  if (!Array.isArray(data.categories) || !Array.isArray(data.expenses)) {
    throw new Error('Backup is missing categories or expenses.');
  }

  const categoryIds = new Set(data.categories.map((c) => c.id));
  data.expenses.forEach((e, i) => {
    if (!DATE_RE.test(e.date)) {
      throw new Error(`Expense #${i + 1} has an invalid date: ${e.date}`);
    }
    if (!Number.isInteger(e.amountSatang) || !Number.isInteger(e.discountSatang)) {
      throw new Error(`Expense #${i + 1} has a non-integer amount.`);
    }
    if (e.categoryId !== null && !categoryIds.has(e.categoryId)) {
      throw new Error(`Expense #${i + 1} references unknown category ${e.categoryId}.`);
    }
  });

  return data;
}

export async function pickBackupFile(): Promise<BackupFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) {
    return null;
  }

  const text = await new File(result.assets[0].uri).text();
  return parseBackup(text);
}

/** Replaces ALL local data with the backup contents, in a single transaction. */
export function restoreBackup(backup: BackupFile) {
  db.transaction((tx) => {
    tx.delete(expenses).run();
    tx.delete(categories).run();

    for (let i = 0; i < backup.categories.length; i += INSERT_CHUNK) {
      tx.insert(categories)
        .values(backup.categories.slice(i, i + INSERT_CHUNK))
        .run();
    }

    const now = new Date();
    for (let i = 0; i < backup.expenses.length; i += INSERT_CHUNK) {
      const chunk = backup.expenses.slice(i, i + INSERT_CHUNK).map((e) => ({
        ...e,
        description: e.description ?? '',
        createdAt: now,
        updatedAt: now,
      }));
      tx.insert(expenses).values(chunk).run();
    }
  });
}
