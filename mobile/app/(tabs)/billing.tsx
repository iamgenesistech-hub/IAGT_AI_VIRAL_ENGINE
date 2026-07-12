// app/(tabs)/billing.tsx — Billing & Payouts dashboard.
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '@/lib/storage';
import { COLORS, API_BASE } from '@/constants/config';
import { AffiliateSession } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BillingInfo {
  plan: string;
  planId: string;
  subscriptionStatus: string;
  videosUsed: number;
  videosRemaining: number | string;
  videosPerMonth: number | string;
  watermark: boolean;
  voiceClone: boolean;
  nextBillingDate: string;
  balance: string;
  lifetimeEarned: string;
  lastPayoutDate: string;
  purchases: Purchase[];
}

interface Purchase {
  id: string;
  item: string;
  amount: string;
  date: string;
  status: string;
}

interface CommsMessage {
  id: string;
  sender: 'AFFILIATE' | 'ADMIN' | 'AI';
  text: string;
  timestamp: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchBillingInfo(affiliateCode: string): Promise<BillingInfo> {
  const res = await fetch(`${API_BASE}/api/affiliate/billing/info?code=${encodeURIComponent(affiliateCode)}`);
  const data = await res.json();
  return data as BillingInfo;
}

async function startCommsSession(affiliateCode: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/affiliate/comms/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateCode }),
    });
    const data = await res.json();
    return data.sessionId || data.conversationId || affiliateCode;
  } catch { return affiliateCode; }
}

async function fetchCommsMessages(affiliateCode: string, sessionId: string): Promise<CommsMessage[]> {
  try {
    const res = await fetch(`${API_BASE}/api/affiliate/comms/conversation?affiliateCode=${encodeURIComponent(affiliateCode)}&sessionId=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    return Array.isArray(data.messages) ? data.messages : [];
  } catch { return []; }
}

async function sendCommsMessage(affiliateCode: string, sessionId: string, text: string): Promise<void> {
  await fetch(`${API_BASE}/api/affiliate/comms/message/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ affiliateCode, sessionId, message: text, sender: 'AFFILIATE' }),
  });
}

