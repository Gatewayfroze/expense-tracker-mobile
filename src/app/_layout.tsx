import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (success || error) {
      SplashScreen.hideAsync();
    }
  }, [success, error]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.danger }}>Database migration failed: {error.message}</Text>
      </View>
    );
  }
  if (!success) {
    return null;
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NativeTabs
        backgroundColor={theme.background}
        indicatorColor={theme.muted}
        labelStyle={{ selected: { color: theme.text } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Expenses</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="receipt_long" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="summary">
          <NativeTabs.Trigger.Label>Summary</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="bar_chart" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="compare">
          <NativeTabs.Trigger.Label>Compare</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="compare_arrows" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon md="settings" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
