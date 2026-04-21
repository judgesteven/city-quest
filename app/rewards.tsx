import { StyleSheet, Text, View } from "react-native";
import { theme } from "../src/constants/theme";

export default function RewardsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rewards</Text>
      <Text style={styles.subtitle}>Coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.font.lg,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sm,
  },
});

