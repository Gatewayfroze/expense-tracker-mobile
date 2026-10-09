import dayjs from 'dayjs';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { CategoryPicker } from '@/components/category-picker';
import { Button, CheckboxRow, TextField } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/sheet';
import type { Category } from '@/db/schema';
import { addExpense, updateExpense, type ExpenseRow } from '@/features/expenses/queries';
import { pickDate } from '@/lib/dates';
import { parseToSatang, satangToInput } from '@/lib/money';

/**
 * Add / edit form. Mount it with a `key` so the fields reset when switching
 * between "add" and editing different expenses.
 */
export function ExpenseFormSheet({
  visible,
  onClose,
  categories,
  initialDate,
  expense,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  initialDate: string;
  expense: ExpenseRow | null;
}) {
  const [amount, setAmount] = useState(expense ? satangToInput(expense.amountSatang) : '');
  const [discount, setDiscount] = useState(expense ? satangToInput(expense.discountSatang) : '');
  const [categoryId, setCategoryId] = useState<number | null>(expense?.categoryId ?? null);
  const [date, setDate] = useState(expense?.date ?? initialDate);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [isBasic, setIsBasic] = useState(expense?.isBasic ?? false);
  const [saving, setSaving] = useState(false);

  async function save() {
    const amountSatang = parseToSatang(amount);
    const discountSatang = parseToSatang(discount) ?? 0;

    if (amountSatang === null) {
      Alert.alert('Amount is required');
      return;
    }
    if (categoryId === null) {
      Alert.alert('Please choose a category');
      return;
    }
    if (description.trim() === '') {
      Alert.alert('Description is required');
      return;
    }

    const input = { date, amountSatang, discountSatang, categoryId, description: description.trim(), isBasic };
    setSaving(true);
    try {
      if (expense) {
        await updateExpense(expense.id, input);
      } else {
        await addExpense(input);
      }
      onClose();
    } catch (e) {
      Alert.alert('Could not save', String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={expense ? 'Edit expense' : 'Add expense'}
      subtitle={dayjs(date).format('ddd, MMM D, YYYY')}
      footer={
        <>
          <Button label="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
          <Button label={expense ? 'Save changes' : 'Add expense'} onPress={save} loading={saving} style={styles.flex} />
        </>
      }>
      <View style={styles.row}>
        <TextField
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          autoFocus={!expense}
        />
        <TextField
          label="Discount"
          value={discount}
          onChangeText={setDiscount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
      </View>

      <TextField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g., Coffee at the corner shop"
        maxLength={100}
      />

      <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} />

      <View style={styles.row}>
        <Button
          label={`📅  ${dayjs(date).format('MMM D, YYYY')}`}
          variant="outline"
          onPress={() => pickDate(date, setDate)}
          style={styles.flex}
        />
      </View>

      <CheckboxRow label="Mark as basic expense" value={isBasic} onChange={setIsBasic} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
