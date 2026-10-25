import { Slot } from 'expo-router';

// The LivePass homepage owns its responsive header. Avoid overlaying the starter tab bar.
export default function AppTabs() {
  return <Slot />;
}
