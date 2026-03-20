import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert } from "react-native";
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

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Profile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("users")
      .select("username, full_name, bio, city, gym_name, fitness_level, age")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setProfile(data);
      setForm(data);
    }
    setLoading(false);
  }

  async function saveProfile() {
    if (!form) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("users")
      .update({
        full_name: form.full_name,
        bio: form.bio,
        city: form.city,
        gym_name: form.gym_name,
        fitness_level: form.fitness_level,
        age: form.age,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setProfile(form);
      setEditing(false);
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
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.username}>@{profile?.username}</Text>
          {profile?.fitness_level && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{profile.fitness_level}</Text>
            </View>
          )}
        </View>

        {/* Info or Edit Form */}
        {editing && form ? (
          <View style={styles.form}>
            <Field label="Full Name" value={form.full_name ?? ""} onChangeText={(v: string) => setForm({ ...form, full_name: v })} />
            <Field label="Bio" value={form.bio ?? ""} onChangeText={(v: string) => setForm({ ...form, bio: v })} multiline />
            <Field label="City" value={form.city ?? ""} onChangeText={(v: string) => setForm({ ...form, city: v })} />
            <Field label="Gym Name" value={form.gym_name ?? ""} onChangeText={(v: string) => setForm({ ...form, gym_name: v })} />
            <Field label="Age" value={form.age?.toString() ?? ""} onChangeText={(v: string) => setForm({ ...form, age: parseInt(v) || null })} keyboardType="numeric" />

            <Text style={styles.label}>Fitness Level</Text>
            <View style={styles.levelRow}>
              {FITNESS_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.levelBtn, form.fitness_level === level && styles.levelBtnActive]}
                  onPress={() => setForm({ ...form, fitness_level: level })}
                >
                  <Text style={[styles.levelBtnText, form.fitness_level === level && styles.levelBtnTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setForm(profile); setEditing(false); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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

            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, multiline, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#555"
      />
    </View>
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
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  scroll: { padding: 24, paddingBottom: 60 },
  header: { alignItems: "center", marginBottom: 32 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#FF4500", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  username: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 8 },
  badge: { backgroundColor: "#1a1a1a", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1, borderColor: "#2a2a2a" },
  badgeText: { color: "#FF4500", fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  infoSection: { gap: 16 },
  fullName: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center" },
  bio: { fontSize: 15, color: "#888", textAlign: "center", lineHeight: 22 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#1a1a1a", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#2a2a2a" },
  chipIcon: { fontSize: 14 },
  chipLabel: { color: "#ccc", fontSize: 13 },
  editBtn: { backgroundColor: "#1a1a1a", borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#FF4500", marginTop: 8 },
  editBtnText: { color: "#FF4500", fontWeight: "700", fontSize: 16 },
  form: { gap: 4 },
  label: { color: "#888", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "#1a1a1a", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#2a2a2a" },
  levelRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  levelBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "#2a2a2a", alignItems: "center" },
  levelBtnActive: { backgroundColor: "#FF4500", borderColor: "#FF4500" },
  levelBtnText: { color: "#888", fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  levelBtnTextActive: { color: "#fff" },
  actionRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#333", alignItems: "center" },
  cancelText: { color: "#888", fontWeight: "600" },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FF4500", alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  logoutBtn: { marginTop: 40, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "#333", alignItems: "center" },
  logoutText: { color: "#555", fontWeight: "600" },
});
