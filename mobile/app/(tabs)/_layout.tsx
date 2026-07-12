// app/(tabs)/_layout.tsx — Bottom tab bar.
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color, size }) => <TabIcon name="film" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarIcon: ({ color, size }) => <TabIcon name="card" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: 'Videos',
          tabBarIcon: ({ color, size }) => <TabIcon name="play-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size} />,
        }}
      />
      {/* Hidden routes — accessible via deep link but not shown in tab bar */}
      <Tabs.Screen name="avatar" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="upgrade" options={{ href: null }} />
    </Tabs>
  );
}
