import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Action, p } from '../livepass/ui';

export default function NotFoundPage() {
  return <View style={{ flex: 1, backgroundColor: '#050510', padding: 24, justifyContent: 'center', gap: 24 }}>
    <Text accessibilityRole="header" style={p.title}>404 · 页面不存在</Text>
    <Action secondary label="返回 LivePass" onPress={() => router.replace('/')} />
  </View>;
}
