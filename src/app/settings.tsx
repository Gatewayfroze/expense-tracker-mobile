import dayjs from 'dayjs';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { sql } from 'drizzle-orm';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, TextField } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import { dotColor } from '@/constants/theme';
import { db } from '@/db/client';
import { expenses, type Category } from '@/db/schema';
import { daysSince, getLastExportAt, isBackupOverdue } from '@/features/backup/backupStatus';
import {
  exportCsv,
  exportJson,
  pickBackupFile,
  readPreImportSnapshot,
  restoreBackup,
  savePreImportSnapshot,
  type BackupFile,
} from '@/features/backup/exportImport';
import { addCategory, categoriesQuery, deleteCategoryIfUnused, renameCategory } from '@/features/expenses/queries';
import { useTheme } from '@/hooks/use-theme';

function readBackupInfo(): { lastExportAt: Date | null; snapshot: BackupFile | null } {
  let snapshot: BackupFile | null = null;
  try {
    snapshot = readPreImportSnapshot();
  } catch {
    // An unreadable snapshot just hides the "Undo last import" button.
  }
  return { lastExportAt: getLastExportAt(), snapshot };
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { data: categoryList } = useLiveQuery(categoriesQuery());
  const { data: stats } = useLiveQuery(db.select({ count: sql<number>`count(*)` }).from(expenses));
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [{ lastExportAt, snapshot }, setBackupInfo] = useState(readBackupInfo);

  function refreshBackupInfo() {
    setBackupInfo(readBackupInfo());
  }

  // Re-read on focus: an export can also happen from the reminder on the Expenses tab.
  useFocusEffect(
    useCallback(() => {
      setBackupInfo(readBackupInfo());
    }, []),
  );

  async function run(label: string, task: () => Promise<void>) {
    setBusy(label);
    try {
      await task();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function importBackup() {
    run('import', async () => {
      const backup = await pickBackupFile();
      if (!backup) {
        return;
      }
      Alert.alert(
        'Replace all data?',
        `This will DELETE everything on this phone and replace it with ${backup.expenses.length} expenses and ${backup.categories.length} categories from the file (exported ${backup.exportedAt}).`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: async () => {
              try {
                // If saving the current data fails, stop: never replace data we could not keep a copy of.
                await savePreImportSnapshot();
                restoreBackup(backup);
                refreshBackupInfo();
                Alert.alert(
                  'Import complete',
                  `${backup.expenses.length} expenses imported. Your previous data was saved — use "Undo last import" in Settings if this was the wrong file.`,
                );
              } catch (e) {
                Alert.alert('Import failed', `Nothing was changed. ${e instanceof Error ? e.message : String(e)}`);
              }
            },
          },
        ],
      );
    });
  }

  function undoImport() {
    if (!snapshot) {
      return;
    }
    Alert.alert(
      'Undo last import?',
      `This will replace the data on this phone with the ${snapshot.expenses.length} expenses that were here before the import (saved ${dayjs(snapshot.exportedAt).format('MMM D, YYYY HH:mm')}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo import',
          style: 'destructive',
          onPress: () => {
            try {
              restoreBackup(snapshot);
              Alert.alert('Restored', `${snapshot.expenses.length} expenses restored.`);
            } catch (e) {
              Alert.alert('Restore failed', e instanceof Error ? e.message : String(e));
            }
          },
        },
      ],
    );
  }

  const exportDays = daysSince(lastExportAt);
  const overdue = (stats[0]?.count ?? 0) > 0 && isBackupOverdue(lastExportAt);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">Settings</AppText>

        <Card style={styles.gap}>
          <AppText variant="heading">Backup</AppText>
          <AppText variant="caption" tone="secondary">
            Data lives only on this phone ({stats[0]?.count ?? 0} expenses). Export regularly and save the file to Google
            Drive or LINE so you can restore it on a new phone.
          </AppText>
          <AppText variant="caption" tone={overdue ? 'danger' : 'success'} style={styles.lastBackup}>
            {lastExportAt
              ? `Last backup: ${dayjs(lastExportAt).format('MMM D, YYYY')} (${exportDays === 0 ? 'today' : `${exportDays} ${exportDays === 1 ? 'day' : 'days'} ago`})`
              : 'Never backed up'}
          </AppText>
          <Button
            label="Export backup (JSON)"
            loading={busy === 'json'}
            onPress={() =>
              run('json', async () => {
                await exportJson();
                refreshBackupInfo();
              })
            }
          />
          <Button
            label="Export spreadsheet (CSV)"
            variant="outline"
            loading={busy === 'csv'}
            onPress={() =>
              run('csv', async () => {
                await exportCsv();
              })
            }
          />
          <Button label="Import / restore backup" variant="outline" loading={busy === 'import'} onPress={importBackup} />
          {snapshot ? (
            <>
              <Button label="Undo last import" variant="ghost" onPress={undoImport} />
              <AppText variant="caption" tone="secondary">
                Brings back the {snapshot.expenses.length} expenses that were on this phone before the last import.
              </AppText>
            </>
          ) : null}
        </Card>

        <Card style={styles.gap}>
          <View style={styles.rowCenter}>
            <AppText variant="heading" style={{ flex: 1 }}>
              Categories
            </AppText>
            <Button label="+ Add" compact onPress={() => setEditing('new')} />
          </View>
          {categoryList.length === 0 ? (
            <AppText variant="caption" tone="secondary">
              No categories yet.
            </AppText>
          ) : null}
          {categoryList.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setEditing(c)}
              android_ripple={{ color: theme.muted }}
              style={[styles.categoryRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.dot, { backgroundColor: dotColor(c.name) }]} />
              <AppText style={{ flex: 1 }}>{c.name}</AppText>
              {c.type ? (
                <AppText variant="caption" tone="secondary">
                  {c.type}
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </Card>
      </ScrollView>

      {editing ? (
        <CategorySheet category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
    </Screen>
  );
}

function CategorySheet({ category, onClose }: { category: Category | null; onClose: () => void }) {
  const [name, setName] = useState(category?.name ?? '');
  const [type, setType] = useState(category?.type ?? '');

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name is required');
      return;
    }
    const typeValue = type.trim() || null;
    if (category) {
      await renameCategory(category.id, trimmed, typeValue);
    } else {
      await addCategory(trimmed, typeValue);
    }
    onClose();
  }

  async function remove() {
    if (!category) {
      return;
    }
    const deleted = await deleteCategoryIfUnused(category.id);
    if (!deleted) {
      Alert.alert('Category in use', 'Some expenses still use this category, so it cannot be deleted.');
      return;
    }
    onClose();
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title={category ? 'Edit category' : 'New category'}
      footer={
        <>
          {category ? <Button label="Delete" variant="danger" onPress={remove} style={{ flex: 1 }} /> : null}
          <Button label="Save" onPress={save} style={{ flex: 2 }} />
        </>
      }>
      <TextField label="Name" value={name} onChangeText={setName} autoFocus />
      <TextField label="Type (optional)" value={type} onChangeText={setType} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  gap: { gap: 10 },
  lastBackup: { fontWeight: '600' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
