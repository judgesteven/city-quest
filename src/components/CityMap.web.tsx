import { StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";
import type { POI } from "../data/pois";

type CityMapProps = {
  pois: POI[];
  onSelectPoi: (poi: POI) => void;
  coords: { latitude: number; longitude: number } | null;
  permissionGranted: boolean;
};

export function CityMap({ pois }: CityMapProps) {
  return (
    <View style={styles.mapFallback}>
      <Text style={styles.title}>Map rendering is native-only</Text>
      <Text style={styles.body}>
        Use iOS Simulator, Android Emulator, or Expo Go to interact with markers and live
        location.
      </Text>
      <Text style={styles.count}>{pois.length} locations loaded.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.font.lg,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: theme.font.md,
    lineHeight: 22,
    textAlign: "center",
  },
  count: {
    marginTop: theme.spacing.sm,
    color: theme.colors.accent,
    fontSize: theme.font.sm,
    fontWeight: "600",
  },
});

