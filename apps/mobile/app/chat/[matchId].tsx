import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "../../lib/supabase";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
};

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("Chat");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    init();

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get other user's name
    const { data: match } = await supabase
      .from("matches")
      .select(`
        sender_id, receiver_id,
        sender:users!matches_sender_id_fkey(username, full_name),
        receiver:users!matches_receiver_id_fkey(username, full_name)
      `)
      .eq("id", matchId)
      .single();

    if (match) {
      const other = match.sender_id === user.id ? (match as any).receiver : (match as any).sender;
      setOtherName(other?.full_name ?? other?.username ?? "Chat");
    }

    // Load messages
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at, read")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoading(false);

    // Mark as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("match_id", matchId)
      .neq("sender_id", user.id)
      .eq("read", false);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || !userId || sending) return;
    setSending(true);
    setText("");

    await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: userId,
      content: trimmed,
      read: false,
    });

    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#FF4500" size="large" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{otherName[0]?.toUpperCase()}</Text>
        </View>
        <Text style={styles.headerName}>{otherName}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === userId;
            const prevMsg = messages[index - 1];
            const showTime = !prevMsg || (new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime()) > 5 * 60 * 1000;
            return (
              <View>
                {showTime && (
                  <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>
                )}
                <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                    {item.content}
                  </Text>
                  {isMine && (
                    <Text style={styles.readReceipt}>{item.read ? "✓✓" : "✓"}</Text>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Say hello! 👋</Text>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#444"
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1a1a1a", gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 24, color: "#888" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center" },
  headerAvatarText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  headerName: { fontSize: 17, fontWeight: "800", color: "#fff", flex: 1 },
  messageList: { padding: 16, gap: 4, paddingBottom: 8 },
  timeLabel: { textAlign: "center", fontSize: 11, color: "#444", marginVertical: 10 },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, marginVertical: 2 },
  bubbleMine: { backgroundColor: "#FF4500", alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "#1e1e1e", alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: "#ccc", lineHeight: 21 },
  bubbleTextMine: { color: "#fff" },
  readReceipt: { fontSize: 10, color: "rgba(255,255,255,0.6)", textAlign: "right", marginTop: 3 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyChatText: { fontSize: 16, color: "#444" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: "#1a1a1a" },
  input: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: "#fff", fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: "#2a2a2a" },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#2a2a2a" },
  sendBtnText: { fontSize: 20, fontWeight: "900", color: "#fff" },
});
