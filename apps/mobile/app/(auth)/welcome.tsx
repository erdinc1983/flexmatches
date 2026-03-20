import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.hero}>
        <Text style={styles.logo}>💪</Text>
        <Text style={styles.title}>FlexMatches</Text>
        <Text style={styles.subtitle}>
          Spor arkadaşını bul,{"\n"}hedeflerine birlikte ulaş
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={styles.primaryButtonText}>Başla</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.secondaryButtonText}>Zaten hesabım var</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: "#888888",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 26,
  },
  buttons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#FF4500",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  secondaryButtonText: {
    color: "#CCCCCC",
    fontSize: 16,
    fontWeight: "600",
  },
});
