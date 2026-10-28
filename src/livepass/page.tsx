import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Action, p } from './panels';
import { RouteAccess } from './route-access';
export function LivePassPage({ title, children }: PropsWithChildren<{ title: string }>) {
  const pathname = usePathname();
  return <RouteAccess admin={pathname.startsWith('/admin/')}><ScrollView style={{ flex: 1, backgroundColor: '#050510' }} contentContainerStyle={{ padding: 24, paddingBottom: 64 }}><View style={{ width: '100%', maxWidth: 900, alignSelf: 'center', gap: 24 }}><Action secondary label="← 返回演出列表" onPress={() => router.push('/shows')} /><Text accessibilityRole="header" style={p.title}>{title}</Text>{children}</View></ScrollView></RouteAccess>;
}
