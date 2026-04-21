import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { theme } from "../src/constants/theme";

const tabIconByRoute = {
  index: { active: "map", inactive: "map-outline" },
  quests: { active: "flag", inactive: "flag-outline" },
  rewards: { active: "gift", inactive: "gift-outline" },
  profile: { active: "person", inactive: "person-outline" },
} as const;

type RouteName = keyof typeof tabIconByRoute;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={({ route }) => {
          const icon = tabIconByRoute[route.name as RouteName] ?? {
            active: "ellipse",
            inactive: "ellipse-outline",
          };

          return {
            headerShown: false,
            tabBarActiveTintColor: theme.colors.accent,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.tabBorder,
            },
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? icon.active : icon.inactive} size={size} color={color} />
            ),
          };
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Map" }} />
        <Tabs.Screen name="quests" options={{ title: "Quests" }} />
        <Tabs.Screen name="rewards" options={{ title: "Rewards" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
    </SafeAreaProvider>
  );
}