async function requestPayout(affiliateCode: string, method: string, walletAddress?: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/api/affiliate/billing/payout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ affiliateCode, method, walletAddress }),
  });
  const data = await res.json();
  return { success: !!data.success, message: data.message || (data.success ? 'Payout requested.' : data.error || 'Failed') };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BillingScreen() {
  const [session, setSession] = useState<AffiliateSession | null>(null);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<CommsMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState<'stripe' | 'btc' | 'eth'>('stripe');
  const [walletAddress, setWalletAddress] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (sess: AffiliateSession) => {
    try { setBilling(await fetchBillingInfo(sess.affiliateCode)); } catch {}
    try {
      const sid = await startCommsSession(sess.affiliateCode);
      setSessionId(sid);
      setMessages((await fetchCommsMessages(sess.affiliateCode, sid)).slice(-10));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const s = await getSession();
      setSession(s);
      if (s) await loadData(s);
      setLoading(false);
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (!session || !sessionId) return;
    pollRef.current = setInterval(async () => {
      try {
        setMessages((await fetchCommsMessages(session.affiliateCode, sessionId)).slice(-10));
      } catch {}
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session, sessionId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (session) await loadData(session);
    setRefreshing(false);
  }, [session, loadData]);

  async function handleSendMessage() {
    if (!session || !sessionId || !msgText.trim()) return;
    setSending(true);
    try {
      await sendCommsMessage(session.affiliateCode, sessionId, msgText.trim());
      setMsgText('');
      setMessages((await fetchCommsMessages(session.affiliateCode, sessionId)).slice(-10));
    } catch (e: unknown) {
      Alert.alert('Send failed', (e as Error).message);
    } finally { setSending(false); }
  }

  async function handlePayoutRequest() {
    if (!session) return;
    if ((payoutMethod === 'btc' || payoutMethod === 'eth') && !walletAddress.trim()) {
      Alert.alert('Wallet required', `Enter your ${payoutMethod.toUpperCase()} wallet address.`);
      return;
    }
    setPayoutLoading(true);
    try {
      const result = await requestPayout(session.affiliateCode, payoutMethod, walletAddress.trim() || undefined);
      Alert.alert(result.success ? 'Payout Requested' : 'Payout Failed', result.message);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    } finally { setPayoutLoading(false); }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const planColor = billing?.planId === 'elite' ? COLORS.primary : billing?.planId === 'creator' ? COLORS.accent : COLORS.textDim;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <Text style={styles.screenTitle}>Billing & Payouts</Text>

        {/* Subscription */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={18} color={planColor} />
            <Text style={styles.cardTitle}>Subscription</Text>
            <View style={[styles.badge, { backgroundColor: planColor + '22', borderColor: planColor + '55' }]}>
              <Text style={[styles.badgeText, { color: planColor }]}>{billing?.plan ?? 'Free'}</Text>
            </View>
          </View>
          <InfoRow label="Status" value={billing?.subscriptionStatus ?? '—'} />
          <InfoRow label="Videos This Month" value={`${billing?.videosUsed ?? 0} / ${billing?.videosPerMonth === 'Unlimited' || billing?.videosRemaining === 'Unlimited' ? '∞' : billing?.videosPerMonth ?? 0}`} />
          <InfoRow label="Voice Clone" value={billing?.voiceClone ? '✅ Included' : '❌ Not included'} />
          <InfoRow label="Watermark" value={billing?.watermark ? 'Yes' : 'No'} />
          <InfoRow label="Next Billing" value={billing?.nextBillingDate ?? '—'} />
          {billing?.planId !== 'elite' && (
            <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.8} onPress={() => Alert.alert('Upgrade', 'Visit the Upgrade screen to change your plan.')}>
              <Ionicons name="arrow-up-circle" size={16} color="#000" />
              <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Purchases */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt" size={18} color={COLORS.accent} />
            <Text style={styles.cardTitle}>Purchases</Text>
          </View>
          {billing?.purchases?.length ? billing.purchases.map((p, i) => (
            <View key={p.id ?? i} style={styles.purchaseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.purchaseItem}>{p.item}</Text>
                <Text style={styles.purchaseMeta}>{p.date} · {p.status}</Text>
              </View>
              <Text style={styles.purchaseAmount}>{p.amount}</Text>
            </View>
          )) : (
            <Text style={styles.emptyText}>No purchases yet.</Text>
          )}
        </View>

        {/* Commission */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up" size={18} color={COLORS.success} />
            <Text style={styles.cardTitle}>Commission</Text>
          </View>
          <View style={styles.commissionRow}>
            <View style={styles.commissionItem}>
              <Text style={styles.commissionValue}>${billing?.balance ?? '0.00'}</Text>
              <Text style={styles.commissionLabel}>Available</Text>
            </View>
            <View style={[styles.commissionItem, styles.commissionBorder]}>
              <Text style={styles.commissionValue}>${billing?.lifetimeEarned ?? '0.00'}</Text>
              <Text style={styles.commissionLabel}>Lifetime</Text>
            </View>
            <View style={styles.commissionItem}>
              <Text style={styles.commissionValue}>{billing?.lastPayoutDate ?? '—'}</Text>
              <Text style={styles.commissionLabel}>Last Payout</Text>
            </View>
          </View>
        </View>

        {/* Payout */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={18} color={COLORS.warning} />
            <Text style={styles.cardTitle}>Request Payout</Text>
          </View>
          <View style={styles.payoutMethods}>
            {(['stripe', 'btc', 'eth'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.payoutOption, payoutMethod === m && styles.payoutOptionActive]}
                onPress={() => setPayoutMethod(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.payoutOptionText, payoutMethod === m && styles.payoutOptionTextActive]}>
                  {m === 'stripe' ? '💳 USD' : m === 'btc' ? '₿ BTC' : 'Ξ ETH'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {(payoutMethod === 'btc' || payoutMethod === 'eth') && (
            <TextInput
              style={styles.walletInput}
              value={walletAddress}
              onChangeText={setWalletAddress}
              placeholder={`Enter ${payoutMethod.toUpperCase()} wallet address`}
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
          <TouchableOpacity
            style={[styles.payoutBtn, payoutLoading && styles.btnDisabled]}
            onPress={handlePayoutRequest}
            disabled={payoutLoading}
            activeOpacity={0.8}
          >
            {payoutLoading ? <ActivityIndicator color="#000" size="small" /> : (
              <>
                <Ionicons name="paper-plane" size={16} color="#000" />
                <Text style={styles.payoutBtnText}>Request Payout via {payoutMethod.toUpperCase()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbubbles" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Affiliate Support</Text>
          </View>
          <ScrollView style={styles.msgContainer} nestedScrollEnabled>
            {messages.length === 0 && <Text style={styles.emptyText}>No messages yet. Start a conversation below.</Text>}
            {messages.map((m, i) => (
              <View key={m.id ?? i} style={[styles.msgBubble, m.sender === 'AFFILIATE' ? styles.msgRight : styles.msgLeft]}>
                <Text style={styles.msgSender}>{m.sender}</Text>
                <Text style={styles.msgText}>{m.text}</Text>
                <Text style={styles.msgTime}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.msgInputRow}>
            <TextInput
              style={styles.msgInput}
              value={msgText}
              onChangeText={setMsgText}
              placeholder="Type a message…"
              placeholderTextColor={COLORS.textDim}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!msgText.trim() || sending) && styles.btnDisabled]}
              onPress={handleSendMessage}
              disabled={!msgText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? <ActivityIndicator color="#000" size="small" /> : <Ionicons name="send" size={18} color="#000" />}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  screenTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900', marginBottom: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { color: COLORS.text, fontWeight: '800', fontSize: 15, flex: 1 },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border + '55' },
  infoLabel: { color: COLORS.textMuted, fontSize: 13 },
  infoValue: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, marginTop: 14 },
  upgradeBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  purchaseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border + '44' },
  purchaseItem: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  purchaseMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  purchaseAmount: { color: COLORS.success, fontWeight: '700', fontSize: 13 },
  emptyText: { color: COLORS.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  commissionRow: { flexDirection: 'row' },
  commissionItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  commissionBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border + '55' },
  commissionValue: { color: COLORS.text, fontWeight: '900', fontSize: 18 },
  commissionLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
  payoutMethods: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  payoutOption: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  payoutOptionActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  payoutOptionText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  payoutOptionTextActive: { color: COLORS.primary },
  walletInput: { backgroundColor: COLORS.surface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, padding: 12, fontSize: 13, marginBottom: 12 },
  payoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, padding: 13 },
  payoutBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.5 },
  msgContainer: { maxHeight: 220, marginBottom: 10 },
  msgBubble: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 8, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end', backgroundColor: COLORS.primaryDim },
  msgSender: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  msgText: { color: COLORS.text, fontSize: 13 },
  msgTime: { color: COLORS.textDim, fontSize: 10, marginTop: 4, textAlign: 'right' },
  msgInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, padding: 10, fontSize: 13, maxHeight: 80 },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 10, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
});
