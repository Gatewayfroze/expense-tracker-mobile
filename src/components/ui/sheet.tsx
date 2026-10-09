import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/primitives';
import { useTheme } from '@/hooks/use-theme';

/** Bottom sheet modal (replaces the web Dialog). */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  fullHeight,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  fullHeight?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, paddingBottom: insets.bottom + 16 },
            fullHeight && { height: '90%' },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <AppText variant="heading">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              {subtitle}
            </AppText>
          ) : null}
          <ScrollView
            style={fullHeight ? { flex: 1 } : undefined}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 8, maxHeight: '90%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  content: { gap: 14, paddingTop: 16, paddingBottom: 8 },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 12 },
});
