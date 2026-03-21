import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

type Profile = {
  username: string;
  full_name: string | null;
  bio: string | null;
  city: string | null;
  gym_name: string | null;
  fitness_level: "beginner" | "intermediate" | "advanced" | null;
  age: number | null;
};

const FITNESS_LEVELS = ["beginner", "intermediate", "advanced"] as const;
const LEVEL_COLOR: Record<string, string> = {
  beginner: "#22c55e",
  intermediate: "#f59e0b",
  advanced: "#FF4500",
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Profile | null>(null);

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("users")
      .select("username, full_name, bio, city, gym_name, fitness_level, age")
      .eq("id", user.id)
      .single();
    if (data) { setProfile(data); setForm(data); }
    setLoading(false);
  }

  async function saveProfile() {
    if (!form) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("users").update({
      full_name: form.full_name, bio: form.bio, city: form.city,
      gym_name: form.gym_name, fitness_level: form.fitness_level, age: form.age,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { Alert.alert("Error", error.message); return; }
    setProfile(form);
    setEditing(false);
  }

  if (loading) return (
    <SafeAreaView style={styles.container}>
      <ActivityIndicator color="#FF4500" size="large" style={{ flex: 1 }} />
    </SafeAreaView>
  );

  const initial = profile?.username?.[0]?.toUpperCase() ?? "?";
  const levelColor = profile?.fitness_level ? LEVEL_COLOR[profile.fitness_level] : "#555";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
          </View>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.fitness_level && (
            <View style={[styles.levelBadge, { borderColor: levelColor + "44", backgroundColor: levelColor + "11" }]}>
              <Text style={[styles.levelBadgeText, { color: levelColor }]}>
                {profile.fitness_level.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {editing && form ? (
          <View style={styles.editForm}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            {[
              { label: "Full Name", key: "full_name", value: form.full_name ?? "" },
              { label: "City", key: "city", value: form.city ?? "" },
              { label: "Gym", key: "gym_name", value: form.gym_name ?? "" },
            ].map((f) => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={f.value}
                  onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                  placeholderTextColor="#333"
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.fieldInput, { height: 90, textAlignVertical: "top" }]}
                value={form.bio ?? ""}
                onChangeText={(v) => setForm({ ...form, bio: v })}
                multiline
                placeholderTextColor="#333"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput
                style={styles.fieldInput}
                value={form.age?.toString() ?? ""}
                onChangeText={(v) => setForm({ ...form, age: parseInt(v) || null })}
                keyboardType="numeric"
                placeholderTextColor="#333"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Fitness Level</Text>
              <View style={styles.levelRow}>
                {FITNESS_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.levelBtn, form.fitness_level === level && { backgroundColor: LEVEL_COLOR[level], borderColor: LEVEL_COLOR[level] }]}
                    onPress={() => setForm({ ...form, fitness_level: level })}
                  >
                    <Text style={[styles.levelBtnText, form.fitness_level === level && { color: "#fff" }]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setForm(profile); setEditing(false); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoSection}>
            {profile?.full_name && <Text style={styles.fullName}>{profile.full_name}</Text>}
            {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            <View style={styles.infoGrid}>
              {profile?.city && <InfoChip icon="📍" label={profile.city} />}
              {profile?.gym_name && <InfoChip icon="🏋️" label={profile.gym_name} />}
              {profile?.age && <InfoChip icon="🎂" label={`${profile.age} years old`} />}
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.8}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function InfoChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { paddingHorizontal: 24, paddingBottom: 60 },
  hero: { alignItems: "center", paddingVertical: 32, gap: 10 },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#1a1a1a", shadowColor: "#FF4500", shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  avatarText: { fontSize: 40, fontWeight: "900", color: "#fff" },
  levelDot: { position: "absolute", bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#0A0A0A" },
  username: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  levelBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1 },
  levelBadgeText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5 },
  infoSection: { gap: 20 },
  fullName: { fontSize: 26, fontWeight: "900", color: "#fff", textAlign: "center", letterSpacing: -0.5 },
  bio: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 23 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#141414", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#222" },
  chipIcon: { fontSize: 14 },
  chipLabel: { color: "#999", fontSize: 13, fontWeight: "600" },
  editBtn: { backgroundColor: "#141414", borderRadius: 16, paddingVertical: 16, alignItems: "center", borderWidth: 1.5, borderColor: "#FF4500", marginTop: 8 },
  editBtnText: { color: "#FF4500", fontWeight: "800", fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginBottom: 8 },
  editForm: { gap: 16 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 12, color: "#555", fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  fieldInput: { backgroundColor: "#111", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: "#fff", fontSize: 15, borderWidth: 1.5, borderColor: "#1e1e1e" },
  levelRow: { flexDirection: "row", gap: 10 },
  levelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#222", alignItems: "center", backgroundColor: "#111" },
  levelBtnText: { color: "#555", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  editActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: "#222", alignItems: "center" },
  cancelText: { color: "#555", fontWeight: "700" },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: "#FF4500", alignItems: "center", shadowColor: "#FF4500", shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  logoutBtn: { marginTop: 40, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: "#1a1a1a", alignItems: "center" },
  logoutText: { color: "#333", fontWeight: "700", fontSize: 14 },
});
