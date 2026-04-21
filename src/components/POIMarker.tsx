import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import type { POI } from "../data/pois";
import { theme } from "../constants/theme";

type POIMarkerProps = {
  poi: POI;
  onPress: (poi: POI) => void;
};

export function POIMarker({ poi, onPress }: POIMarkerProps) {
  const categoryColor = theme.colors.categoryColors[poi.category];

  return (
    <Marker
      coordinate={{ latitude: poi.lat, longitude: poi.lng }}
      onPress={() => onPress(poi)}
      tracksViewChanges={false}
    >
      <View style={[styles.marker, { backgroundColor: categoryColor }, poi.completed && styles.done]}>
        <Text style={styles.label}>{poi.name.slice(0, 1).toUpperCase()}</Text>
        {poi.completed ? (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.markerBorder,
  },
  done: {
    opacity: 0.5,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.font.sm,
    fontWeight: "800",
  },
  checkBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 16,
    height: 16,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.darkText,
    lineHeight: 12,
  },
});

