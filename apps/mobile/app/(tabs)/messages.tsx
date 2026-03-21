import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

type Conversation = {
  matchId: string;
  userId: string;
  username: string;
  full_name: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
};

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadConversations(); }, []);

  async function loadConversations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: matches } = await supabase
      .from("matches")
      .select(`
        id, sender_id, receiver_id,
        sender:users!matches_sender_id_fkey(id, username, full_name),
        receiver:users!matches_receiver_id_fkey(id, username, full_name)
      `)
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (!matches) { setLoading(false); return; }

    const convos: Conversation[] = await Promise.all(
      matches.map(async (m: any) => {
        const other = m.sender_id === user.id ? m.receiver : m.sender;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at, read, sender_id")
          .eq("match_id", m.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          matchId: m.id,
          userId: other.id,
          username: other.username,
          full_name: other.full_name,
          lastMessage: lastMsg?.content ?? null,
          lastMessageAt: lastMsg?.created_at ?? null,
          unread: lastMsg ? (!lastMsg.read && lastMsg.sender_id !== user.id) : false,
        };
      })
    );

    setConversations(convos);
    setLoading(false);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#FF4500" size="large" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Messages</Text>

      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>Match with someone to start chatting</Text>
          <TouchableOpacity style={styles.discoverBtn} onPress={() => router.push("/(tabs)/discover")}>
            <Text style={styles.discoverBtnText}>Go to Discover</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.matchId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/chat/${item.matchId}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, item.unread && styles.avatarUnread]}>
                <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.rowInfo}>
                <View style={styles.rowTop}>
                  <Text style={[styles.rowName, item.unread && styles.rowNameUnread]}>
                    {item.full_name ?? item.username}
                  </Text>
                  {item.lastMessageAt && (
                    <Text style={styles.rowTime}>{timeAgo(item.lastMessageAt)}</Text>
                  )}
                </View>
                <Text style={[styles.rowMsg, item.unread && styles.rowMsgUnread]} numberOfLines={1}>
                  {item.lastMessage ?? "Say hi! 👋"}
                </Text>
              </View>
              {item.unread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#2a2a2a", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarUnread: { backgroundColor: "#FF4500" },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  rowInfo: { flex: 1, gap: 4 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowName: { fontSize: 15, fontWeight: "600", color: "#aaa" },
  rowNameUnread: { color: "#fff", fontWeight: "800" },
  rowMsg: { fontSize: 13, color: "#555" },
  rowMsgUnread: { color: "#888" },
  rowTime: { fontSize: 11, color: "#444" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF4500" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  emptyText: { fontSize: 14, color: "#555", textAlign: "center" },
  discoverBtn: { backgroundColor: "#FF4500", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  discoverBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
