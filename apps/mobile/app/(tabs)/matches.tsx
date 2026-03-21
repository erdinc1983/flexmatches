import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, FlatList, Alert
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

type MatchUser = {
  id: string;
  username: string;
  full_name: string | null;
  fitness_level: string | null;
  city: string | null;
};

type Match = {
  id: string;
  status: "pending" | "accepted" | "declined";
  sender_id: string;
  other_user: MatchUser;
};

export default function MatchesScreen() {
  const [pending, setPending] = useState<Match[]>([]);
  const [accepted, setAccepted] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Incoming pending requests (others sent to me)
    const { data: incomingData } = await supabase
      .from("matches")
      .select("id, status, sender_id, sender:users!matches_sender_id_fkey(id, username, full_name, fitness_level, city)")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    const incoming: Match[] = (incomingData ?? []).map((m: any) => ({
      id: m.id,
      status: m.status,
      sender_id: m.sender_id,
      other_user: m.sender,
    }));

    // Accepted matches (both directions)
    const { data: acceptedData } = await supabase
      .from("matches")
      .select(`
        id, status, sender_id,
        sender:users!matches_sender_id_fkey(id, username, full_name, fitness_level, city),
        receiver:users!matches_receiver_id_fkey(id, username, full_name, fitness_level, city)
      `)
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const acceptedMatches: Match[] = (acceptedData ?? []).map((m: any) => ({
      id: m.id,
      status: m.status,
      sender_id: m.sender_id,
      other_user: m.sender_id === user.id ? m.receiver : m.sender,
    }));

    setPending(incoming);
    setAccepted(acceptedMatches);
    setLoading(false);
  }

  async function respondToMatch(matchId: string, status: "accepted" | "declined") {
    const { error } = await supabase
      .from("matches")
      .update({ status })
      .eq("id", matchId);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      await loadMatches();
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
      <Text style={styles.title}>Matches</Text>

      <FlatList
        data={[]}
        ListHeaderComponent={
          <>
            {/* Pending Requests */}
            {pending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Requests <Text style={styles.sectionBadge}>{pending.length}</Text>
                </Text>
                {pending.map((match) => (
                  <View key={match.id} style={styles.pendingCard}>
                    <View style={styles.cardLeft}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {match.other_user.username[0].toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cardUsername}>@{match.other_user.username}</Text>
                        {match.other_user.full_name && (
                          <Text style={styles.cardSub}>{match.other_user.full_name}</Text>
                        )}
                        {match.other_user.city && (
                          <Text style={styles.cardSub}>📍 {match.other_user.city}</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => respondToMatch(match.id, "declined")}
                      >
                        <Text style={styles.declineBtnText}>✕</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => respondToMatch(match.id, "accepted")}
                      >
                        <Text style={styles.acceptBtnText}>✓ Accept</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Accepted Matches */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Connections <Text style={styles.sectionBadge}>{accepted.length}</Text>
              </Text>

              {accepted.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🤝</Text>
                  <Text style={styles.emptyTitle}>No connections yet</Text>
                  <Text style={styles.emptyText}>
                    Go to Discover and connect with someone!
                  </Text>
                </View>
              ) : (
                accepted.map((match) => (
                  <View key={match.id} style={styles.acceptedCard}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.avatar, styles.avatarAccepted]}>
                        <Text style={styles.avatarText}>
                          {match.other_user.username[0].toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cardUsername}>@{match.other_user.username}</Text>
                        {match.other_user.full_name && (
                          <Text style={styles.cardSub}>{match.other_user.full_name}</Text>
                        )}
                        <View style={styles.row}>
                          {match.other_user.fitness_level && (
                            <Text style={styles.levelTag}>{match.other_user.fitness_level}</Text>
                          )}
                          {match.other_user.city && (
                            <Text style={styles.cardSub}>📍 {match.other_user.city}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => router.push(`/chat/${match.id}`)}
                    >
                      <Text style={styles.chatBtnText}>Chat 💬</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        }
        renderItem={() => null}
        contentContainerStyle={styles.scroll}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#888", marginBottom: 12 },
  sectionBadge: { color: "#FF4500" },
  pendingCard: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#FF450033", marginBottom: 10, gap: 12 },
  acceptedCard: { backgroundColor: "#1a1a1a", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", gap: 12, alignItems: "center", flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarAccepted: { backgroundColor: "#1f2937" },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  cardUsername: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: 10 },
  declineBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  declineBtnText: { color: "#666", fontSize: 16 },
  acceptBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FF4500", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  acceptBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 2 },
  levelTag: { fontSize: 11, color: "#FF4500", fontWeight: "600", textTransform: "capitalize" },
  connectedBadge: { backgroundColor: "#0d2d0d", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "#166534" },
  connectedText: { color: "#22c55e", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  emptyText: { fontSize: 14, color: "#555", textAlign: "center" },
  chatBtn: { backgroundColor: "#FF4500", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
