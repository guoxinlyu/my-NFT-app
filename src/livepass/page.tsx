import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Action, p } from './panels';
export function LivePassPage({ title, children }: PropsWithChildren<{ title: string }>) {
  return <ScrollView style={{ flex: 1, backgroundColor: '#050510' }} contentContainerStyle={{ padding: 24, paddingBottom: 64 }}><View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', gap: 24 }}><Action secondary label="← 返回 LivePass 首页" onPress={() => router.push('/')} /><Text accessibilityRole="header" style={p.title}>{title}</Text>{children}</View></ScrollView>;
}
