import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CityMap } from "../src/components/CityMap";
import { ProfileCard } from "../src/components/ProfileCard";
import { CategoryFilter } from "../src/components/CategoryFilter";
import { POIBottomSheet } from "../src/components/POIBottomSheet";
import { theme } from "../src/constants/theme";
import { categories, mockPois, type POI } from "../src/data/pois";
import { mockUser } from "../src/data/user";
import { useLocation } from "../src/hooks/useLocation";

type ActiveCategory = (typeof categories)[number];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [pois, setPois] = useState<POI[]>(mockPois);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [profileHeight, setProfileHeight] = useState(0);

  const { coords, permissionGranted } = useLocation();

  const filteredPois = useMemo(() => {
    if (activeCategory === "all") {
      return pois;
    }
    return pois.filter((poi) => poi.category === activeCategory);
  }, [activeCategory, pois]);

  const handleVisitPoi = (poiId: string) => {
    setPois((current) =>
      current.map((poi) => (poi.id === poiId ? { ...poi, completed: true } : poi))
    );
    setSelectedPoi(null);
  };

  return (
    <View style={styles.container}>
      <CityMap
        pois={filteredPois}
        onSelectPoi={setSelectedPoi}
        coords={coords}
        permissionGranted={permissionGranted}
      />

      <View
        style={[styles.profileLayer, { top: insets.top + 12 }]}
        onLayout={(event) => setProfileHeight(event.nativeEvent.layout.height)}
      >
        <ProfileCard
          name={mockUser.name}
          avatarInitials={mockUser.avatarInitials}
          levelTitle={mockUser.levelTitle}
          xp={mockUser.xp}
          xpToNextLevel={mockUser.xpToNextLevel}
          gems={mockUser.gems}
        />
      </View>

      <View
        style={[
          styles.filterLayer,
          { top: insets.top + 12 + profileHeight + theme.spacing.md },
        ]}
      >
        <CategoryFilter
          options={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </View>

      <POIBottomSheet
        visible={Boolean(selectedPoi)}
        poi={selectedPoi}
        tabBarHeight={tabBarHeight}
        onClose={() => setSelectedPoi(null)}
        onVisit={handleVisitPoi}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileLayer: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
  },
  filterLayer: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});

