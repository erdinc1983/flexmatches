import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../lib/supabase";

type Stats = {
  username: string;
  full_name: string | null;
  current_streak: number | null;
  match_count: number;
  workout_count: number;
};

export default function HomeScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { count: matchCount }, { count: workoutCount }] = await Promise.all([
      supabase.from("users").select("username, full_name, current_streak").eq("id", user.id).single(),
      supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
      supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    setStats({
      username: profile?.username ?? "",
      full_name: profile?.full_name ?? null,
      current_streak: profile?.current_streak ?? 0,
      match_count: matchCount ?? 0,
      workout_count: workoutCount ?? 0,
    });
    setLoading(false);
  }

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#FF4500" size="large" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  const name = stats?.full_name?.split(" ")[0] ?? stats?.username ?? "";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{name} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? "?"}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard emoji="🔥" value={stats?.current_streak ?? 0} label="Day Streak" color="#FF4500" />
          <StatCard emoji="🤝" value={stats?.match_count ?? 0} label="Matches" color="#22c55e" />
          <StatCard emoji="💪" value={stats?.workout_count ?? 0} label="Workouts" color="#a855f7" />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionCard emoji="🔍" title="Discover" subtitle="Find new partners" onPress={() => router.push("/(tabs)/discover")} accent />
          <ActionCard emoji="💬" title="Messages" subtitle="Chat with matches" onPress={() => router.push("/(tabs)/messages")} />
          <ActionCard emoji="🏋️" title="Log Workout" subtitle="Track activity" onPress={() => router.push("/(tabs)/activity")} />
          <ActionCard emoji="🎯" title="Goals" subtitle="Track progress" onPress={() => router.push("/(tabs)/goals")} />
        </View>

        {/* Motivational Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>💪</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Keep going!</Text>
            <Text style={styles.bannerText}>
              {(stats?.current_streak ?? 0) > 0
                ? `You're on a ${stats?.current_streak}-day streak. Don't break it!`
                : "Log your first workout to start your streak!"}
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: number; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + "33" }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({ emoji, title, subtitle, onPress, accent }: { emoji: string; title: string; subtitle: string; onPress: () => void; accent?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, accent && styles.actionCardAccent]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={[styles.actionTitle, accent && styles.actionTitleAccent]}>{title}</Text>
      <Text style={[styles.actionSubtitle, accent && styles.actionSubtitleAccent]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  scroll: { padding: 20, paddingBottom: 40, gap: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 15, color: "#888", fontWeight: "500" },
  name: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginTop: 2 },
  avatarBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#fff" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: "#1a1a1a", borderRadius: 16, padding: 14, alignItems: "center", gap: 4, borderWidth: 1 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 26, fontWeight: "900" },
  statLabel: { fontSize: 11, color: "#666", fontWeight: "600" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47.5%", backgroundColor: "#1a1a1a", borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: "#2a2a2a" },
  actionCardAccent: { backgroundColor: "#FF4500", borderColor: "#FF4500" },
  actionEmoji: { fontSize: 24, marginBottom: 4 },
  actionTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  actionTitleAccent: { color: "#fff" },
  actionSubtitle: { fontSize: 12, color: "#666" },
  actionSubtitleAccent: { color: "rgba(255,255,255,0.7)" },
  banner: { backgroundColor: "#1a0800", borderRadius: 18, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: "#FF450033" },
  bannerEmoji: { fontSize: 36 },
  bannerTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginBottom: 4 },
  bannerText: { fontSize: 13, color: "#888", lineHeight: 18 },
});
