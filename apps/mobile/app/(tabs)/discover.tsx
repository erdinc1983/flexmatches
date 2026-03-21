import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

const { width: SCREEN_W } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

type User = {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  age: number | null;
  sports: string[] | null;
};

const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#FF4500",
};

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({ inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2], outputRange: ["-10deg", "0deg", "10deg"] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SCREEN_W / 4], outputRange: [0, 1] });
  const passOpacity = position.x.interpolate({ inputRange: [-SCREEN_W / 4, 0], outputRange: [1, 0] });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: matches } = await supabase
      .from("matches")
      .select("receiver_id")
      .eq("sender_id", user.id);
    const { data: passes } = await supabase
      .from("passes")
      .select("passed_id")
      .eq("user_id", user.id);

    const excludedIds = [
      user.id,
      ...(matches ?? []).map((m: any) => m.receiver_id),
      ...(passes ?? []).map((p: any) => p.passed_id),
    ];

    const { data } = await supabase
      .from("users")
      .select("id, username, full_name, bio, city, gym_name, fitness_level, age, sports")
      .not("id", "in", `(${excludedIds.join(",")})`)
      .limit(30);

    setUsers(data ?? []);
    setLoading(false);
  }

  function swipeRight() {
    Animated.timing(position, {
      toValue: { x: SCREEN_W * 1.5, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      sendLike();
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
    });
  }

  function swipeLeft() {
    Animated.timing(position, {
      toValue: { x: -SCREEN_W * 1.5, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      sendPass();
      position.setValue({ x: 0, y: 0 });
      setIndex((i) => i + 1);
    });
  }

  async function sendLike() {
    const target = users[index];
    if (!target || !currentUserId) return;
    await supabase.from("matches").insert({
      sender_id: currentUserId,
      receiver_id: target.id,
      status: "pending",
    });
  }

  async function sendPass() {
    const target = users[index];
    if (!target || !currentUserId) return;
    await supabase.from("passes").insert({
      user_id: currentUserId,
      passed_id: target.id,
    });
  }

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#FF4500" size="large" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  const current = users[index];
  const next = users[index + 1];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.counter}>{Math.max(0, users.length - index)} left</Text>
      </View>

      <View style={styles.cardArea}>
        {/* No more cards */}
        {!current && (
          <View style={styles.noMore}>
            <Text style={styles.noMoreEmoji}>🏋️</Text>
            <Text style={styles.noMoreTitle}>All caught up!</Text>
            <Text style={styles.noMoreText}>Check back later for new people near you</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => { setIndex(0); loadData(); }}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next card (behind) */}
        {next && current && (
          <View style={[styles.card, styles.cardBehind]}>
            <UserCard user={next} />
          </View>
        )}

        {/* Current card */}
        {current && (
          <Animated.View
            style={[styles.card, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
            {...panResponder.panHandlers}
          >
            {/* Like badge */}
            <Animated.View style={[styles.badge, styles.likeBadge, { opacity: likeOpacity }]}>
              <Text style={styles.badgeText}>LIKE 💚</Text>
            </Animated.View>
            {/* Pass badge */}
            <Animated.View style={[styles.badge, styles.passBadge, { opacity: passOpacity }]}>
              <Text style={styles.badgeText}>PASS ✕</Text>
            </Animated.View>

            <UserCard user={current} />
          </Animated.View>
        )}
      </View>

      {/* Action buttons */}
      {current && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.passBtn} onPress={swipeLeft}>
            <Text style={styles.passBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.likeBtn} onPress={swipeRight}>
            <Text style={styles.likeBtnText}>💚</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <View style={styles.cardInner}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>{user.username[0].toUpperCase()}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.cardName}>{user.full_name ?? user.username}</Text>
          {user.age && <Text style={styles.cardAge}>{user.age}</Text>}
        </View>
        <Text style={styles.cardUsername}>@{user.username}</Text>

        {user.bio && <Text style={styles.cardBio} numberOfLines={3}>{user.bio}</Text>}

        <View style={styles.chips}>
          {user.fitness_level && (
            <View style={[styles.chip, { borderColor: LEVEL_COLOR[user.fitness_level] + "66" }]}>
              <Text style={[styles.chipText, { color: LEVEL_COLOR[user.fitness_level] }]}>
                {user.fitness_level}
              </Text>
            </View>
          )}
          {user.city && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>📍 {user.city}</Text>
            </View>
          )}
          {user.gym_name && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🏋️ {user.gym_name}</Text>
            </View>
          )}
          {(user.sports ?? []).slice(0, 2).map((s) => (
            <View key={s} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  counter: { fontSize: 13, color: "#555", fontWeight: "600" },
  cardArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  card: { position: "absolute", width: SCREEN_W - 32, backgroundColor: "#1a1a1a", borderRadius: 24, borderWidth: 1, borderColor: "#2a2a2a", overflow: "hidden" },
  cardBehind: { transform: [{ scale: 0.95 }], top: 8 },
  cardInner: { padding: 24, gap: 16 },
  cardAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center", alignSelf: "center" },
  cardAvatarText: { fontSize: 32, fontWeight: "900", color: "#fff" },
  cardContent: { gap: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardName: { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  cardAge: { fontSize: 20, fontWeight: "700", color: "#666" },
  cardUsername: { fontSize: 14, color: "#555", fontWeight: "600" },
  cardBio: { fontSize: 15, color: "#999", lineHeight: 22 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#2a2a2a", backgroundColor: "#111" },
  chipText: { fontSize: 12, color: "#888", fontWeight: "600" },
  badge: { position: "absolute", top: 24, zIndex: 10, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2 },
  likeBadge: { right: 24, borderColor: "#22c55e", backgroundColor: "#0d2d0d" },
  passBadge: { left: 24, borderColor: "#ef4444", backgroundColor: "#2d0d0d" },
  badgeText: { fontSize: 16, fontWeight: "900", color: "#fff" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 40, paddingVertical: 24 },
  passBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#1a1a1a", borderWidth: 2, borderColor: "#333", alignItems: "center", justifyContent: "center" },
  passBtnText: { fontSize: 22, color: "#888" },
  likeBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center", shadowColor: "#FF4500", shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  likeBtnText: { fontSize: 28 },
  noMore: { alignItems: "center", gap: 12, paddingHorizontal: 32 },
  noMoreEmoji: { fontSize: 64 },
  noMoreTitle: { fontSize: 24, fontWeight: "900", color: "#fff" },
  noMoreText: { fontSize: 15, color: "#555", textAlign: "center", lineHeight: 22 },
  refreshBtn: { backgroundColor: "#FF4500", borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  refreshText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
