import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../constants/theme";

type ProfileCardProps = {
  name: string;
  avatarInitials: string;
  levelTitle: string;
  xp: number;
  xpToNextLevel: number;
  gems: number;
};

export function ProfileCard({
  name,
  avatarInitials,
  levelTitle,
  xp,
  xpToNextLevel,
  gems,
}: ProfileCardProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const ratio = Math.max(0, Math.min(1, xp / xpToNextLevel));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress, ratio]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <LinearGradient
      colors={[theme.colors.surface, theme.colors.mapOverlay]}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitials}</Text>
        </View>

        <View style={styles.main}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.level}>{levelTitle}</Text>
        </View>

        <View style={styles.gemWrap}>
          <Text style={styles.gemDot}>●</Text>
          <Text style={styles.gemValue}>{gems}</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width }]} />
        </View>
        <Text style={styles.xpText}>
          {xp.toLocaleString()} / {xpToNextLevel.toLocaleString()} XP
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    ...theme.shadow.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
    marginRight: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.font.sm,
    fontWeight: "700",
    color: theme.colors.darkText,
  },
  main: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    fontSize: theme.font.base,
    color: theme.colors.text,
    fontWeight: "700",
  },
  level: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  gemWrap: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.gemChipBackground,
  },
  gemDot: {
    color: theme.colors.gem,
    fontSize: theme.font.base,
    marginRight: 6,
    lineHeight: theme.font.base + 2,
  },
  gemValue: {
    color: theme.colors.text,
    fontSize: theme.font.md,
    fontWeight: "700",
  },
  progressWrap: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  track: {
    width: "100%",
    height: 8,
    borderRadius: theme.radius.full,
    overflow: "hidden",
    backgroundColor: theme.colors.xpBarBackground,
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.xpBar,
  },
  xpText: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.sm,
    fontWeight: "500",
  },
});

