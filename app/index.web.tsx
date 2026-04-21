import { StyleSheet, Text, View } from "react-native";
import { ProfileCard } from "../src/components/ProfileCard";
import { theme } from "../src/constants/theme";
import { mockUser } from "../src/data/user";

export default function HomeScreenWeb() {
  return (
    <View style={styles.container}>
      <View style={styles.cardWrap}>
        <ProfileCard
          name={mockUser.name}
          avatarInitials={mockUser.avatarInitials}
          levelTitle={mockUser.levelTitle}
          xp={mockUser.xp}
          xpToNextLevel={mockUser.xpToNextLevel}
          gems={mockUser.gems}
        />
      </View>
      <View style={styles.messageCard}>
        <Text style={styles.title}>Map preview is mobile-only</Text>
        <Text style={styles.body}>
          Open this project in iOS Simulator, Android Emulator, or Expo Go to see the
          full location map experience.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.lg,
  },
  cardWrap: {
    width: "100%",
  },
  messageCard: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.card,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.font.lg,
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.md,
    lineHeight: 22,
  },
});

