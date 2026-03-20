import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Hata", "Email ve şifre gerekli");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert("Giriş Hatası", error.message);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Tekrar hoş geldin</Text>
        <Text style={styles.subtitle}>Hesabına giriş yap</Text>

        <View style={styles.form}>
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
              placeholder="••••••••"
              placeholderTextColor="#555"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={styles.linkText}>
              Hesabın yok mu? <Text style={styles.link}>Kayıt ol</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F0F" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
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
