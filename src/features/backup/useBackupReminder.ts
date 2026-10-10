import { sql } from 'drizzle-orm';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { db } from '@/db/client';
import { expenses } from '@/db/schema';
import { daysSince, getLastExportAt, shouldRemindBackup, snoozeReminder } from '@/features/backup/backupStatus';
import { exportJson } from '@/features/backup/exportImport';

/** Once per app launch, asks the user to export a backup if the last one is overdue. */
export function useBackupReminder() {
  useEffect(() => {
    async function check() {
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(expenses);
      if (!shouldRemindBackup(count)) {
        return;
      }

      const days = daysSince(getLastExportAt());
      Alert.alert(
        'Time to back up',
        `${days === null ? 'You have never exported a backup' : `Your last backup was ${days} days ago`}. Your ${count} expenses are stored only on this phone — save a backup to Google Drive or LINE.`,
        [
          { text: 'Later', style: 'cancel', onPress: snoozeReminder },
          {
            text: 'Back up now',
            onPress: () => {
              exportJson().catch((e) => Alert.alert('Export failed', e instanceof Error ? e.message : String(e)));
            },
          },
        ],
        { cancelable: true, onDismiss: snoozeReminder },
      );
    }

    check().catch(() => {
      // A failed reminder check should never block the app.
    });
  }, []);
}
