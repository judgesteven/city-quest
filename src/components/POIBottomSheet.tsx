import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { POI } from "../data/pois";
import { theme } from "../constants/theme";

type POIBottomSheetProps = {
  visible: boolean;
  poi: POI | null;
  tabBarHeight: number;
  onClose: () => void;
  onVisit: (poiId: string) => void;
};

export function POIBottomSheet({
  visible,
  poi,
  tabBarHeight,
  onClose,
  onVisit,
}: POIBottomSheetProps) {
  const offsetY = useRef(new Animated.Value(220)).current;

  useEffect(() => {
    if (visible && poi) {
      Animated.spring(offsetY, {
        toValue: 0,
        damping: 15,
        stiffness: 160,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(offsetY, {
        toValue: 220,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, poi, offsetY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 8,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            offsetY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 90 || gestureState.vy > 1) {
            onClose();
          } else {
            Animated.spring(offsetY, {
              toValue: 0,
              damping: 16,
              stiffness: 170,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [offsetY, onClose]
  );

  if (!visible || !poi) {
    return null;
  }

  const categoryColor = theme.colors.categoryColors[poi.category];

  return (
    <>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        style={[
          styles.wrap,
          { bottom: tabBarHeight + 12, transform: [{ translateY: offsetY }] },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={[theme.colors.surface, theme.colors.mapOverlay]}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.grabber} />
          <View style={[styles.categoryPill, { backgroundColor: `${categoryColor}33` }]}>
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {poi.category.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>{poi.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {poi.description}
          </Text>

          <View style={styles.footer}>
            <View style={styles.rewards}>
              <Text style={styles.rewardText}>⚡ +{poi.xpReward} XP</Text>
              <Text style={styles.rewardText}>💎 +{poi.gemReward}</Text>
            </View>

            <Pressable style={styles.visitButton} onPress={() => onVisit(poi.id)}>
              <Text style={styles.visitText}>Visit</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
    ...theme.shadow.card,
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: theme.radius.full,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.textTertiary,
  },
  categoryPill: {
    alignSelf: "flex-start",
    minHeight: 28,
    minWidth: 44,
    borderRadius: theme.radius.full,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  categoryText: {
    fontSize: theme.font.xs,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  name: {
    fontSize: theme.font.lg,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: theme.font.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
  },
  rewards: {
    gap: theme.spacing.xs,
  },
  rewardText: {
    fontSize: theme.font.sm,
    color: theme.colors.text,
    fontWeight: "600",
  },
  visitButton: {
    minHeight: 44,
    minWidth: 88,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  visitText: {
    color: theme.colors.darkText,
    fontWeight: "800",
    fontSize: theme.font.sm,
  },
});

