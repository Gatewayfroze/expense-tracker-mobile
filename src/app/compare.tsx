import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, IconButton, Screen, TextField } from '@/components/ui/primitives';
import { useTheme } from '@/hooks/use-theme';

// Price-per-unit comparison tool (ported from the web /compare page; no database).

type Item = { id: number; name: string; price: string; quantity: string; volume: string };

const emptyForm = { name: '', price: '', quantity: '', volume: '' };

function compute(item: Item) {
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 0;
  const volume = Number(item.volume) || 0;
  const totalVolume = quantity * volume;
  return {
    totalVolume,
    pricePerUnit: totalVolume > 0 ? price / totalVolume : 0,
    pricePerItem: quantity > 0 ? price / quantity : 0,
  };
}

export default function CompareScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm);

  const computed = items.map((item) => ({ item, ...compute(item) }));
  const best = computed.reduce<(typeof computed)[number] | null>((acc, cur) => {
    if (!acc) {
      return cur;
    }
    if (cur.pricePerUnit <= 0) {
      return acc;
    }
    if (acc.pricePerUnit <= 0) {
      return cur;
    }
    return cur.pricePerUnit < acc.pricePerUnit ? cur : acc;
  }, null);

  function addItem() {
    const name = form.name.trim();
    if (!name || !(Number(form.price) > 0) || !(Number(form.quantity) > 0) || !(Number(form.volume) > 0)) {
      return;
    }
    setItems((prev) => [...prev, { ...form, id: Date.now(), name }]);
    setForm(emptyForm);
  }

  function updateItem(id: number, field: keyof Omit<Item, 'id'>, value: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title">Compare Price</AppText>

        <Card style={styles.gap}>
          <AppText variant="heading">Add item</AppText>
          <View style={styles.row}>
            <TextField placeholder="Item name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
            <TextField
              placeholder="Price"
              keyboardType="decimal-pad"
              value={form.price}
              onChangeText={(v) => setForm({ ...form, price: v })}
            />
          </View>
          <View style={styles.row}>
            <TextField
              placeholder="Quantity"
              keyboardType="decimal-pad"
              value={form.quantity}
              onChangeText={(v) => setForm({ ...form, quantity: v })}
            />
            <TextField
              placeholder="Volume"
              keyboardType="decimal-pad"
              value={form.volume}
              onChangeText={(v) => setForm({ ...form, volume: v })}
            />
          </View>
          <View style={styles.row}>
            <Button label="+ Add" onPress={addItem} style={{ flex: 3 }} />
            <Button
              label="Reset"
              variant="danger"
              onPress={() => {
                setItems([]);
                setForm(emptyForm);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <AppText variant="heading">Results</AppText>
        {computed.length === 0 ? <AppText tone="secondary">No items</AppText> : null}
        {computed.map(({ item, totalVolume, pricePerItem, pricePerUnit }, index) => {
          const isBest = item.id === best?.item.id;
          return (
            <Card key={item.id} style={[styles.gap, isBest && { borderColor: theme.success, borderWidth: 2 }]}>
              <View style={styles.itemHeader}>
                <AppText variant="caption" tone="secondary" style={{ flex: 1 }}>
                  Item #{index + 1}
                  {isBest ? '   🏆 Best value' : ''}
                </AppText>
                <IconButton
                  glyph="✕"
                  label="Remove item"
                  onPress={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                />
              </View>
              <View style={styles.row}>
                <TextField value={item.name} onChangeText={(v) => updateItem(item.id, 'name', v)} placeholder="Name" />
                <TextField
                  value={item.price}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(item.id, 'price', v)}
                  placeholder="Price"
                />
              </View>
              <View style={styles.row}>
                <TextField
                  value={item.quantity}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(item.id, 'quantity', v)}
                  placeholder="Qty"
                />
                <TextField
                  value={item.volume}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => updateItem(item.id, 'volume', v)}
                  placeholder="Vol"
                />
              </View>
              <View style={styles.row}>
                <Stat label="Total volume" value={totalVolume.toFixed(2)} />
                <Stat label="Price / item" value={pricePerItem.toFixed(2)} />
                <Stat label="Price / unit" value={pricePerUnit.toFixed(4)} />
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText style={{ fontWeight: '600' }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  gap: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
});
