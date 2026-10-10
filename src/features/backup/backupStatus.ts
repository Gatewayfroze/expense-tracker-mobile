import dayjs from 'dayjs';
import Storage from 'expo-sqlite/kv-store';

/**
 * Tracks when the user last exported a JSON backup, so the app can remind them.
 * Stored in expo-sqlite's key-value store (separate from the expenses database,
 * so restoring a backup does not reset it).
 */

const LAST_EXPORT_KEY = 'backup.lastExportAt';
const SNOOZED_AT_KEY = 'backup.reminderSnoozedAt';

/** Remind when the last JSON export is older than this. */
export const BACKUP_REMINDER_DAYS = 30;
/** After "Later", wait this long before reminding again. */
const SNOOZE_DAYS = 3;

function readDate(key: string): Date | null {
  const value = Storage.getItemSync(key);
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLastExportAt() {
  return readDate(LAST_EXPORT_KEY);
}

export function markExported() {
  Storage.setItemSync(LAST_EXPORT_KEY, new Date().toISOString());
}

export function snoozeReminder() {
  Storage.setItemSync(SNOOZED_AT_KEY, new Date().toISOString());
}

/** Whole days since `date`, or null if there is no date. */
export function daysSince(date: Date | null) {
  return date ? dayjs().diff(date, 'day') : null;
}

export function isBackupOverdue(lastExportAt: Date | null) {
  const days = daysSince(lastExportAt);
  return days === null || days >= BACKUP_REMINDER_DAYS;
}

/** True when there is data to lose, the backup is overdue, and the user has not just snoozed. */
export function shouldRemindBackup(expenseCount: number) {
  if (expenseCount === 0 || !isBackupOverdue(getLastExportAt())) {
    return false;
  }
  const snoozedDays = daysSince(readDate(SNOOZED_AT_KEY));
  return snoozedDays === null || snoozedDays >= SNOOZE_DAYS;
}
