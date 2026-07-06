// lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AffiliateSession } from './types';

const SESSION_KEY = 'evics_session';

export async function saveSession(session: AffiliateSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<AffiliateSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AffiliateSession;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function setItem(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(`evics_${key}`, JSON.stringify(value));
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`evics_${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
