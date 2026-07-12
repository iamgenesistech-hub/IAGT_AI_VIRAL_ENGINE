// app/_layout.tsx — Root layout: session check, push notification registration, routing.
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { getSession, saveSession } from '@/lib/storage';
import { COLORS, API_BASE } from '@/constants/config';

SplashScreen.preventAutoHideAsync();

// Show alerts for foreground notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulator — skip
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

async function saveTokenToBackend(affiliateCode: string, token: string) {
  try {
    await fetch(`${API_BASE}/api/affiliate/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateCode, expoPushToken: token }),
    });
  } catch {}
}

export default function RootLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSession();

      // Register for push notifications and persist token
      if (session?.affiliateCode) {
        try {
          const token = await registerForPushNotifications();
          if (token && token !== session.expoPushToken) {
            const updated = { ...session, expoPushToken: token };
            await saveSession(updated);
            await saveTokenToBackend(session.affiliateCode, token);
          }
        } catch {}
      }

      await SplashScreen.hideAsync();
      setReady(true);
      if (session?.affiliateCode) {
        router.replace('/(tabs)');
      } else {
        router.replace('/');
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile-editor" />
      </Stack>
    </>
  );
}
