import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList, Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

type User = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  age: number | null;
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#FF4500",
};

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Fetch already sent match requests
    const { data: matches } = await supabase
      .from("matches")
      .select("receiver_id")
      .eq("sender_id", user.id);

    const sent = new Set((matches ?? []).map((m: any) => m.receiver_id));
    setSentRequests(sent);

    // Fetch all users except current user
    const { data, error } = await supabase
      .from("users")
      .select("id, username, full_name, bio, city, gym_name, fitness_level, age")
      .neq("id", user.id)
      .limit(50);

    if (!error && data) setUsers(data);
    setLoading(false);
  }

  async function sendMatchRequest(receiverId: string) {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("matches")
      .insert({ sender_id: currentUserId, receiver_id: receiverId, status: "pending" });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSentRequests((prev) => new Set([...prev, receiverId]));
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#FF4500" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.count}>{users.length} people nearby</Text>
      </View>

      {users.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyTitle}>No one here yet</Text>
          <Text style={styles.emptyText}>Be the first to join your area!</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.username[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardUsername}>@{item.username}</Text>
                  {item.full_name && (
                    <Text style={styles.cardFullName}>{item.full_name}</Text>
                  )}
                  <View style={styles.chipRow}>
                    {item.fitness_level && (
                      <View style={[styles.chip, { borderColor: LEVEL_COLOR[item.fitness_level] }]}>
                        <Text style={[styles.chipText, { color: LEVEL_COLOR[item.fitness_level] }]}>
                          {item.fitness_level}
                        </Text>
                      </View>
                    )}
                    {item.city && (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>📍 {item.city}</Text>
                      </View>
                    )}
                    {item.age && (
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>{item.age}y</Text>
                      </View>
                    )}
                  </View>
                  {item.bio && (
                    <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text>
                  )}
                  {item.gym_name && (
                    <Text style={styles.cardGym}>🏋️ {item.gym_name}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.matchBtn, sentRequests.has(item.id) && styles.matchBtnSent]}
                onPress={() => sendMatchRequest(item.id)}
                disabled={sentRequests.has(item.id)}
              >
                <Text style={[styles.matchBtnText, sentRequests.has(item.id) && styles.matchBtnTextSent]}>
                  {sentRequests.has(item.id) ? "Sent ✓" : "Connect"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  topBar: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  count: { fontSize: 13, color: "#555" },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: "#1a1a1a", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "#2a2a2a", flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  cardLeft: { flexDirection: "row", gap: 12, flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  cardInfo: { flex: 1, gap: 4 },
  cardUsername: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cardFullName: { fontSize: 13, color: "#888" },
  cardBio: { fontSize: 13, color: "#666", lineHeight: 18, marginTop: 2 },
  cardGym: { fontSize: 12, color: "#555", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#333" },
  chipText: { fontSize: 11, color: "#888", fontWeight: "600", textTransform: "capitalize" },
  matchBtn: { backgroundColor: "#FF4500", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: "center", flexShrink: 0 },
  matchBtnSent: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#333" },
  matchBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  matchBtnTextSent: { color: "#555" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyIcon: { fontSize: 60 },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  emptyText: { fontSize: 14, color: "#555" },
});
