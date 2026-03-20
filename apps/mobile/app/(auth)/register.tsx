import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!email || !password || !username) {
      Alert.alert("Hata", "Tüm alanlar gerekli");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Hata", "Şifre en az 6 karakter olmalı");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      Alert.alert("Kayıt Hatası", error.message);
      return;
    }
    if (data.user) {
      const { error: profileError } = await supabase
        .from("users")
        .insert({ id: data.user.id, username });
      if (profileError) {
        setLoading(false);
        Alert.alert("Hata", profileError.message);
        return;
      }
    }
    setLoading(false);
    Alert.alert("Başarılı!", "Email adresine doğrulama linki gönderdik.");
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Hesap oluştur</Text>
          <Text style={styles.subtitle}>FlexMatches'e katıl</Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Kullanıcı Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="flexkral"
                placeholderTextColor="#555"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="ornek@email.com"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şifre</Text>
              <TextInput
                style={styles.input}
                placeholder="En az 6 karakter"
                placeholderTextColor="#555"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Kayıt Ol</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.linkText}>
                Zaten hesabın var mı? <Text style={styles.link}>Giriş yap</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  inner: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backButton: { marginBottom: 32 },
  backText: { color: "#888", fontSize: 16 },
  title: { fontSize: 32, fontWeight: "800", color: "#FFF", letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: "#888", marginTop: 8, marginBottom: 40 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { color: "#CCC", fontSize: 14, fontWeight: "600" },
  input: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFF",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
  },
  button: {
    backgroundColor: "#FF4500",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  linkText: { color: "#888", textAlign: "center", fontSize: 14 },
  link: { color: "#FF4500", fontWeight: "600" },
});
