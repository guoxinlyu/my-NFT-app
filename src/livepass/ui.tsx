import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function Action({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [p.action, secondary && p.secondary, (disabled || pressed) && { opacity: 0.45 }]}><Text style={[p.actionText, secondary && { color: '#e6e3f5' }]}>{label}</Text></Pressable>;
}
export function Field({ label, value, onChange, editable = true }: { label: string; value: string; onChange: (value: string) => void; editable?: boolean }) {
  return <View style={{ gap: 8 }}><Text style={p.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={editable} style={p.input} autoCapitalize="none" /></View>;
}
export const p = StyleSheet.create({
  stack: { gap: 17 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { color: '#eee4ff', fontSize: 23, lineHeight: 30, fontWeight: '700' }, copy: { color: '#cfc4df', fontSize: 14, lineHeight: 24 },
  small: { color: '#b3a5c7', fontSize: 12, lineHeight: 22 }, label: { color: '#d3bcf8', fontSize: 13, lineHeight: 23, fontWeight: '700' },
  action: { backgroundColor: '#c4a7ff', paddingVertical: 13, paddingHorizontal: 18, borderRadius: 9, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#170e2b', fontWeight: '700', fontSize: 14 }, secondary: { backgroundColor: '#251935', borderWidth: 1, borderColor: '#5a4274' },
  input: { backgroundColor: '#100c1c', borderWidth: 1, borderColor: '#685180', color: '#f2ebff', minHeight: 48, padding: 13, borderRadius: 8, fontSize: 14 },
  check: { padding: 13, borderWidth: 1, borderColor: '#5c436e', borderRadius: 8 },
  notice: { backgroundColor: '#2b1c3a', padding: 16, borderRadius: 9, color: '#e3c5fd', lineHeight: 24, gap: 10 },
  card: { borderWidth: 1, borderColor: '#503b66', borderRadius: 12, padding: 19, gap: 14, backgroundColor: '#191222' },
});
