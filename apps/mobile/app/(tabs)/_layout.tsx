import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0F0F0F",
          borderTopColor: "#1A1A1A",
        },
        tabBarActiveTintColor: "#FF4500",
        tabBarInactiveTintColor: "#555",
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Keşfet",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Eşleşmeler",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>💪</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
